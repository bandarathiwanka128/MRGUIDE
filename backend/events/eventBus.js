/**
 * Event bus with RabbitMQ topic exchanges.
 * Falls back to an in-process EventEmitter when RABBITMQ_URL is not set,
 * so development works with zero extra infrastructure.
 *
 * WSO2 Streaming Integrator interview talking point:
 *   "Trip lifecycle events (booked, started, completed, paid) are published
 *    to topic exchanges — equivalent to WSO2 SI's event streams.  Multiple
 *    independent consumers (email, SMS, analytics) subscribe without
 *    coupling to the HTTP request path, exactly as WSO2's EDA patterns do."
 *
 * Exchanges:
 *   guide.events   — routing keys: trip.booked, trip.confirmed, trip.started,
 *                                   trip.completed, trip.reviewed
 *   payment.events — routing keys: payment.qr_confirmed, payment.cash_confirmed
 *
 * Quick start with Docker:
 *   docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management
 *   RABBITMQ_URL=amqp://localhost
 */

'use strict';

const EventEmitter = require('events');

class EventBus {
  constructor() {
    this._emitter  = new EventEmitter();
    this._channel  = null;
    this._conn     = null;
    this.connected = false;
  }

  async connect() {
    if (!process.env.RABBITMQ_URL) {
      console.log('[EventBus] No RABBITMQ_URL → in-process EventEmitter fallback');
      return;
    }
    try {
      const amqp = require('amqplib');
      this._conn    = await amqp.connect(process.env.RABBITMQ_URL);
      this._channel = await this._conn.createChannel();

      // Declare durable topic exchanges
      await this._channel.assertExchange('guide.events',   'topic', { durable: true });
      await this._channel.assertExchange('payment.events', 'topic', { durable: true });

      this.connected = true;
      console.log('[EventBus] Connected to RabbitMQ ✓');

      this._conn.on('error',  (err) => console.error('[EventBus] Connection error:', err.message));
      this._conn.on('close',  ()    => { this.connected = false; console.warn('[EventBus] Connection closed'); });
    } catch (err) {
      console.warn('[EventBus] RabbitMQ unavailable — falling back to in-process:', err.message);
    }
  }

  /**
   * Publish an event to an exchange.
   * @param {string} exchange   - 'guide.events' | 'payment.events'
   * @param {string} routingKey - e.g. 'trip.started'
   * @param {object} payload
   */
  async publish(exchange, routingKey, payload) {
    const message = JSON.stringify({ ...payload, _timestamp: new Date().toISOString() });

    if (this.connected && this._channel) {
      this._channel.publish(
        exchange,
        routingKey,
        Buffer.from(message),
        { persistent: true, contentType: 'application/json', timestamp: Date.now() }
      );
      console.log(`[EventBus] → ${exchange}:${routingKey}`);
    } else {
      // In-process fallback — same API, different transport
      this._emitter.emit(`${exchange}:${routingKey}`, payload);
    }
  }

  /**
   * Subscribe to events matching a routing-key pattern.
   * @param {string}   exchange   - exchange to bind to
   * @param {string}   pattern    - routing key pattern, e.g. 'trip.*'
   * @param {string}   queueName  - durable queue name
   * @param {function} handler    - async (payload) => void
   */
  async subscribe(exchange, pattern, queueName, handler) {
    if (this.connected && this._channel) {
      await this._channel.assertQueue(queueName, { durable: true });
      await this._channel.bindQueue(queueName, exchange, pattern);
      this._channel.prefetch(1);
      this._channel.consume(queueName, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload);
          this._channel.ack(msg);
        } catch (err) {
          console.error(`[EventBus] Handler error (${queueName}):`, err.message);
          this._channel.nack(msg, false, true); // requeue on failure
        }
      });
      console.log(`[EventBus] Subscribed ${queueName} ← ${exchange}:${pattern}`);
    } else {
      this._emitter.on(`${exchange}:${pattern}`, handler);
    }
  }

  async close() {
    if (this._conn) await this._conn.close().catch(() => {});
  }
}

// Singleton — imported once, shared across all routes
const eventBus = new EventBus();
module.exports = eventBus;
