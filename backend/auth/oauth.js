/**
 * Google OAuth 2.0 / OIDC federation via Passport.js.
 *
 * WSO2 Identity Server interview talking point:
 *   "This demonstrates OAuth 2.0 Authorization Code flow with an external
 *    IdP (Google) — the same federation pattern WSO2 IS uses when connecting
 *    to enterprise identity providers.  After Google authenticates the user,
 *    we issue our own short-lived JWT, separating the IdP from our resource
 *    server — a core principle of WSO2's IAM architecture."
 *
 * Setup:
 *   1. Create credentials at console.cloud.google.com → APIs → OAuth 2.0
 *   2. Add redirect URI: http://localhost:3001/api/auth/google/callback
 *   3. Set in .env:
 *        GOOGLE_CLIENT_ID=...
 *        GOOGLE_CLIENT_SECRET=...
 *        BACKEND_URL=http://localhost:3001
 *        FRONTEND_URL=http://localhost:3000
 *
 * Flow:
 *   GET /api/auth/google            → redirects to Google consent screen
 *   GET /api/auth/google/callback   → Google redirects back; we issue JWT
 *   Frontend: /auth/success?token=… → stores token in localStorage
 */

'use strict';

const express  = require('express');
const passport = require('passport');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const router   = express.Router();

const OAUTH_ENABLED =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

if (OAUTH_ENABLED) {
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
  const { User } = require('../config/database');

  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`,
        scope:        ['profile', 'email']
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email    = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), null);

          // Find or provision user
          let user = await User.findOne({ where: { email } });
          if (!user) {
            const base     = profile.displayName.replace(/\s+/g, '_').toLowerCase();
            const username = `${base}_${profile.id.slice(0, 6)}`;
            const fakePwd  = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
            user = await User.create({ username, email, password: fakePwd, role: 'user' });
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Passport serialize/deserialize (session=false so we skip these in JWT mode,
  // but passport.initialize() still needs them declared)
  passport.serializeUser((user, done)   => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const { User } = require('../config/database');
    done(null, await User.findByPk(id).catch(() => null));
  });

  // GET /api/auth/google
  router.get('/google',
    passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
  );

  // GET /api/auth/google/callback
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session:         false,
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`
    }),
    (req, res) => {
      const token = jwt.sign(
        { id: req.user.id, username: req.user.username, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      // Redirect to frontend; React picks up the token from the query param
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`
      );
    }
  );

  console.log('[OAuth] Google OAuth 2.0 enabled ✓');
} else {
  console.warn('[OAuth] GOOGLE_CLIENT_ID/SECRET not set — Google OAuth disabled');

  router.get('/google', (_req, res) =>
    res.status(503).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' })
  );
  router.get('/google/callback', (_req, res) =>
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_not_configured`)
  );
}

module.exports = { router, passport, OAUTH_ENABLED };
