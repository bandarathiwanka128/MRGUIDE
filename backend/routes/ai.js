const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(prompt) {
  const response = await axios.post(
    `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }]
    }
  );
  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || 'No response generated.';
}

// Get AI trip suggestions
router.post('/trip-suggestions', authenticateToken, async (req, res) => {
  try {
    const { destinations, travel_mode, start_date, end_date } = req.body;

    if (!destinations || destinations.length === 0) {
      return res.status(400).json({ error: 'At least one destination is required' });
    }

    const destNames = destinations.map(d => d.name).join(', ');
    const dateInfo = start_date && end_date
      ? `Travel dates: ${start_date} to ${end_date}.`
      : '';

    const prompt = `You are a Sri Lanka travel expert. Plan a trip visiting these destinations: ${destNames}. Travel mode: ${travel_mode || 'car'}. ${dateInfo}

Please provide:
1. **Suggested Itinerary** - Day-by-day plan with time estimates
2. **Best Time to Visit** - For each location
3. **What to Pack** - Based on the destinations
4. **Local Customs & Tips** - Important cultural considerations
5. **Safety Tips** - Travel safety advice
6. **Estimated Budget** - Rough cost breakdown in LKR
7. **Food Recommendations** - Must-try dishes at each stop

Keep it concise but informative. Format with markdown headers.`;

    const suggestions = await callGemini(prompt);
    res.json({ suggestions });
  } catch (error) {
    console.error('AI trip suggestions error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate AI suggestions' });
  }
});

// Get AI info about a place
router.post('/place-info', async (req, res) => {
  try {
    const { name, lat, lng } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Place name is required' });
    }

    const prompt = `Tell me about "${name}" in Sri Lanka${lat && lng ? ` (located at ${lat}, ${lng})` : ''}. Include: brief description, history, best time to visit, entry fees if any, nearby attractions, and travel tips. Keep it under 300 words.`;

    const info = await callGemini(prompt);
    res.json({ info });
  } catch (error) {
    console.error('AI place info error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate place info' });
  }
});

module.exports = router;
