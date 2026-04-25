/**
 * OpenTelemetry distributed tracing.
 * MUST be required as the very first line in server.js before any other imports.
 * Without a running collector, traces are printed to console (dev-friendly).
 *
 * WSO2 Choreo interview talking point:
 *   "Every HTTP request + DB query generates a trace that can be visualised
 *    in Jaeger/Zipkin — mirrors Choreo's built-in observability pipeline."
 *
 * To send to Jaeger:
 *   docker run -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one
 *   Set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14268/api/traces
 */

'use strict';

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
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]:    'mrguide-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env.NODE_ENV || 'development'
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
