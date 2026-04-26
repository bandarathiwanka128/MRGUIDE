const express = require('express');
const router = express.Router();
const { Guide, GuideTrip, GuidePayout, GuideLocation, User, sequelize } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { Op } = require('sequelize');

// Simple admin check middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// GET /api/admin-guides/ — all guides
router.get('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { search, verified, page = 1, limit = 20 } = req.query;
    const where = {};
    if (verified === 'true') where.is_verified = true;
    if (verified === 'false') where.is_verified = false;

    const guides = await Guide.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['username', 'email'] },
        { model: GuideLocation, as: 'location', required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    res.json({ guides: guides.rows, total: guides.count, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// GET /api/admin-guides/:id — single guide with earnings
router.get('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['username', 'email'] }]
    });
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guide' });
  }
});

// PUT /api/admin-guides/:id/verify — approve/reject guide
router.put('/:id/verify', authenticateToken, adminOnly, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    const { is_verified } = req.body;
    await guide.update({ is_verified });
    res.json({ ok: true, is_verified: guide.is_verified });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /api/admin-guides/trips/all — all guide trips with financial breakdown
router.get('/trips/all', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 30, status, method } = req.query;
    const where = {};
    if (status) where.status = status;
    if (method) where.payment_method = method;

    const trips = await GuideTrip.findAndCountAll({
      where,
      include: [
        { model: Guide, attributes: ['display_name', 'id'] },
        { model: User, as: 'tourist', attributes: ['username', 'id'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    res.json({ trips: trips.rows, total: trips.count, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET /api/admin-guides/trips/live — active trips
router.get('/trips/live', authenticateToken, adminOnly, async (req, res) => {
  try {
    const trips = await GuideTrip.findAll({
      where: { status: 'active' },
      include: [
        { model: Guide, include: [{ model: GuideLocation, as: 'location' }, { model: User, attributes: ['username'] }] },
        { model: User, as: 'tourist', attributes: ['username', 'id'] }
      ]
    });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live trips' });
  }
});

// GET /api/admin-guides/financials — platform revenue summary
router.get('/financials', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [weekData, monthData, allData, payoutsWeek, pendingCommissions] = await Promise.all([
      GuideTrip.findAll({ where: { status: 'completed', paid: true, created_at: { [Op.gte]: weekAgo } } }),
      GuideTrip.findAll({ where: { status: 'completed', paid: true, created_at: { [Op.gte]: monthAgo } } }),
      GuideTrip.findAll({ where: { status: 'completed', paid: true } }),
      GuidePayout.findAll({ where: { created_at: { [Op.gte]: weekAgo } } }),
      Guide.sum('pending_cash_commission')
    ]);

    const sum = (trips, field) => trips.reduce((a, t) => a + parseFloat(t[field] || 0), 0);

    // 12-week trend
    const trend = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      const trips = await GuideTrip.findAll({ where: { status: 'completed', paid: true, created_at: { [Op.between]: [start, end] } } });
      trend.push({ week: `W${12 - i}`, commission: parseFloat(sum(trips, 'platform_commission').toFixed(2)) });
    }

    res.json({
      week: { commission: sum(weekData, 'platform_commission'), tips: sum(weekData, 'tip_amount'), trips: weekData.length },
      month: { commission: sum(monthData, 'platform_commission'), tips: sum(monthData, 'tip_amount'), trips: monthData.length },
      all_time: { commission: sum(allData, 'platform_commission'), tips: sum(allData, 'tip_amount'), trips: allData.length },
      qr_received_week: sum(weekData.filter(t => t.payment_method === 'qr'), 'total_paid'),
      payouts_sent_week: payoutsWeek.filter(p => p.status === 'paid').reduce((a, p) => a + parseFloat(p.net_payout || 0), 0),
      cash_commission_owed: parseFloat(pendingCommissions || 0),
      trend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch financials' });
  }
});

// GET /api/admin-guides/payouts/all — all payouts
router.get('/payouts/all', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    const where = {};
    if (status) where.status = status;
    const payouts = await GuidePayout.findAndCountAll({
      where,
      include: [{ model: Guide, attributes: ['display_name', 'bank_account_number', 'bank_name', 'bank_branch'] }],
      order: [['created_at', 'DESC']],
      limit: 30,
      offset: (parseInt(page) - 1) * 30
    });
    res.json({ payouts: payouts.rows, total: payouts.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// POST /api/admin-guides/payouts/run — trigger payout job manually
router.post('/payouts/run', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { runPayoutJob } = require('../utils/payoutJob');
    const result = await runPayoutJob();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payout job failed', details: err.message });
  }
});

// PUT /api/admin-guides/payouts/:id/mark-paid — manually mark payout as sent
router.put('/payouts/:id/mark-paid', authenticateToken, adminOnly, async (req, res) => {
  try {
    const payout = await GuidePayout.findByPk(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    await payout.update({ status: 'paid', paid_at: new Date(), bank_transfer_ref: req.body.ref || 'MANUAL' });
    res.json(payout);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark payout' });
  }
});

// GET /api/admin-guides/commissions/owed — cash commission outstanding
router.get('/commissions/owed', authenticateToken, adminOnly, async (req, res) => {
  try {
    const guides = await Guide.findAll({
      where: { pending_cash_commission: { [Op.gt]: 0 } },
      include: [{ model: User, attributes: ['username', 'email'] }],
      order: [['pending_cash_commission', 'DESC']]
    });
    res.json(guides.map(g => ({
      id: g.id,
      display_name: g.display_name,
      username: g.User?.username,
      pending_cash_commission: parseFloat(g.pending_cash_commission),
      total_earnings_base: parseFloat(g.total_earnings_base)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

module.exports = router;
