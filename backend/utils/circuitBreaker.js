/**
 * Circuit-breaker factory using Opossum.
 *
 * WSO2 / Ballerina interview talking point:
 *   "The circuit breaker pattern prevents cascading failures when Gemini AI
 *    is degraded. After 50% of calls fail within a 10s window, the circuit
 *    opens and fast-fails for 60s — identical to Ballerina's built-in
 *    circuit-breaker construct and WSO2 Choreo's fault-tolerance policy."
 *
 * States:
 *   CLOSED   → requests flow normally
 *   OPEN     → requests fast-fail immediately (no network call made)
 *   HALF-OPEN→ one probe request is allowed; if it succeeds, circuit closes
 *
 * Usage:
 *   const { createGeminiBreaker } = require('../utils/circuitBreaker');
 *   const geminiBreaker = createGeminiBreaker(callGemini);
 *   const result = await geminiBreaker.fire(prompt);   // throws when OPEN
 */

'use strict';

const CircuitBreaker = require('opossum');

const DEFAULT_OPTIONS = {
  timeout:                  35000,  // 35s — covers 3 Gemini models × retry backoff
  errorThresholdPercentage: 50,     // open after 50% failure rate
  resetTimeout:             60000,  // re-test after 60s in OPEN state
  rollingCountTimeout:      10000,  // measure failure rate over a 10s window
  rollingCountBuckets:      10,
  volumeThreshold:          3,      // need ≥ 3 calls before circuit can trip
  name:                     'gemini-api'
};

/**
 * Wraps an async function with a circuit breaker.
 * @param {Function} asyncFn   - the function to protect (e.g. callGemini)
 * @param {object}   [options] - override DEFAULT_OPTIONS
 */
function createGeminiBreaker(asyncFn, options = {}) {
  const breaker = new CircuitBreaker(asyncFn, { ...DEFAULT_OPTIONS, ...options });

  breaker.on('open',     () => console.warn ('[CircuitBreaker] 🔴 OPEN     — Gemini fast-failing'));
  breaker.on('halfOpen', () => console.info  ('[CircuitBreaker] 🟡 HALF-OPEN — Probing Gemini'));
  breaker.on('close',    () => console.info  ('[CircuitBreaker] 🟢 CLOSED   — Gemini recovered'));
  breaker.on('timeout',  () => console.warn  ('[CircuitBreaker] ⏱️  TIMEOUT  — Gemini exceeded 35s'));
  breaker.on('reject',   () => console.warn  ('[CircuitBreaker] ⛔ REJECTED  — Circuit is OPEN'));

  // Expose Prometheus-style stats at /api/ai/breaker-stats
  breaker.stats = () => ({
    state:              breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    failures:           breaker.stats.failures,
    successes:          breaker.stats.successes,
    totalRequests:      breaker.stats.fires,
    percentiles:        breaker.stats.latencyMean,
    lastFailureTime:    breaker.stats.lastFailureTime
  });

  return breaker;
}

module.exports = { createGeminiBreaker };
