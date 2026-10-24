const express = require('express');
const { Place, Review, AuthenticDetail, User } = require('../../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/admin/places
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (category) where.category = category;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Place.findAndCountAll({
      where,
      distinct: true,
      include: [{ model: Review, attributes: ['rating'], required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const places = rows.map(p => {
      const json = p.toJSON();
      const ratings = json.Reviews?.map(r => r.rating) || [];
      json.avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
      json.reviewCount = ratings.length;
      delete json.Reviews;
      return json;
    });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), places });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/places/:id
router.get('/:id', async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id, {
      include: [
        { model: Review, include: [{ model: User, attributes: ['username'] }] },
        { model: AuthenticDetail, include: [{ model: User, attributes: ['username'] }] }
      ]
    });
    if (!place) return res.status(404).json({ error: 'Not found' });
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/places
router.post('/', async (req, res) => {
  try {
    const { name, category, latitude, longitude, description, address, google_place_id, price_level } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const place = await Place.create({ name, category, latitude, longitude, description, address, google_place_id, price_level, created_by: req.user.id });
    res.status(201).json(place);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/places/:id
router.put('/:id', async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).json({ error: 'Not found' });

    const allowed = ['name', 'category', 'latitude', 'longitude', 'description', 'address', 'google_place_id', 'price_level', 'estimated_cost'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    await place.update(updates);
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/places/:id
router.delete('/:id', async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).json({ error: 'Not found' });
    await place.destroy();
    res.json({ message: 'Place deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
