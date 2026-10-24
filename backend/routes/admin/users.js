const express = require('express');
const bcrypt = require('bcryptjs');
const { User, AuthenticProfile, Review, Trip } = require('../../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/admin/users â€” list all users
router.get('/', async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { username: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
    if (role) where.role = role;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: AuthenticProfile, required: false }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ total: count, page: parseInt(page), pages: Math.ceil(count / limit), users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: AuthenticProfile, required: false },
        { model: Review, required: false, limit: 5, order: [['created_at', 'DESC']] },
        { model: Trip, required: false, limit: 5, attributes: ['id', 'title', 'status', 'created_at'] },
      ],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users â€” create user
router.post('/', async (req, res) => {
  try {
    const { username, email, password, role = 'user', mobile_number, country, country_code } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, password required' });

    if (!['user', 'authentic_user', 'guide', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password: hashed, role, mobile_number, country, country_code, status: 'active' });
    const userOut = user.toJSON();
    delete userOut.password;
    res.status(201).json(userOut);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'Email or username already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id â€” edit user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { username, email, role, status, mobile_number, country, password } = req.body;
    if (role && !['user', 'authentic_user', 'guide', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (status && !['active', 'blocked'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (password && (typeof password !== 'string' || password.length < 8)) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (user.role === 'admin' && ((role && role !== 'admin') || status === 'blocked')) {
      return res.status(400).json({ error: 'Administrator accounts cannot be blocked or demoted here' });
    }
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (mobile_number !== undefined) updates.mobile_number = mobile_number;
    if (country) updates.country = country;
    if (password) updates.password = await bcrypt.hash(password, 10);

    await user.update(updates);
    const userOut = user.toJSON();
    delete userOut.password;
    res.json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/block â€” toggle block
router.patch('/:id/block', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot block another admin' });

    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    await user.update({ status: newStatus });
    res.json({ message: `User ${newStatus}`, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin account' });

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
