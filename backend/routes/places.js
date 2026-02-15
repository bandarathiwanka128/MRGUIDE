const express = require('express');
const { Place, Review, AuthenticDetail, User } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get nearby places with sorting
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50, sort = 'distance', category } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    let where = {};
    if (category) {
      where.category = category;
    }

    let places = await Place.findAll({
      where,
      include: [{ model: Review, attributes: ['rating'] }]
    });

    // Calculate distance and filter by radius
    places = places
      .map(place => {
        const dist = getDistance(
          { lat: parseFloat(lat), lng: parseFloat(lng) },
          { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) }
        );
        const ratings = place.Reviews?.map(r => r.rating) || [];
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        return {
          ...place.toJSON(),
          distance: parseFloat(dist.toFixed(2)),
          avgRating: parseFloat(avgRating.toFixed(1))
        };
      })
      .filter(p => p.distance <= parseFloat(radius));

    // Sort
    if (sort === 'rating') {
      places.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sort === 'price') {
      places.sort((a, b) => (a.price_level || 99) - (b.price_level || 99));
    } else {
      places.sort((a, b) => a.distance - b.distance);
    }

    res.json(places);
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all places
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    let where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    if (category) {
      where.category = category;
    }

    const places = await Place.findAll({
      where,
      include: [
        {
          model: Review,
          attributes: ['rating']
        }
      ]
    });
    res.json(places);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single place with all details
router.get('/:id', async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id, {
      include: [
        {
          model: Review,
          include: [{
            model: User,
            attributes: ['username']
          }]
        },
        {
          model: AuthenticDetail,
          include: [{
            model: User,
            attributes: ['username', 'email']
          }]
        }
      ]
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(place);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create place
router.post('/', authenticateToken, async (req, res) => {
  try {
    const newPlace = await Place.create({
      ...req.body,
      created_by: req.user.id
    });
    res.status(201).json(newPlace);
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add review to place
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment, photos } = req.body;

    const place = await Place.findByPk(req.params.id);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const review = await Review.create({
      place_id: req.params.id,
      user_id: req.user.id,
      rating,
      comment,
      photos: photos || []
    });

    const reviewWithUser = await Review.findByPk(review.id, {
      include: [{
        model: User,
        attributes: ['username']
      }]
    });

    res.status(201).json(reviewWithUser);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get authentic details for a Google Place ID
router.get('/google/:googlePlaceId/authentic-details', async (req, res) => {
  try {
    const { googlePlaceId } = req.params;

    const details = await AuthenticDetail.findAll({
      where: {
        google_place_id: googlePlaceId,
        is_active: true
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'mobile_number']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      users: details.filter(d => d.detail_type === 'user'),
      businesses: details.filter(d => d.detail_type === 'business')
    });
  } catch (error) {
    console.error('Error fetching authentic details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add authentic detail to place (User or Business)
router.post('/authentic-details', authenticateToken, async (req, res) => {
  try {
    const {
      google_place_id,
      place_id,
      detail_type,
      title,
      business_name,
      organization,
      job_title,
      expertise,
      description,
      phone,
      email,
      website,
      packages,
      photos
    } = req.body;

    if (!google_place_id && !place_id) {
      return res.status(400).json({ error: 'Either google_place_id or place_id is required' });
    }

    // Check if user has already added detail for this place
    const existingDetail = await AuthenticDetail.findOne({
      where: {
        user_id: req.user.id,
        [Op.or]: [
          { google_place_id: google_place_id || null },
          { place_id: place_id || null }
        ]
      }
    });

    if (existingDetail) {
      return res.status(400).json({ error: 'You have already added details for this place' });
    }

    const authenticDetail = await AuthenticDetail.create({
      place_id: place_id || null,
      google_place_id: google_place_id || null,
      user_id: req.user.id,
      detail_type: detail_type || 'user',
      title,
      business_name,
      organization,
      job_title,
      expertise,
      description,
      phone,
      email,
      website,
      packages: packages || null,
      photos: photos || []
    });

    const detailWithUser = await AuthenticDetail.findByPk(authenticDetail.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'mobile_number']
      }]
    });

    res.status(201).json(detailWithUser);
  } catch (error) {
    console.error('Error creating authentic detail:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update authentic detail
router.put('/authentic-details/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await AuthenticDetail.findByPk(req.params.id);

    if (!detail) {
      return res.status(404).json({ error: 'Authentic detail not found' });
    }

    if (detail.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this detail' });
    }

    await detail.update(req.body);

    const updatedDetail = await AuthenticDetail.findByPk(detail.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'mobile_number']
      }]
    });

    res.json(updatedDetail);
  } catch (error) {
    console.error('Error updating authentic detail:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete authentic detail
router.delete('/authentic-details/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await AuthenticDetail.findByPk(req.params.id);

    if (!detail) {
      return res.status(404).json({ error: 'Authentic detail not found' });
    }

    if (detail.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this detail' });
    }

    await detail.update({ is_active: false });
    res.json({ message: 'Authentic detail deleted successfully' });
  } catch (error) {
    console.error('Error deleting authentic detail:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Optimize route for multiple locations
router.post('/optimize-route', async (req, res) => {
  try {
    const { locations, startLocation } = req.body;

    if (!locations || locations.length < 2) {
      return res.status(400).json({ error: 'At least 2 locations required' });
    }

    // Simple nearest neighbor algorithm for TSP
    const unvisited = [...locations];
    const route = [];
    let current = startLocation || locations[0];

    route.push(current);
    const currentIndex = unvisited.findIndex(
      loc => loc.lat === current.lat && loc.lng === current.lng
    );
    if (currentIndex > -1) {
      unvisited.splice(currentIndex, 1);
    }

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = getDistance(current, unvisited[0]);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = getDistance(current, unvisited[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      current = unvisited[nearestIndex];
      route.push(current);
      unvisited.splice(nearestIndex, 1);
    }

    res.json({ optimizedRoute: route });
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate distance between two points
function getDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;