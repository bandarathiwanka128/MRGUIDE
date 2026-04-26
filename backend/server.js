// ─── OpenTelemetry MUST be first — instruments HTTP + Express before they load ──
try { require('./tracing/tracer'); } catch (e) {
  console.warn('[Tracing] OpenTelemetry packages not yet installed:', e.message);
}

'use strict';

const express      = require('express');
const http         = require('http');
const cors         = require('cors');
const path         = require('path');
const helmet       = require('helmet');
const { Server }   = require('socket.io');
require('dotenv').config();

console.log('=== Environment Check ===');
console.log('NODE_ENV:          ', process.env.NODE_ENV         ? 'SET' : 'NOT SET');
console.log('PORT:              ', process.env.PORT             ? 'SET' : 'NOT SET');
console.log('DATABASE_URL:      ', process.env.DATABASE_URL     ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:        ', process.env.JWT_SECRET       ? 'SET' : 'NOT SET');
console.log('STRIPE_SECRET_KEY: ', process.env.STRIPE_SECRET_KEY? 'SET' : 'NOT SET');
console.log('GEMINI_API_KEY:    ', process.env.GEMINI_API_KEY   ? 'SET' : 'NOT SET');
console.log('RABBITMQ_URL:      ', process.env.RABBITMQ_URL     ? 'SET' : 'NOT SET (in-process fallback)');
console.log('GOOGLE_CLIENT_ID:  ', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET (OAuth disabled)');
console.log('========================');

let sequelize, authRoutes, placesRoutes, storesRoutes, aiRoutes, tripsRoutes,
    weatherRoutes, seedRoutes, guidesRoutes, guideTripsRoutes, payoutsRoutes,
    adminGuidesRoutes, defaultLimiter, aiLimiter, authLimiter, paymentLimiter,
    oauthRouter, passport, eventBus, createGraphQLMiddleware, generateAPIKey;

try {
  ({ sequelize }         = require('./config/database'));
  authRoutes              = require('./routes/auth');
  placesRoutes            = require('./routes/places');
  storesRoutes            = require('./routes/stores');
  aiRoutes                = require('./routes/ai');
  tripsRoutes             = require('./routes/trips');
  weatherRoutes           = require('./routes/weather');
  seedRoutes              = require('./routes/seed');
  guidesRoutes            = require('./routes/guides');
  guideTripsRoutes        = require('./routes/guide-trips');
  payoutsRoutes           = require('./routes/payouts');
  adminGuidesRoutes       = require('./routes/admin-guides');
  ({ defaultLimiter, aiLimiter, authLimiter, paymentLimiter } = require('./gateway/rateLimiter'));
  ({ router: oauthRouter, passport }   = require('./auth/oauth'));
  eventBus                = require('./events/eventBus');
  ({ createGraphQLMiddleware }         = require('./graphql/schema'));
  ({ generateAPIKey }                  = require('./gateway/apiKey'));
} catch (bootErr) {
  console.error('\n❌ STARTUP FAILED — module load error:');
  console.error('   ', bootErr.message);
  console.error('   Stack:', bootErr.stack);
  process.exit(1);
}

const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 3001;

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin:  process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('guide:join',    ({ guide_id })   => socket.join(`guide:${guide_id}`));
  socket.on('tourist:join',  ({ tourist_id }) => socket.join(`tourist:${tourist_id}`));
  socket.on('trip:join',     ({ trip_id })    => socket.join(`trip:${trip_id}`));
  socket.on('admin:join_live', ()             => socket.join('admin:live'));

  socket.on('guide:location_update', async ({ guide_id, lat, lng, accuracy, trip_id }) => {
    try {
      const { GuideLocation } = require('./config/database');
      await GuideLocation.upsert({ guide_id, lat, lng, accuracy: accuracy || null });
      if (trip_id) socket.to(`trip:${trip_id}`).emit('trip:guide_location', { trip_id, lat, lng });
      socket.to('admin:live').emit('guide:location_update', { guide_id, lat, lng });
    } catch (e) {
      console.error('Location update error:', e.message);
    }
  });

  socket.on('disconnect', () => {});
});

// ─── Security headers (Helmet + CSP) ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://maps.googleapis.com', 'https://js.stripe.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc:  ["'self'", 'https://api.stripe.com', 'https://generativelanguage.googleapis.com',
                    'wss:', 'ws:', process.env.CORS_ORIGIN || 'http://localhost:3000'],
      frameSrc:    ["'self'", 'https://js.stripe.com'],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false  // required for Google Maps iframes
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:       process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials:  true,
  methods:      ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Passport (OAuth) ─────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── Routes — with per-group rate limiters ─────────────────────────────────────
