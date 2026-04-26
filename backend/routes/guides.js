const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Guide, GuidePhoto, GuideLocation, GuideReview, User } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { fareBreakdown } = require('../utils/fareCalculator');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `guide_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/guides/live — all available verified guides with location
router.get('/live', async (req, res) => {
  try {
    const guides = await Guide.findAll({
      where: { is_available: true, is_verified: true },
      include: [
        { model: GuideLocation, as: 'location', required: true },
        { model: User, attributes: ['username'] }
      ],
      attributes: [
        'id', 'display_name', 'photo_url', 'avg_rating', 'total_reviews',
        'tier_1km', 'tier_5km', 'tier_10km', 'tier_20km', 'tier_per_km_over20',
        'languages', 'speciality_regions', 'currency'
      ]
    });
    res.json(guides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch live guides' });
  }
});

// GET /api/guides/all — all verified guides (for list/map, not necessarily live)
router.get('/all', async (req, res) => {
  try {
    const guides = await Guide.findAll({
      where: { is_verified: true },
      include: [
        { model: GuideLocation, as: 'location', required: false },
        { model: User, attributes: ['username'] }
      ],
      attributes: [
        'id', 'display_name', 'photo_url', 'avg_rating', 'total_reviews',
        'tier_1km', 'tier_5km', 'tier_10km', 'tier_20km', 'tier_per_km_over20',
        'languages', 'speciality_regions', 'currency', 'is_available'
      ]
    });
    res.json(guides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// GET /api/guides/fare-estimate — compute fare for a guide + distance
router.get('/fare-estimate', async (req, res) => {
  try {
    const { guideId, distanceKm } = req.query;
    if (!guideId || !distanceKm) return res.status(400).json({ error: 'guideId and distanceKm required' });
    const guide = await Guide.findByPk(guideId);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(fareBreakdown(distanceKm, guide));
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate fare' });
  }
});

// GET /api/guides/:id — full guide profile
router.get('/:id', async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['username', 'email'] },
        { model: GuidePhoto, as: 'photos', order: [['sort_order', 'ASC']] },
        { model: GuideLocation, as: 'location' },
        {
          model: GuideReview, as: 'guide_reviews',
          include: [{ model: User, as: 'reviewer', attributes: ['username', 'id'] }],
          order: [['created_at', 'DESC']],
          limit: 20
        }
      ]
    });
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(guide);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guide' });
  }
});

// POST /api/guides/register — register as guide (auth required)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const existing = await Guide.findOne({ where: { user_id: req.user.id } });
    if (existing) return res.status(400).json({ error: 'You are already registered as a guide' });

    const {
      display_name, bio, about_tours, languages, speciality_regions,
      tier_1km, tier_5km, tier_10km, tier_20km, tier_per_km_over20,
      phone, whatsapp, payment_ref,
      bank_name, bank_account_number, bank_branch,
      nic_number, card_last4, card_expiry
    } = req.body;

    if (!display_name || !tier_1km || !tier_5km || !tier_10km || !tier_20km || !tier_per_km_over20) {
      return res.status(400).json({ error: 'display_name and all pricing tiers are required' });
    }

    const guide = await Guide.create({
      user_id: req.user.id,
      display_name, bio, about_tours,
      languages: languages || [],
      speciality_regions: speciality_regions || [],
      tier_1km, tier_5km, tier_10km, tier_20km, tier_per_km_over20,
      phone, whatsapp, payment_ref,
      bank_name, bank_account_number, bank_branch,
      nic_number, card_last4, card_expiry,
      is_verified: false,
      is_available: false
    });
    res.status(201).json({ message: 'Guide registered — awaiting admin approval', guide });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// PUT /api/guides/:id — update profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    if (guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const allowed = [
      'display_name', 'bio', 'about_tours', 'languages', 'speciality_regions',
      'tier_1km', 'tier_5km', 'tier_10km', 'tier_20km', 'tier_per_km_over20',
      'phone', 'whatsapp', 'payment_ref', 'bank_name', 'bank_account_number', 'bank_branch'
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    await guide.update(updates);
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// PUT /api/guides/:id/availability — toggle live status
router.put('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    if (guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (!guide.is_verified) return res.status(400).json({ error: 'Guide not yet verified by admin' });

    const { is_available, lat, lng, accuracy } = req.body;
    await guide.update({ is_available });

    const io = req.app.get('io');
    if (is_available && lat && lng) {
      await GuideLocation.upsert({ guide_id: guide.id, lat, lng, accuracy: accuracy || null });
      if (io) io.to('admin:live').emit('guide:went_live', { guide_id: guide.id, lat, lng });
    } else {
      if (io) io.to('admin:live').emit('guide:went_offline', { guide_id: guide.id });
    }

    res.json({ is_available: guide.is_available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// PUT /api/guides/:id/location — update GPS location
router.put('/:id/location', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    if (guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { lat, lng, accuracy, trip_id } = req.body;
    await GuideLocation.upsert({ guide_id: guide.id, lat, lng, accuracy: accuracy || null });

    const io = req.app.get('io');
    if (io) {
      if (trip_id) io.to(`trip:${trip_id}`).emit('trip:guide_location', { trip_id, lat, lng });
      io.to('admin:live').emit('guide:location_update', { guide_id: guide.id, lat, lng });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// POST /api/guides/:id/photos — upload gallery photo
router.post('/:id/photos', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide || guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const count = await GuidePhoto.count({ where: { guide_id: guide.id } });
    if (count >= 10) return res.status(400).json({ error: 'Maximum 10 photos allowed' });

    const photo = await GuidePhoto.create({
      guide_id: guide.id,
      url: `/uploads/${req.file.filename}`,
      caption: req.body.caption || '',
      sort_order: count
    });
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/guides/:id/photos/:pid
router.delete('/:id/photos/:pid', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide || guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await GuidePhoto.destroy({ where: { id: req.params.pid, guide_id: guide.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /api/guides/:id/earnings — guide earnings dashboard
router.get('/:id/earnings', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide || guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { GuideTrip, GuidePayout } = require('../config/database');
    const { Op } = require('sequelize');
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [weekTrips, monthTrips, allTrips, payouts] = await Promise.all([
      GuideTrip.findAll({ where: { guide_id: guide.id, status: 'completed', created_at: { [Op.gte]: weekAgo } } }),
      GuideTrip.findAll({ where: { guide_id: guide.id, status: 'completed', created_at: { [Op.gte]: monthAgo } } }),
      GuideTrip.findAll({ where: { guide_id: guide.id, status: 'completed' } }),
      GuidePayout.findAll({ where: { guide_id: guide.id }, order: [['created_at', 'DESC']], limit: 10 })
    ]);

    const sum = (trips, field) => trips.reduce((a, t) => a + parseFloat(t[field] || 0), 0);

    res.json({
      week: { base: sum(weekTrips, 'base_fare'), tips: sum(weekTrips, 'tip_amount'), trips: weekTrips.length },
      month: { base: sum(monthTrips, 'base_fare'), tips: sum(monthTrips, 'tip_amount'), trips: monthTrips.length },
      all_time: { base: sum(allTrips, 'base_fare'), tips: sum(allTrips, 'tip_amount'), trips: allTrips.length },
      pending_cash_commission: parseFloat(guide.pending_cash_commission || 0),
      payouts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// GET /api/guides/:id/trips — guide trip history
router.get('/:id/trips', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.id);
    if (!guide || guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { GuideTrip } = require('../config/database');
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const trips = await GuideTrip.findAndCountAll({
      where: { guide_id: guide.id },
      include: [{ model: User, as: 'tourist', attributes: ['username', 'id'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
    res.json({ trips: trips.rows, total: trips.count, page });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET /api/guides/me/profile — get my guide profile
router.get('/me/profile', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findOne({
      where: { user_id: req.user.id },
      include: [{ model: GuidePhoto, as: 'photos' }, { model: GuideLocation, as: 'location' }]
    });
    if (!guide) return res.status(404).json({ error: 'No guide profile found' });
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
