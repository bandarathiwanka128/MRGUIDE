const express = require('express');
const { Review, User, Place } = require('../../config/database');
const { Op } = require('sequelize');

const router = express.Router();

const reviewInclude = [
  { model: User, attributes: ['id', 'username', 'email'] },
  { model: Place, attributes: ['id', 'name'] },
];

// GET /api/admin/reviews
router.get('/', async (req, res) => {
  try {
    const { search, rating, page = 1, limit = 20 } = req.query;
    const where = {};
    if (rating) where.rating = parseInt(rating);
    if (search) where.comment = { [Op.iLike]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Review.findAndCountAll({
      where,
      include: reviewInclude,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), reviews: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/reviews/:id
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id, { include: reviewInclude });
    if (!review) return res.status(404).json({ error: 'Not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/reviews/:id
router.put('/:id', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    const { rating, comment } = req.body;
    await review.update({ rating, comment });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    await review.destroy();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