app.use('/api/auth',         authLimiter,    authRoutes);
app.use('/api/auth',                         oauthRouter);   // Google OAuth endpoints
app.use('/api/places',       defaultLimiter, placesRoutes);
app.use('/api/stores',       defaultLimiter, storesRoutes);
app.use('/api/ai',           aiLimiter,      aiRoutes);
app.use('/api/trips',        defaultLimiter, tripsRoutes);
app.use('/api/weather',      defaultLimiter, weatherRoutes);
app.use('/api/seed',                         seedRoutes);
app.use('/api/guides',       defaultLimiter, guidesRoutes);
app.use('/api/guide-trips',  paymentLimiter, guideTripsRoutes);
app.use('/api/payouts',      defaultLimiter, payoutsRoutes);
app.use('/api/admin-guides', defaultLimiter, adminGuidesRoutes);

// Generate API key (authenticated users)
app.post('/api/auth/api-key', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
  try {
    const jwt  = require('jsonwebtoken');
    const user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    const tier = user.role === 'admin' ? 'admin' : user.role === 'guide' ? 'pro' : 'free';
    const { raw, record } = await generateAPIKey(user.id, tier, req.body.label || '');
    res.json({ api_key: raw, tier: record.tier, prefix: record.key_prefix, note: 'Store this key — it will not be shown again.' });
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});

// Health-check + circuit-breaker stats
app.get('/api/test', (_req, res) =>
  res.json({ message: 'Backend is working!', websocket: 'Socket.io enabled', graphql: '/graphql' })
);

// ─── Weekly payout cron (Monday 06:00 AM) ─────────────────────────────────────
const cron = require('node-cron');
cron.schedule('0 6 * * 1', async () => {
  console.log('[CRON] Running weekly payout job...');
  try {
    const { runPayoutJob } = require('./utils/payoutJob');
    const result = await runPayoutJob();
    console.log(`[CRON] Payout done: ${result.processed} guides processed`);
    // Publish summary event for any downstream consumers (email, Slack, etc.)
    await eventBus.publish('payment.events', 'payout.weekly_complete', {
      processed: result.processed,
      payouts:   result.payouts
    });
  } catch (err) {
    console.error('[CRON] Payout error:', err.message);
  }
});

// ─── Register in-process event consumers (fallback / dev mode) ────────────────
async function registerEventConsumers() {
  await eventBus.subscribe('guide.events', 'trip.booked', 'email-trip-booked', async (data) => {
    console.log(`[EventConsumer] Trip booked  — guide:${data.guide_id} tourist:${data.tourist_id}`);
    // TODO: send booking confirmation email
  });

  await eventBus.subscribe('guide.events', 'trip.started', 'email-trip-started', async (data) => {
    console.log(`[EventConsumer] Trip started — trip:${data.trip_id}`);
    // TODO: send "Your guide is on the way" SMS/push
  });

  await eventBus.subscribe('guide.events', 'trip.completed', 'analytics-trip-done', async (data) => {
    console.log(`[EventConsumer] Trip completed — trip:${data.trip_id} fare:${data.base_fare}`);
    // TODO: update analytics dashboard
  });

  await eventBus.subscribe('payment.events', 'payment.qr_confirmed', 'finance-qr', async (data) => {
    console.log(`[EventConsumer] QR payment confirmed — trip:${data.trip_id} amount:${data.total_paid}`);
    // TODO: trigger receipt email
  });
}

// ─── Async startup ─────────────────────────────────────────────────────────────
async function startServer() {
  // 1. Connect event bus (RabbitMQ or in-process fallback)
  await eventBus.connect();
  await registerEventConsumers();

  // 2. Build GraphQL middleware (requires async server.start())
  try {
    const graphqlMiddleware = await createGraphQLMiddleware();
    app.use('/graphql', cors(), express.json(), graphqlMiddleware);
  } catch (e) {
    console.warn('[GraphQL] Failed to start Apollo Server:', e.message);
  }

  // 3. Connect DB, run migrations
  try {
    await sequelize.query(
      `UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL`,
      { type: sequelize.QueryTypes.UPDATE }
    ).catch(() => {});
  } catch {}

  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  // 4. Start HTTP server
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log('   Database  : connected and synced');
    console.log('   Socket.io : enabled');
    console.log('   GraphQL   : http://localhost:' + PORT + '/graphql');
    console.log('   Rate limit: 100 rpm (tourist) / 500 rpm (guide) / 1000 rpm (admin)');
    console.log('   Tracing   : ' + (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'console exporter') + '\n');
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
