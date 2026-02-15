const express = require('express');
const { Trip, User } = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Get user's saved trips
router.get('/', authenticateToken, async (req, res) => {
  try {
    const trips = await Trip.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single trip
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['username', 'email']
      }]
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create trip
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, destinations, travel_mode,
      total_distance, total_duration, weather_data,
      ai_suggestions, status, start_date, end_date
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const trip = await Trip.create({
      user_id: req.user.id,
      title,
      description,
      destinations: destinations || [],
      travel_mode: travel_mode || 'car',
      total_distance,
      total_duration,
      weather_data,
      ai_suggestions,
      status: status || 'draft',
      start_date,
      end_date
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update trip
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await trip.update(req.body);
    res.json(trip);
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete trip
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await trip.destroy();
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
