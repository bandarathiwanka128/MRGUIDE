const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

// Get AI trip suggestions (weather-aware + hotel recommendations)
router.post('/trip-suggestions', authenticateToken, async (req, res) => {
  try {
    const { destinations, travel_mode, start_date, end_date, weather_data } = req.body;

    if (!destinations || destinations.length === 0) {
      return res.status(400).json({ error: 'At least one destination is required' });
    }

    const destNames = destinations.map(d => d.name).join(' → ');
    const dateInfo = start_date && end_date
      ? `Travel dates: ${start_date} to ${end_date}.`
      : 'Travel dates not specified.';

    // Build weather context if available
    let weatherContext = '';
    if (weather_data && Object.keys(weather_data).length > 0) {
      const weatherLines = Object.entries(weather_data)
        .map(([name, w]) => `  • ${name}: ${Math.round(w.temp)}°C, ${w.description}${w.humidity ? `, humidity ${w.humidity}%` : ''}`)
        .join('\n');
      weatherContext = `\n\nCurrent weather at destinations:\n${weatherLines}`;
    }

    const prompt = `You are an expert Sri Lanka travel planner. A traveler wants to visit: ${destNames}
Travel mode: ${travel_mode || 'car'}. ${dateInfo}${weatherContext}

Provide a detailed, practical travel plan with the following sections:

## 🗺️ Best Route & Itinerary
- Suggest the optimal visiting order and why
- Day-by-day schedule with realistic time estimates per stop
- Note if weather affects the visit order or timing

## 🌤️ Weather & Best Time to Visit
- How current weather conditions affect each destination
- Best time of day to visit each place
- What to wear and carry (rain gear, sunscreen, etc.)

## 🏨 Recommended Hotels (with Ratings)
For EACH destination, list 2-3 specific hotels:
- Hotel name, star rating (★★★ format), price range in LKR per night
- Key features (pool, A/C, free breakfast, location advantage)
- Example: **Ulagalla Resort** ★★★★★ - LKR 35,000-55,000/night - Luxury eco-resort

## 🎉 Festivals & Holidays
- Any upcoming festivals, poya days, or local events near the travel dates
- How these events affect travel (crowds, closures, special experiences)
- Specific festivals or ceremonies at each destination

## 📍 Must-See Nearby Attractions
- 2-3 additional places worth visiting near each destination
- Why they are worth the detour and how long they take

## 🍜 Food & Local Cuisine
- Must-try dishes specific to each destination
- Recommended restaurants or food spots with approximate prices in LKR

## 💡 Practical Budget & Tips
- Estimated total budget breakdown in LKR (accommodation, food, entry fees, fuel/transport)
- Safety advice specific to this route
- Important local customs and etiquette to respect

Be specific with real hotel names, real attractions, and realistic Sri Lanka prices. Use markdown formatting.`;

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

// AI tips for an optimized route
router.post('/route-tips', async (req, res) => {
  try {
    const { stops, travelMode, totalDistance, totalDuration } = req.body;

    if (!stops || stops.length === 0) {
      return res.status(400).json({ error: 'Stops are required' });
    }

    const stopNames = stops.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
    const prompt = `You are a Sri Lanka travel expert. A traveler has planned this route:

Stops (in order):
${stopNames}

Travel Mode: ${travelMode || 'car'}
Total Distance: ${totalDistance || 'unknown'} km
Estimated Duration: ${totalDuration || 'unknown'} minutes

Please provide smart travel tips for this route:
1. **Best Time to Travel** - When to depart and visit each stop
2. **Road Conditions** - Any notable roads or areas to be aware of
3. **Fuel/Rest Stops** - Suggested stops between locations
4. **Must-See Attractions** - Notable things near each stop
5. **Safety Tips** - Important local safety advice for this route
6. **Budget Estimate** - Rough costs in LKR (entry fees, fuel, food)

Keep it practical and specific to Sri Lanka. Format with markdown headers.`;

    const tips = await callGemini(prompt);
    res.json({ tips });
  } catch (error) {
    console.error('AI route tips error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate route tips' });
  }
});

// AI travel suggestion - public endpoint for homepage
router.post('/travel-suggest', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length < 5) {
      return res.status(400).json({ error: 'Please ask a more detailed question' });
    }

    const prompt = `You are a Sri Lanka travel expert assistant. A user asked: "${question}"

Respond with ONLY a valid JSON array (no markdown, no code blocks) of 1-3 place suggestions in Sri Lanka. Each object must have:
- "name": place name
- "reason": 1-2 sentence explanation why this is recommended (mention weather, activities, or unique features)
- "best_months": short text like "Dec-Mar" or "Year-round"
- "search_query": a Google Maps search query for this place
- "category": one of "beach", "temple", "nature", "city", "adventure", "culture", "wildlife"

Example format: [{"name":"Mirissa Beach","reason":"Perfect for whale watching and surfing with calm seas.","best_months":"Nov-Apr","search_query":"Mirissa Beach Sri Lanka","category":"beach"}]

Return ONLY the JSON array, nothing else.`;

    const text = await callGemini(prompt);

    // Parse the JSON from Gemini response (strip any markdown code blocks if present)
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(cleaned);

    res.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [] });
  } catch (error) {
    console.error('AI travel suggest error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate suggestions. Please try again.' });
  }
});

module.exports = router;
