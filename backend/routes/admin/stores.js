const express = require('express');
const { Store, User } = require('../../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/admin/stores
router.get('/', async (req, res) => {
  try {
    const { search, business_type, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } },
    ];
    if (business_type) where.business_type = business_type;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Store.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'username', 'email'], required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), stores: rows.map(store => ({ ...store.toJSON(), Owner: store.User })) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stores/:id
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username', 'email'], required: false }],
    });
    if (!store) return res.status(404).json({ error: 'Not found' });
    res.json({ ...store.toJSON(), Owner: store.User });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/stores/:id
router.put('/:id', async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ error: 'Not found' });

    const allowed = ['name', 'business_type', 'address', 'phone', 'email', 'website', 'description', 'status', 'is_verified', 'rating'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    await store.update(updates);
    res.json({ ...store.toJSON(), Owner: store.User });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/stores/:id/verify
router.patch('/:id/verify', async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ error: 'Not found' });
    await store.update({ is_verified: !store.is_verified });
    res.json({ message: store.is_verified ? 'Verified' : 'Unverified', is_verified: store.is_verified });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/stores/:id
router.delete('/:id', async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ error: 'Not found' });
    await store.destroy();
    res.json({ message: 'Store deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
