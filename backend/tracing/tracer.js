/**
 * OpenTelemetry distributed tracing.
 * MUST be required as the very first line in server.js before any other imports.
 * Without a running collector, traces are printed to console (dev-friendly).
 *
 * Only activates when OTEL_ENABLED=true is set — this avoids crashes on
 * Node.js v22 where require-in-the-middle patches CJS internals that changed.
 *
 * WSO2 Choreo interview talking point:
 *   "Every HTTP request + DB query generates a trace that can be visualised
 *    in Jaeger/Zipkin — mirrors Choreo's built-in observability pipeline."
 *
 * To enable:
 *   OTEL_ENABLED=true node server.js
 * To send to Jaeger:
 *   docker run -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one
 *   OTEL_ENABLED=true OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14268/api/traces node server.js
 */

'use strict';

// Guard: skip entirely unless explicitly enabled (prevents Node.js v22 compat issues)
if (process.env.OTEL_ENABLED !== 'true') {
  console.log('[Tracing] Disabled — set OTEL_ENABLED=true to enable');
  module.exports = null;
  return;
}

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor
} = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation }     = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation }  = require('@opentelemetry/instrumentation-express');
const { Resource }                = require('@opentelemetry/resources');

// Use string literals — compatible with all @opentelemetry/semantic-conventions versions
const provider = new NodeTracerProvider({
  resource: new Resource({
    'service.name':            'mrguide-backend',
    'service.version':         '1.0.0',
    'deployment.environment':  process.env.NODE_ENV || 'development'
  })
});

// Use OTLP exporter when endpoint is configured (Jaeger, Tempo, etc.)
// otherwise fall back to console so dev mode works with zero infra
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const exporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    });
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    console.log(`[Tracing] OTLP exporter → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
  } catch {
    console.warn('[Tracing] OTLP exporter package missing — falling back to console');
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }
} else {
  // Dev: only log spans for non-health-check routes to reduce noise
  const filtered = {
    export(spans, cb) {
      const interesting = spans.filter(s => {
        const url = s.attributes['http.url'] || s.attributes['http.target'] || '';
        return !String(url).includes('/health') && !String(url).includes('/test');
      });
      if (interesting.length) new ConsoleSpanExporter().export(interesting, cb);
      else cb({ code: 0 });
    },
    shutdown: () => Promise.resolve()
  };
  provider.addSpanProcessor(new SimpleSpanProcessor(filtered));
  console.log('[Tracing] Console exporter active (set OTEL_EXPORTER_OTLP_ENDPOINT for Jaeger)');
}

provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation({
      requestHook(span, req) {
        span.setAttribute('http.request_id', req.headers['x-request-id'] || '');
      }
    }),
    new ExpressInstrumentation()
  ]
});

module.exports = provider;
