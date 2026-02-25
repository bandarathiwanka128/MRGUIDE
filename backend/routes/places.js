const express = require('express');
const { Place, Review, AuthenticDetail, User, AuthenticProfile } = require('../config/database');
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

// Get reviews for a Google Place ID
router.get('/google/:googlePlaceId/reviews', async (req, res) => {
  try {
    const { googlePlaceId } = req.params;

    const place = await Place.findOne({ where: { google_place_id: googlePlaceId } });
    if (!place) {
      return res.json({ reviews: [], avgRating: 0, totalCount: 0 });
    }

    const reviews = await Review.findAll({
      where: { place_id: place.id },
      include: [{ model: User, attributes: ['username'] }],
      order: [['created_at', 'DESC']]
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalCount: reviews.length
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit review for a Google Place ID (creates Place in DB if needed)
router.post('/google/:googlePlaceId/reviews', authenticateToken, async (req, res) => {
  try {
    const { googlePlaceId } = req.params;
    const { rating, comment, place_name, place_address, place_lat, place_lng, place_category } = req.body;

    if (!rating || parseInt(rating) < 1 || parseInt(rating) > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Find or create the place record
    let place = await Place.findOne({ where: { google_place_id: googlePlaceId } });

    if (!place) {
      if (!place_lat || !place_lng) {
        return res.status(400).json({ error: 'Place coordinates required to create place record' });
      }
      place = await Place.create({
        name: place_name || 'Unknown Place',
        category: place_category || 'place',
        latitude: place_lat,
        longitude: place_lng,
        address: place_address || '',
        google_place_id: googlePlaceId,
        created_by: req.user.id
      });
    }

    // Update existing review if user already reviewed this place
    const existing = await Review.findOne({
      where: { place_id: place.id, user_id: req.user.id }
    });

    if (existing) {
      await existing.update({ rating: parseInt(rating), comment: comment || '' });
      const updated = await Review.findByPk(existing.id, {
        include: [{ model: User, attributes: ['username'] }]
      });
      return res.json({ review: updated, updated: true });
    }

    const review = await Review.create({
      place_id: place.id,
      user_id: req.user.id,
      rating: parseInt(rating),
      comment: comment || '',
      photos: []
    });

    const reviewWithUser = await Review.findByPk(review.id, {
      include: [{ model: User, attributes: ['username'] }]
    });

    res.status(201).json({ review: reviewWithUser, updated: false });
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
        attributes: ['id', 'username', 'email', 'mobile_number'],
        include: [{ model: AuthenticProfile, required: false }]
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

// Search authentic details by place name or coordinates
router.get('/search-authentic', async (req, res) => {
  try {
    const { name, lat, lng } = req.query;

    if (!name && !lat) {
      return res.status(400).json({ error: 'name or lat/lng is required' });
    }

    let matchingPlaces = [];
    if (name) {
      // Try exact match first
      matchingPlaces = await Place.findAll({
        where: { name: { [Op.iLike]: `%${name}%` } }
      });

      // If no exact match, try fuzzy: match significant words (>3 chars)
      if (matchingPlaces.length === 0) {
        const words = name.split(/\s+/).filter(w => w.length > 3);
        if (words.length > 0) {
          const conditions = words.map(word => ({
            name: { [Op.iLike]: `%${word}%` }
          }));
          const candidates = await Place.findAll({
            where: { [Op.or]: conditions }
          });

          // If we have coordinates, pick only the nearest candidate (within 5km)
          if (candidates.length > 1 && lat && lng) {
            const withDist = candidates.map(p => ({
              place: p,
              dist: getDistance(
                { lat: parseFloat(lat), lng: parseFloat(lng) },
                { lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) }
              )
            })).sort((a, b) => a.dist - b.dist);

            if (withDist[0].dist < 5) {
              matchingPlaces = [withDist[0].place];
            }
          } else {
            matchingPlaces = candidates;
          }
        }
      }
    }

    // If no name match, try coordinates only - find nearest place within 2km
    if (matchingPlaces.length === 0 && lat && lng) {
      const allPlaces = await Place.findAll();
      const nearest = allPlaces
        .map(p => ({
          place: p,
          dist: getDistance(
            { lat: parseFloat(lat), lng: parseFloat(lng) },
            { lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) }
          )
        }))
        .filter(p => p.dist < 2)
        .sort((a, b) => a.dist - b.dist);

      if (nearest.length > 0) {
        matchingPlaces = [nearest[0].place];
      }
    }

    if (matchingPlaces.length === 0) {
      return res.json({ users: [], businesses: [], place: null });
    }

    const placeIds = matchingPlaces.map(p => p.id);
    const details = await AuthenticDetail.findAll({
      where: { place_id: { [Op.in]: placeIds }, is_active: true },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'mobile_number'],
        include: [{ model: AuthenticProfile, required: false }]
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      users: details.filter(d => d.detail_type === 'user'),
      businesses: details.filter(d => d.detail_type === 'business'),
      place: matchingPlaces[0]
    });
  } catch (error) {
    console.error('Error searching authentic details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all registered businesses with map coordinates
router.get('/businesses', async (req, res) => {
  try {
    const { query, lat, lng, radius } = req.query;

    const whereCondition = { detail_type: 'business', is_active: true };

    if (query) {
      whereCondition[Op.or] = [
        { business_name: { [Op.iLike]: `%${query}%` } },
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } }
      ];
    }

    const businesses = await AuthenticDetail.findAll({
      where: whereCondition,
      include: [
        { model: User, attributes: ['id', 'username', 'email'] },
        { model: Place, attributes: ['id', 'name', 'latitude', 'longitude', 'address', 'category'] }
      ],
      order: [['created_at', 'DESC']]
    });

    let result = businesses.filter(b => b.Place && b.Place.latitude && b.Place.longitude);

    if (lat && lng && radius) {
      const r = parseFloat(radius);
      result = result.filter(b => {
        const dist = getDistance(
          { lat: parseFloat(lat), lng: parseFloat(lng) },
          { lat: parseFloat(b.Place.latitude), lng: parseFloat(b.Place.longitude) }
        );
        return dist <= r;
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single place with authentic details by slug/name
router.get('/by-name/:placeName', async (req, res) => {
  try {
    const searchName = req.params.placeName.replace(/-/g, ' ');

    const place = await Place.findOne({
      where: { name: { [Op.iLike]: `%${searchName}%` } },
      include: [
        { model: Review, include: [{ model: User, attributes: ['username'] }] },
        {
          model: AuthenticDetail,
          where: { is_active: true },
          required: false,
          include: [{
            model: User,
            attributes: ['id', 'username', 'email', 'mobile_number'],
            include: [{ model: AuthenticProfile, required: false }]
          }]
        }
      ]
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(place);
  } catch (error) {
    console.error('Error fetching place by name:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single place with all details (must be AFTER all named routes)
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

// Add authentic detail to place (User or Business)
// Also auto-creates a Place entry if one doesn't exist, so it shows on the map
router.post('/authentic-details', authenticateToken, async (req, res) => {
  try {
    const {
      google_place_id,
      place_id,
      place_name,
      place_address,
      place_lat,
      place_lng,
      place_category,
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
      maps_link,
      packages,
      photos
    } = req.body;

    if (!google_place_id && !place_id) {
      return res.status(400).json({ error: 'Either google_place_id or place_id is required' });
    }

    // Auto-create a Place entry if it doesn't exist (so it shows as a purple marker on the map)
    let resolvedPlaceId = place_id || null;

    if (!resolvedPlaceId && google_place_id) {
      // Try to find existing place by google_place_id
      let existingPlace = await Place.findOne({ where: { google_place_id } });

      if (!existingPlace && place_lat && place_lng) {
        // Create new place entry so it appears on the Authentic Section map
        existingPlace = await Place.create({
          name: place_name || 'Unknown Place',
          category: place_category || 'place',
          latitude: place_lat,
          longitude: place_lng,
          address: place_address || '',
          google_place_id,
          created_by: req.user.id
        });
      }

      if (existingPlace) {
        resolvedPlaceId = existingPlace.id;
      }
    }

    // Check if user has already added detail for this place
    const whereCondition = { user_id: req.user.id };
    if (resolvedPlaceId) {
      whereCondition.place_id = resolvedPlaceId;
    } else if (google_place_id) {
      whereCondition.google_place_id = google_place_id;
    }

    const existingDetail = await AuthenticDetail.findOne({ where: whereCondition });

    if (existingDetail) {
      return res.status(400).json({ error: 'You have already added details for this place' });
    }

    const authenticDetail = await AuthenticDetail.create({
      place_id: resolvedPlaceId,
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
      maps_link: maps_link || null,
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