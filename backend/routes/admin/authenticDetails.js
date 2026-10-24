const express = require('express');
const { AuthenticDetail, User, Place, AuthenticProfile } = require('../../config/database');
const { Op } = require('sequelize');

const router = express.Router();

const detailInclude = [
  { model: User, attributes: ['id', 'username', 'email'] },
  { model: Place, attributes: ['id', 'name', 'latitude', 'longitude', 'category'], required: false }
];

// GET /api/admin/authentic-details — all with filters
router.get('/', async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const where = {};

    // status: pending | approved | rejected
    if (status === 'pending') { where.verified = false; where.is_active = true; }
    else if (status === 'approved') { where.verified = true; where.is_active = true; }
    else if (status === 'rejected') { where.is_active = false; }

    if (type) where.detail_type = type; // 'user' | 'business'
    if (search) where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { business_name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AuthenticDetail.findAndCountAll({
      where,
      include: detailInclude,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), details: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/authentic-details/:id
router.get('/:id', async (req, res) => {
  try {
    const detail = await AuthenticDetail.findByPk(req.params.id, { include: detailInclude });
    if (!detail) return res.status(404).json({ error: 'Not found' });
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/authentic-details/:id/approve
router.patch('/:id/approve', async (req, res) => {
  try {
    const { admin_notes } = req.body;
    const detail = await AuthenticDetail.findByPk(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Not found' });
    await detail.update({ verified: true, is_active: true, admin_notes: admin_notes || null });
    res.json({ message: 'Approved — now visible on map', detail });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/authentic-details/:id/reject
router.patch('/:id/reject', async (req, res) => {
  try {
    const { admin_notes } = req.body;
    const detail = await AuthenticDetail.findByPk(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Not found' });
    await detail.update({ verified: false, is_active: false, admin_notes: admin_notes || null });
    res.json({ message: 'Rejected', detail });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/authentic-details/:id — edit
router.put('/:id', async (req, res) => {
  try {
    const detail = await AuthenticDetail.findByPk(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Not found' });

    const allowed = ['title', 'business_name', 'organization', 'job_title', 'expertise',
      'description', 'phone', 'email', 'website', 'packages', 'admin_notes', 'verified', 'is_active'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await detail.update(updates);
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/authentic-details/:id — hard delete
router.delete('/:id', async (req, res) => {
  try {
    const detail = await AuthenticDetail.findByPk(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Not found' });
    await detail.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/authentic-details/profiles/list — authentic profiles (users with profile)
router.get('/profiles/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const where = { role: 'authentic_user' };
    if (search) where[Op.or] = [
      { username: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: AuthenticProfile, required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), profiles: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
