/**
 * Circuit-breaker factory using Opossum.
 *
 * WSO2 / Ballerina interview talking point:
 *   "The circuit breaker pattern prevents cascading failures when the AI
 *    providers are degraded. After 50% of calls fail within a 10s window, the
 *    circuit opens and fast-fails for 60s — identical to Ballerina's built-in
 *    circuit-breaker construct and WSO2 Choreo's fault-tolerance policy."
 *
 * The breaker wraps the whole Groq → Gemini → OpenRouter chain in
 * utils/aiClient.js, so it only trips when every provider is failing.
 *
 * States:
 *   CLOSED   → requests flow normally
 *   OPEN     → requests fast-fail immediately (no network call made)
 *   HALF-OPEN→ one probe request is allowed; if it succeeds, circuit closes
 *
 * Usage:
 *   const { createAiBreaker } = require('../utils/circuitBreaker');
 *   const aiBreaker = createAiBreaker(ai.generateText);
 *   const { text } = await aiBreaker.fire({ prompt });   // throws when OPEN
 */

'use strict';

const CircuitBreaker = require('opossum');

const DEFAULT_OPTIONS = {
  timeout:                  100000, // 100s — just above aiClient's 90s all-provider deadline
  errorThresholdPercentage: 50,     // open after 50% failure rate
  resetTimeout:             60000,  // re-test after 60s in OPEN state
  rollingCountTimeout:      10000,  // measure failure rate over a 10s window
  rollingCountBuckets:      10,
  volumeThreshold:          3,      // need ≥ 3 calls before circuit can trip
  name:                     'ai-providers'
};

/**
 * Wraps an async function with a circuit breaker.
 * @param {Function} asyncFn   - the function to protect (e.g. ai.generateText)
 * @param {object}   [options] - override DEFAULT_OPTIONS
 */
function createAiBreaker(asyncFn, options = {}) {
  const breaker = new CircuitBreaker(asyncFn, { ...DEFAULT_OPTIONS, ...options });

  breaker.on('open',     () => console.warn ('[CircuitBreaker] 🔴 OPEN     — AI providers fast-failing'));
  breaker.on('halfOpen', () => console.info  ('[CircuitBreaker] 🟡 HALF-OPEN — Probing AI providers'));
  breaker.on('close',    () => console.info  ('[CircuitBreaker] 🟢 CLOSED   — AI providers recovered'));
  breaker.on('timeout',  () => console.warn  ('[CircuitBreaker] ⏱️  TIMEOUT  — AI call exceeded 100s'));
  breaker.on('reject',   () => console.warn  ('[CircuitBreaker] ⛔ REJECTED  — Circuit is OPEN'));

  return breaker;
}

module.exports = { createAiBreaker, createGeminiBreaker: createAiBreaker };
