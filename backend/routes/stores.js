const express = require('express');
const { Store, User } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { Op } = require('sequelize');
const axios = require('axios');

const router = express.Router();

// Google Maps API Key (should be in environment variables)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDKQmKH9sEMretHWkYag0FMg7VFCNRNC_8';

// Get all stores with filters
router.get('/', async (req, res) => {
  try {
    const {
      business_type,
      search,
      lat,
      lng,
      radius = 10, // km
      status = 'active'
    } = req.query;

    let where = { status };

    if (business_type) {
      where.business_type = business_type;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    let stores = await Store.findAll({
      where,
      include: [{
        model: User,
        attributes: ['username', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    // Filter by distance if lat/lng provided
    if (lat && lng) {
      stores = stores.filter(store => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(store.latitude),
          parseFloat(store.longitude)
        );
        return distance <= parseFloat(radius);
      }).map(store => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(store.latitude),
          parseFloat(store.longitude)
        );
        return {
          ...store.toJSON(),
          distance: distance.toFixed(2)
        };
      }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }

    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single store with weather data
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['username', 'email', 'mobile_number']
      }]
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get weather data for store location
    try {
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${store.latitude}&lon=${store.longitude}&appid=${process.env.WEATHER_API_KEY || 'demo'}&units=metric`
      );
      store.dataValues.weather = weatherResponse.data;
    } catch (weatherError) {
      console.log('Weather API error:', weatherError.message);
      store.dataValues.weather = null;
    }

    // Get timezone
    try {
      const timezoneResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/timezone/json?location=${store.latitude},${store.longitude}&timestamp=${Math.floor(Date.now() / 1000)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      store.dataValues.timezone = timezoneResponse.data;
    } catch (tzError) {
      console.log('Timezone API error:', tzError.message);
    }

    res.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new store (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      business_type,
      address,
      latitude,
      longitude,
      phone,
      email,
      website,
      opening_hours,
      amenities,
      images,
      description
    } = req.body;

    // Validate coordinates using Geocoding API
    try {
      const geocodeResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (geocodeResponse.data.status !== 'OK') {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
    } catch (geocodeError) {
      console.log('Geocoding validation skipped');
    }

    const newStore = await Store.create({
      name,
      business_type,
      address,
      latitude,
      longitude,
      phone,
      email,
      website,
      opening_hours,
      amenities,
      images,
      description,
      owner_id: req.user.id,
      is_verified: req.user.role === 'authentic_user'
    });

    res.status(201).json(newStore);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update store
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check ownership
    if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await store.update(req.body);
    res.json(store);
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete store
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await store.destroy();
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get directions from location to store (with yellow route)
router.post('/:id/directions', async (req, res) => {
  try {
    const { origin_lat, origin_lng, travel_mode = 'DRIVING' } = req.body;

    const store = await Store.findByPk(req.params.id);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const directionsResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin_lat},${origin_lng}&destination=${store.latitude},${store.longitude}&mode=${travel_mode.toLowerCase()}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (directionsResponse.data.status === 'OK') {
      const route = directionsResponse.data.routes[0];
      res.json({
        distance: route.legs[0].distance,
        duration: route.legs[0].duration,
        steps: route.legs[0].steps,
        polyline: route.overview_polyline,
        route: directionsResponse.data
      });
    } else {
      res.status(400).json({ error: 'Could not calculate directions' });
    }
  } catch (error) {
    console.error('Error getting directions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get distance matrix for multiple stores
router.post('/distance-matrix', async (req, res) => {
  try {
    const { origin_lat, origin_lng, store_ids } = req.body;

    const stores = await Store.findAll({
      where: {
        id: store_ids
      }
    });

    const destinations = stores.map(s => `${s.latitude},${s.longitude}`).join('|');

    const matrixResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin_lat},${origin_lng}&destinations=${destinations}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (matrixResponse.data.status === 'OK') {
      const results = matrixResponse.data.rows[0].elements.map((element, index) => ({
        store: stores[index],
        distance: element.distance,
        duration: element.duration,
        status: element.status
      }));

      res.json(results);
    } else {
      res.status(400).json({ error: 'Could not calculate distance matrix' });
    }
  } catch (error) {
    console.error('Error calculating distance matrix:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Optimize route to visit multiple stores
router.post('/optimize-route', async (req, res) => {
  try {
    const { store_ids, origin_lat, origin_lng } = req.body;

    const stores = await Store.findAll({
      where: { id: store_ids }
    });

    if (stores.length < 2) {
      return res.status(400).json({ error: 'At least 2 stores required' });
    }

    // Use Route Optimization API or simple TSP
    const locations = stores.map(s => ({
      id: s.id,
      name: s.name,
      lat: parseFloat(s.latitude),
      lng: parseFloat(s.longitude)
    }));

    const origin = origin_lat && origin_lng
      ? { lat: parseFloat(origin_lat), lng: parseFloat(origin_lng) }
      : locations[0];

    // Simple nearest neighbor TSP algorithm
    const optimizedRoute = nearestNeighborTSP(locations, origin);

    // Get directions for optimized route
    const waypoints = optimizedRoute.slice(0, -1).map(loc => `${loc.lat},${loc.lng}`).join('|');
    const destination = optimizedRoute[optimizedRoute.length - 1];

    try {
      const directionsResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=optimize:true|${waypoints}&key=${GOOGLE_MAPS_API_KEY}`
      );

      res.json({
        optimizedRoute,
        directions: directionsResponse.data,
        totalStores: optimizedRoute.length
      });
    } catch (dirError) {
      res.json({ optimizedRoute });
    }
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Geocode address to coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    const geocodeResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (geocodeResponse.data.status === 'OK') {
      const result = geocodeResponse.data.results[0];
      res.json({
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id
      });
    } else {
      res.status(400).json({ error: 'Address not found' });
    }
  } catch (error) {
    console.error('Error geocoding:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reverse geocode coordinates to address
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const geocodeResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (geocodeResponse.data.status === 'OK') {
      res.json({
        address: geocodeResponse.data.results[0].formatted_address,
        results: geocodeResponse.data.results
      });
    } else {
      res.status(400).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Simple TSP using nearest neighbor
function nearestNeighborTSP(locations, startPoint) {
  const unvisited = [...locations];
  const route = [startPoint];

  let current = startPoint;

  // Remove start point if it's in the locations list
  const startIndex = unvisited.findIndex(
    loc => loc.lat === current.lat && loc.lng === current.lng
  );
  if (startIndex > -1) {
    unvisited.splice(startIndex, 1);
  }

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistance(
      current.lat, current.lng,
      unvisited[0].lat, unvisited[0].lng
    );

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(
        current.lat, current.lng,
        unvisited[i].lat, unvisited[i].lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    current = unvisited[nearestIndex];
    route.push(current);
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

module.exports = router;
