/**
 * Multi-provider LLM client — Groq → Gemini → OpenRouter.
 *
 * One call, three backends. Providers are tried in AI_PROVIDER_ORDER; inside a
 * provider each model in its list is tried once. A provider whose models all
 * fail is put on a short cooldown so later requests skip it instantly, and a
 * successful answer is cached for 5 minutes keyed on the full prompt.
 *
 * Defaults come from live probes against this project's keys (Oct 2026):
 *   Groq        ~2-3s for an 800-token plan, JSON mode works       → primary
 *   Gemini      flash-lite 3-6s; 3.8-flash needs thinking off, 15s+ → backup
 *   OpenRouter  free models 3-5s but rate-limited upstream          → last resort
 * Override any list with GROQ_MODELS / GEMINI_MODELS / OPENROUTER_MODELS
 * (comma-separated) when a model is retired.
 *
 * Usage:
 *   const ai = require('../utils/aiClient');
 *   const { text, provider, model } = await ai.generateText({ system, prompt, json: true });
 *   const data = ai.parseJson(text);
 */

'use strict';

const axios  = require('axios');
const crypto = require('crypto');

// First non-empty env var wins — the .env in this repo uses the older names.
const env  = (...names) => { for (const n of names) if (process.env[n]) return process.env[n].trim(); return ''; };
const list = (name, fallback) => process.env[name] ? process.env[name].split(',').map(s => s.trim()).filter(Boolean) : fallback;

const PROVIDERS = {
  groq: {
    label:     'Groq',
    key:       env('GROQ_API_KEY'),
    models:    list('GROQ_MODELS', ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']),
    timeoutMs: 30000,
    call:      callGroq
  },
  gemini: {
    label:     'Gemini',
    key:       env('GEMINI_API_KEY', 'GIMINI_API'),
    models:    list('GEMINI_MODELS', ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']),
    timeoutMs: 45000,
    call:      callGemini
  },
  openrouter: {
    label:     'OpenRouter',
    key:       env('OPENROUTER_API_KEY', 'OPEN_ROUTE_API'),
    models:    list('OPENROUTER_MODELS', ['nvidia/nemotron-3-ultra-550b-a55b:free', 'poolside/laguna-s-2.1:free', 'google/gemma-4-31b-it:free']),
    timeoutMs: 40000,
    call:      callOpenRouter
  }
};

const ORDER               = list('AI_PROVIDER_ORDER', ['groq', 'gemini', 'openrouter']).filter(p => PROVIDERS[p]);
const COOLDOWN_MS         = 60 * 1000;      // skip a provider for 60s after all its models fail
const CACHE_TTL_MS        = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES   = 200;
const DEFAULT_DEADLINE_MS = 90 * 1000;      // total budget across every provider/model attempt

const cooldownUntil = {};   // provider name → epoch ms
const cache         = new Map();

// ─── Provider transports ───────────────────────────────────────────────────
// Each returns the raw text (or undefined) and lets axios errors propagate.

async function callGroq({ model, system, prompt, json, temperature, maxTokens, timeoutMs }, key) {
  const body = { model, messages: chatMessages(system, prompt), temperature };
  if (maxTokens) body.max_completion_tokens = maxTokens;
  if (json)      body.response_format = { type: 'json_object' };
  if (/gpt-oss/.test(model)) body.reasoning_effort = 'low';   // same quality for travel copy, ~no reasoning tokens
  const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
    headers: { Authorization: `Bearer ${key}` },
    timeout: timeoutMs
  });
  return data.choices?.[0]?.message?.content;
}

async function callGemini({ model, system, prompt, json, temperature, maxTokens, timeoutMs }, key) {
  const generationConfig = { temperature };
  if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
  if (json)      generationConfig.responseMimeType = 'application/json';
  // Flash models "think" by default and take 15s+ on this key; lite models reject the option.
  if (!/lite/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    body,
    { headers: { 'x-goog-api-key': key }, timeout: timeoutMs }
  );
  return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
}

async function callOpenRouter({ model, system, prompt, temperature, maxTokens, timeoutMs }, key) {
  // No response_format here — most free models reject it; parseJson() copes with fenced output.
  const body = { model, messages: chatMessages(system, prompt), temperature };
  if (maxTokens) body.max_tokens = maxTokens;
  const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
    headers: {
      Authorization:  `Bearer ${key}`,
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title':      'Mr. Guide'
    },
    timeout: timeoutMs
  });
  return data.choices?.[0]?.message?.content;
}

