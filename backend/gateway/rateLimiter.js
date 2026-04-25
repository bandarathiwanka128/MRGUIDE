/**
 * Tiered rate-limiting middleware.
 *
 * WSO2 API Manager interview talking point:
 *   "Mirrors WSO2 API Manager's subscription-based throttling tiers —
 *    admin: 1 000 rpm, guide: 500 rpm, tourist/public: 100 rpm.
 *    The limiter is injected per-route so sensitive endpoints (payments,
 *    AI) can carry a stricter policy without touching business logic."
 *
 * Drop-in Redis store: install `rate-limit-redis` + `ioredis` and set
 *   REDIS_URL in .env to share state across multiple server instances.
 */

'use strict';

const rateLimit = require('express-rate-limit');

// Resolve per-request quota based on authenticated role
function resolveMax(req) {
  const role = req.user?.role;
  if (role === 'admin')  return 1000;
  if (role === 'guide')  return 500;
  return 100; // tourists + unauthenticated
}

// Generic factory so each route group can have its own window/quota
function createLimiter({ windowMs = 15 * 60 * 1000, max, message } = {}) {
  return rateLimit({
    windowMs,
    max: max ?? resolveMax,
    standardHeaders: true,  // RateLimit-* headers (RFC 6585)
    legacyHeaders:   false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : req.ip,
    handler: (_req, res) => {
      res.status(429).json({
        error:      'Too many requests — rate limit exceeded.',
        retryAfter: Math.ceil(windowMs / 60000) + ' minutes',
        docs:       'https://docs.mrguide.lk/rate-limits'
      });
    },
    message: message ?? undefined
  });
}

// Pre-built limiters for different API tiers
const defaultLimiter = createLimiter();                               // 100 / 15 min
const aiLimiter      = createLimiter({ windowMs: 60 * 1000, max: 10 }); // 10 / min  (Gemini cost)
const authLimiter    = createLimiter({ windowMs: 15 * 60 * 1000, max: 20 }); // 20 / 15 min (brute-force)
const paymentLimiter = createLimiter({ windowMs: 60 * 1000, max: 5  }); // 5  / min  (Stripe)

module.exports = { createLimiter, defaultLimiter, aiLimiter, authLimiter, paymentLimiter };
