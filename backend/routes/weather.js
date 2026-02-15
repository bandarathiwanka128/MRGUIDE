const express = require('express');
const axios = require('axios');

const router = express.Router();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo';
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Get weather for single point
router.get('/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;

    const response = await axios.get(
      `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`
    );

    res.json({
      temp: response.data.main?.temp,
      feels_like: response.data.main?.feels_like,
      humidity: response.data.main?.humidity,
      description: response.data.weather?.[0]?.description,
      icon: response.data.weather?.[0]?.icon,
      wind_speed: response.data.wind?.speed,
      name: response.data.name
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Get weather for multiple locations
router.post('/multi', async (req, res) => {
  try {
    const { locations } = req.body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ error: 'Locations array is required' });
    }

    const weatherPromises = locations.map(async (loc) => {
      try {
        const response = await axios.get(
          `${WEATHER_BASE_URL}/weather?lat=${loc.lat}&lon=${loc.lng}&appid=${WEATHER_API_KEY}&units=metric`
        );
        return {
          lat: loc.lat,
          lng: loc.lng,
          name: loc.name || response.data.name,
          temp: response.data.main?.temp,
          feels_like: response.data.main?.feels_like,
          humidity: response.data.main?.humidity,
          description: response.data.weather?.[0]?.description,
          icon: response.data.weather?.[0]?.icon,
          wind_speed: response.data.wind?.speed,
          status: 'ok'
        };
      } catch (err) {
        return {
          lat: loc.lat,
          lng: loc.lng,
          name: loc.name,
          status: 'error',
          error: err.message
        };
      }
    });

    const results = await Promise.all(weatherPromises);
    res.json(results);
  } catch (error) {
    console.error('Multi weather error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