function chatMessages(system, prompt) {
  return [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
}

// ─── Public API ────────────────────────────────────────────────────────────

function configuredProviders() {
  return ORDER.filter(name => PROVIDERS[name].key);
}

/**
 * Generate text, falling through providers and models until one answers.
 * @param {object} opts
 * @param {string}  opts.prompt
 * @param {string}  [opts.system]        system instruction
 * @param {boolean} [opts.json=false]    ask for a JSON object (use parseJson on the result)
 * @param {number}  [opts.temperature=0.7]
 * @param {number}  [opts.maxTokens]
 * @param {number}  [opts.deadlineMs]    total time budget across all attempts
 * @returns {Promise<{ text: string, provider: string, model: string, cached: boolean }>}
 */
async function generateText({ prompt, system = '', json = false, temperature = 0.7, maxTokens, deadlineMs = DEFAULT_DEADLINE_MS } = {}) {
  if (!prompt) throw new Error('prompt is required');

  const providers = configuredProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider configured — set GROQ_API_KEY, GEMINI_API_KEY or OPENROUTER_API_KEY');
  }

  const cacheKey = crypto.createHash('sha1').update(`${json ? 'json' : 'text'}|${system}|${prompt}`).digest('hex');
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    console.log('[AI] Cache hit');
    return { ...hit.value, cached: true };
  }

  const deadline = Date.now() + deadlineMs;
  const errors   = [];

  providers:
  for (const name of providers) {
    const p = PROVIDERS[name];
    if ((cooldownUntil[name] || 0) > Date.now()) {
      errors.push(`${name}: cooling down`);
      continue;
    }

    for (const model of p.models) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) {
        errors.push('deadline reached');
        break providers;
      }

      const started = Date.now();
      try {
        const raw  = await p.call({ model, system, prompt, json, temperature, maxTokens, timeoutMs: Math.min(p.timeoutMs, remaining) }, p.key);
        const text = (raw || '').trim();
        if (!text) throw new Error('empty response');   // e.g. reasoning-only models

        console.log(`[AI] ${p.label} ${model} answered in ${Date.now() - started}ms`);
        cooldownUntil[name] = 0;
        const value = { text, provider: name, model };
        setCache(cacheKey, value);
        return { ...value, cached: false };
      } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.error?.message || err.message;
        console.warn(`[AI] ${p.label} ${model} failed${status ? ` (${status})` : ''} after ${Date.now() - started}ms: ${String(detail).slice(0, 160)}`);
        errors.push(`${name}/${model}: ${status || err.code || 'error'}`);
        if (status === 401 || status === 403) break;   // bad key — other models won't help
      }
    }

    cooldownUntil[name] = Date.now() + COOLDOWN_MS;
    console.warn(`[AI] ${p.label} unavailable — skipping it for ${COOLDOWN_MS / 1000}s`);
  }

  const error = new Error(`All AI providers failed: ${errors.join('; ')}`);
  error.code = 'AI_UNAVAILABLE';
  throw error;
}

/** Pull a JSON value out of model output that may be fenced or wrapped in prose. */
function parseJson(text) {
  const cleaned = String(text).replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch (_) { /* fall through to extraction */ }
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error('No JSON found in AI response');
  const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Per-provider snapshot for health/monitoring endpoints. */
function getStatus() {
  return ORDER.map(name => ({
    provider:    name,
    configured:  Boolean(PROVIDERS[name].key),
    models:      PROVIDERS[name].models,
    coolingDown: (cooldownUntil[name] || 0) > Date.now()
  }));
}

function setCache(key, value) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    for (const [k, v] of cache) if (v.expiresAt <= Date.now()) cache.delete(k);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Startup summary ───────────────────────────────────────────────────────
{
  const configured = configuredProviders();
  if (configured.length) {
    console.log(`✅ AI providers: ${configured.map(n => `${PROVIDERS[n].label} (${PROVIDERS[n].models[0]})`).join(' → ')}`);
  } else {
    console.error('❌ No AI provider configured — AI endpoints will return demo data');
  }
}

module.exports = { generateText, parseJson, getStatus, configuredProviders };
