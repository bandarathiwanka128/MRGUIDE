/**
 * API-key management — generation, storage (hashed), and validation middleware.
 *
 * WSO2 API Manager interview talking point:
 *   "API keys are SHA-256-hashed before storage — equivalent to WSO2's
 *    consumer-key/secret model.  Tier is stored on the key record so a
 *    single middleware call enforces both auth and throttling policy,
 *    mirroring WSO2's subscription + application tier design."
 *
 * Usage:
 *   POST /api/auth/api-key          → generate a key for the logged-in user
 *   Header: X-API-Key: mrg_free_... → authenticate programmatic clients
 */

'use strict';

const crypto     = require('crypto');
const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Lazy-define APIKey model (synced via sequelize.sync in server.js)
const APIKey = sequelize.define('APIKey', {
  user_id:    { type: DataTypes.INTEGER, allowNull: false },
  key_hash:   { type: DataTypes.STRING(64), unique: true, allowNull: false },
  key_prefix: { type: DataTypes.STRING(16) },  // first 8 chars for display
  tier:       { type: DataTypes.ENUM('free', 'pro', 'admin'), defaultValue: 'free' },
  label:      { type: DataTypes.STRING(100) },
  active:     { type: DataTypes.BOOLEAN, defaultValue: true },
  last_used:  { type: DataTypes.DATE }
}, {
  tableName:  'api_keys',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false
});

const TIER_LIMITS = { free: 100, pro: 1000, admin: 10000 };

// Generate a new API key — returns the raw key (shown once) and the DB record
async function generateAPIKey(userId, tier = 'free', label = '') {
  const raw    = `mrg_${tier}_${crypto.randomBytes(32).toString('hex')}`;
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12);

  const record = await APIKey.create({
    user_id:    userId,
    key_hash:   hash,
    key_prefix: prefix,
    tier,
    label
  });

  return { raw, record };  // raw is shown ONCE — never stored
}

// Express middleware: validates X-API-Key header and attaches tier to req
async function validateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'X-API-Key header required' });

  const hash   = crypto.createHash('sha256').update(apiKey).digest('hex');
  const record = await APIKey.findOne({ where: { key_hash: hash, active: true } }).catch(() => null);

  if (!record) return res.status(403).json({ error: 'Invalid or revoked API key' });

  // Update last_used asynchronously (don't block the request)
  record.update({ last_used: new Date() }).catch(() => {});

  req.apiKeyRecord = record;
  req.apiTier      = record.tier;
  req.apiRateLimit = TIER_LIMITS[record.tier] ?? 100;
  next();
}

module.exports = { APIKey, generateAPIKey, validateAPIKey, TIER_LIMITS };
