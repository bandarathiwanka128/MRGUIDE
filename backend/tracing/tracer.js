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

// Guard: only activate when BOTH enabled AND an OTLP endpoint is configured.
// require-in-the-middle (OTel's module hook) breaks subpath package exports
// (e.g. @apollo/server/express4) on Node.js v22 — so never patch unless
// traces actually have somewhere to go.
const otelReady =
  process.env.OTEL_ENABLED === 'true' &&
  Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

if (!otelReady) {
  console.log('[Tracing] Disabled — set OTEL_ENABLED=true + OTEL_EXPORTER_OTLP_ENDPOINT to enable');
  module.exports = null;
  return;
}

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
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

// OTLP exporter — endpoint is guaranteed set by the guard above
try {
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const exporter = new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  console.log(`[Tracing] OTLP exporter → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
} catch {
  console.warn('[Tracing] OTLP exporter package missing — tracing disabled');
  module.exports = null;
  return;
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
