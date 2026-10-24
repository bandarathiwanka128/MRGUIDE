const express = require('express');
const { Trip, User } = require('../../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/admin/trips
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Trip.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'username', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), trips: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/trips/:id
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username', 'email'] }],
    });
    if (!trip) return res.status(404).json({ error: 'Not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/trips/:id
router.delete('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Not found' });
    await trip.destroy();
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
