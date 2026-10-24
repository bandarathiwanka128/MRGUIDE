const express = require('express');
const router = express.Router();
const { sequelize } = require('../../config/database');
const { QueryTypes, Op } = require('sequelize');

// GET /api/admin/guides — all guides
router.get('/', async (req, res) => {
  try {
    const { search = '', verified, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const replacements = { limit: parseInt(limit), offset };

    if (verified === 'true') whereClause += ' AND g.is_verified = true';
    if (verified === 'false') whereClause += ' AND g.is_verified = false';
    if (search) { whereClause += ' AND (g.display_name ILIKE :search OR u.email ILIKE :search)'; replacements.search = `%${search}%`; }

    const guides = await sequelize.query(`
      SELECT g.*, u.username, u.email
      FROM guides g
      LEFT JOIN users u ON u.id = g.user_id
      WHERE 1=1 ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT :limit OFFSET :offset
    `, { type: QueryTypes.SELECT, replacements });

    const [{ count }] = await sequelize.query(`
      SELECT COUNT(*) FROM guides g LEFT JOIN users u ON u.id = g.user_id WHERE 1=1 ${whereClause}
    `, { type: QueryTypes.SELECT, replacements });

    res.json({ guides, total: parseInt(count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// PUT /api/admin/guides/:id/verify
router.put('/:id/verify', async (req, res) => {
  try {
    const { is_verified } = req.body;
    if (typeof is_verified !== 'boolean') return res.status(400).json({ error: 'is_verified must be a boolean' });
    const [guide] = await sequelize.query('SELECT id FROM guides WHERE id = :id', { type: QueryTypes.SELECT, replacements: { id: req.params.id } });
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    await sequelize.query(
      `UPDATE guides SET is_verified = :is_verified, updated_at = NOW() WHERE id = :id`,
      { type: QueryTypes.UPDATE, replacements: { is_verified, id: req.params.id } }
    );
    res.json({ ok: true, is_verified });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// GET /api/admin/guides/trips/all — all guide trips
router.get('/trips/all', async (req, res) => {
  try {
    const { page = 1, status, method } = req.query;
    const limit = 30;
    const offset = (parseInt(page) - 1) * limit;
    let where = 'WHERE 1=1';
    const replacements = { limit, offset };
    if (status) { where += ' AND gt.status = :status'; replacements.status = status; }
    if (method) { where += ' AND gt.payment_method = :method'; replacements.method = method; }

    const trips = await sequelize.query(`
      SELECT gt.*, g.display_name AS guide_name, u.username AS tourist_name
      FROM guide_trips gt
      LEFT JOIN guides g ON g.id = gt.guide_id
      LEFT JOIN users u ON u.id = gt.tourist_id
      ${where}
      ORDER BY gt.created_at DESC
      LIMIT :limit OFFSET :offset
    `, { type: QueryTypes.SELECT, replacements });

    const [{ count }] = await sequelize.query(
      `SELECT COUNT(*) FROM guide_trips gt ${where}`,
      { type: QueryTypes.SELECT, replacements }
    );

    res.json({ trips, total: parseInt(count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET /api/admin/guides/trips/live — active trips
router.get('/trips/live', async (req, res) => {
  try {
    const trips = await sequelize.query(`
      SELECT gt.*, g.display_name AS guide_name, u.username AS tourist_name,
             gl.lat AS guide_lat, gl.lng AS guide_lng
      FROM guide_trips gt
      LEFT JOIN guides g ON g.id = gt.guide_id
      LEFT JOIN guide_locations gl ON gl.guide_id = gt.guide_id
      LEFT JOIN users u ON u.id = gt.tourist_id
      WHERE gt.status = 'active'
      ORDER BY gt.started_at DESC
    `, { type: QueryTypes.SELECT });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live trips' });
  }
});

// GET /api/admin/guides/financials — platform financials
router.get('/financials', async (req, res) => {
  try {
    const [week] = await sequelize.query(`
      SELECT
        COALESCE(SUM(platform_commission),0) AS commission,
        COALESCE(SUM(tip_amount),0) AS tips,
        COUNT(*) AS trips,
        COALESCE(SUM(CASE WHEN payment_method='qr' THEN total_paid ELSE 0 END),0) AS qr_received
      FROM guide_trips
      WHERE status='completed' AND paid=true AND created_at >= NOW() - INTERVAL '7 days'
    `, { type: QueryTypes.SELECT });

    const [month] = await sequelize.query(`
      SELECT
        COALESCE(SUM(platform_commission),0) AS commission,
        COALESCE(SUM(tip_amount),0) AS tips,
        COUNT(*) AS trips
      FROM guide_trips
      WHERE status='completed' AND paid=true AND created_at >= NOW() - INTERVAL '30 days'
    `, { type: QueryTypes.SELECT });

    const [allTime] = await sequelize.query(`
      SELECT COALESCE(SUM(platform_commission),0) AS commission, COALESCE(SUM(tip_amount),0) AS tips, COUNT(*) AS trips
      FROM guide_trips WHERE status='completed' AND paid=true
    `, { type: QueryTypes.SELECT });

    const [{ cash_owed }] = await sequelize.query(
      `SELECT COALESCE(SUM(pending_cash_commission),0) AS cash_owed FROM guides`,
      { type: QueryTypes.SELECT }
    );

    const [{ payouts_sent }] = await sequelize.query(`
      SELECT COALESCE(SUM(net_payout),0) AS payouts_sent FROM guide_payouts
      WHERE status='paid' AND created_at >= NOW() - INTERVAL '7 days'
    `, { type: QueryTypes.SELECT });

    // 12-week trend
    const trend = await sequelize.query(`
      SELECT DATE_TRUNC('week', created_at) AS week_start,
             COALESCE(SUM(platform_commission),0) AS commission
      FROM guide_trips
      WHERE status='completed' AND paid=true AND created_at >= NOW() - INTERVAL '84 days'
      GROUP BY 1 ORDER BY 1
    `, { type: QueryTypes.SELECT });

    // Top 10 guides by earnings
    const topGuides = await sequelize.query(`
      SELECT g.display_name, COALESCE(SUM(gt.guide_earnings),0) AS total_earnings, COUNT(gt.id) AS trip_count
      FROM guide_trips gt LEFT JOIN guides g ON g.id = gt.guide_id
      WHERE gt.status='completed' AND gt.paid=true AND gt.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY g.display_name ORDER BY total_earnings DESC LIMIT 10
    `, { type: QueryTypes.SELECT });

    res.json({ week, month, all_time: allTime, cash_commission_owed: cash_owed,
      payouts_sent_week: payouts_sent, qr_received_week: week.qr_received,
      trend: trend.map(point => ({ ...point, week: new Date(point.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' }) })),
      top_guides: topGuides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch financials' });
  }
});

// GET /api/admin/guides/payouts/all — all payouts
router.get('/payouts/all', async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    const limit = 30;
    const offset = (parseInt(page) - 1) * limit;
    let where = 'WHERE 1=1';
    const replacements = { limit, offset };
    if (status) { where += ' AND gp.status = :status'; replacements.status = status; }

    const payouts = await sequelize.query(`
      SELECT gp.*, g.display_name AS guide_name, g.bank_name, g.bank_account_number, g.bank_branch
      FROM guide_payouts gp
      LEFT JOIN guides g ON g.id = gp.guide_id
      ${where}
      ORDER BY gp.created_at DESC
      LIMIT :limit OFFSET :offset
    `, { type: QueryTypes.SELECT, replacements });

    const [{ count }] = await sequelize.query(
      `SELECT COUNT(*) FROM guide_payouts gp ${where}`,
      { type: QueryTypes.SELECT, replacements }
    );

    res.json({ payouts, total: parseInt(count), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// PUT /api/admin/guides/payouts/:id/mark-paid
router.put('/payouts/:id/mark-paid', async (req, res) => {
  try {
    await sequelize.query(
      `UPDATE guide_payouts SET status='paid', paid_at=NOW(), bank_transfer_ref=:ref, updated_at=NOW() WHERE id=:id`,
      { type: QueryTypes.UPDATE, replacements: { id: req.params.id, ref: req.body.ref || 'MANUAL' } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark payout' });
  }
});

// POST /api/admin/guides/payouts/run — trigger payout job
router.post('/payouts/run', async (req, res) => {
  try {
    const { runPayoutJob } = require('../../utils/payoutJob');
    const result = await runPayoutJob();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payout job failed', details: err.message });
  }
});

// GET /api/admin/guides/commissions/owed
router.get('/commissions/owed', async (req, res) => {
  try {
    const guides = await sequelize.query(`
      SELECT g.id, g.display_name, g.pending_cash_commission, g.total_earnings_base, u.username, u.email
      FROM guides g LEFT JOIN users u ON u.id = g.user_id
      WHERE g.pending_cash_commission > 0
      ORDER BY g.pending_cash_commission DESC
    `, { type: QueryTypes.SELECT });
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// GET /api/admin/guides/:id
router.get('/:id', async (req, res) => {
  try {
    const [guide] = await sequelize.query(
      `SELECT g.*, u.username, u.email FROM guides g LEFT JOIN users u ON u.id = g.user_id WHERE g.id = :id`,
      { type: QueryTypes.SELECT, replacements: { id: req.params.id } }
    );
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guide' });
  }
});

module.exports = router;
