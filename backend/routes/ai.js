const express = require('express');
const axios = require('axios');
const authenticateToken = require('../middleware/auth');
const { Place, AuthenticDetail, User, AuthenticProfile } = require('../config/database');
const { Op } = require('sequelize');

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not configured');
} else {
  console.log('✅ GEMINI_API_KEY loaded:', GEMINI_API_KEY.slice(0, 8) + '...');
}

// Models to try in order (fallback chain)
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Simple in-memory cache: key = prompt hash, value = { text, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(prompt) {
  // Simple hash — good enough for caching identical prompts
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (Math.imul(31, hash) + prompt.charCodeAt(i)) | 0;
  }
  return String(hash);
}

async function callGemini(prompt, retries = 3) {
  // Return cached result if still fresh
  const cacheKey = getCacheKey(prompt);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[Gemini] Cache hit');
    return cached.text;
  }

  let lastError;
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          url,
          { contents: [{ parts: [{ text: prompt }] }] },
          { timeout: 30000 }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        const result = text || 'No response generated.';
        console.log(`[Gemini] Success with model: ${model}`);
        cache.set(cacheKey, { text: result, expiresAt: Date.now() + CACHE_TTL_MS });
        return result;
      } catch (error) {
        const status = error.response?.status;
        lastError = error;

        // 429 = per-minute quota exhausted — skip to next model immediately (waiting within same minute doesn't help)
        if (status === 429) {
          console.warn(`[Gemini] ${model} quota exhausted (429), trying next model`);
          break;
        }

        // 503 = overloaded — short backoff then retry same model
        if (status === 503 && attempt < retries) {
          const waitMs = Math.pow(2, attempt) * 1000;
          console.warn(`[Gemini] ${model} overloaded (503), retry ${attempt}/${retries} in ${waitMs}ms`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        // Permanent error (403, 400, 404) — skip to next model immediately
        if (status === 403 || status === 400 || status === 404) {
          console.warn(`[Gemini] ${model} failed with ${status}, trying next model`);
          break;
        }

        // Exhausted retries for this model — try next
        if (attempt === retries) {
          console.warn(`[Gemini] ${model} exhausted retries, trying next model`);
        }
      }
    }
  }

  throw lastError;
}

// Mock fallback data when API fails
const FALLBACK_TRIP_SUGGESTIONS = `## 🗺️ Best Route & Itinerary
**DEMO MODE - Using sample data (Gemini API unavailable)**

We recommend visiting destinations in this order based on geographical proximity:
- Start in Colombo (Western coast)
- Head south to Mirissa (whale watching season)
- Move east to Kandy (hill country temples)
- End at Nuwara Eliya (tea plantations)

Estimated 7-10 day itinerary with realistic travel times between stops.

## 🌤️ Weather & Best Time to Visit
**Current Season Recommendations:**
- Bring light, breathable clothing
- Pack rain gear (monsoon patterns)
- Best to travel early morning to avoid midday heat
- Sunscreen and hats essential

## 🏨 Recommended Hotels
**Western Coast:**
- **Crowne Plaza Colombo** ★★★★★ - LKR 45,000-65,000/night
- **Galle Fort Hotel** ★★★★ - LKR 25,000-35,000/night

**South Coast:**
- **Mirissa Bay Hotel** ★★★★ - LKR 20,000-30,000/night
- **The Fortress Resort** ★★★★★ - LKR 55,000-75,000/night

**Hill Country:**
- **Kandy City Hotel** ★★★ - LKR 15,000-25,000/night
- **Mahaweli Reach Hotel** ★★★★ - LKR 30,000-45,000/night

## 🎉 Festivals & Holidays
- Vesak Festival (May) - Buddhist celebrations
- Kandy Esala Perahera (July-August) - Grand procession
- New Year celebrations vary by region

## 📍 Must-See Nearby Attractions
- Buddhist temples and ancient ruins
- Tea plantations and scenic viewpoints
- Beach activities and water sports
- Local markets and cultural sites

## 🍜 Food & Local Cuisine
- Lamprais (meat rice in banana leaf) - LKR 300-500
- Hoppers and curry - LKR 200-400
- Fresh seafood - LKR 1,000-2,000
- Local fruits and drinks

## 💡 Practical Budget & Tips
**Estimated Budget (per person):**
- Accommodation: LKR 20,000-40,000/night
- Meals: LKR 2,000-5,000/day
- Transport: LKR 2,000-3,000/day
- Activities: LKR 2,000-5,000/day
- **Total daily: LKR 26,000-53,000**

*Note: This is demo data due to API service limitations. For personalized recommendations, please try again later.*`;

const FALLBACK_PLACE_INFO = {
  "Sigiriya": "Sigiriya (Lion Rock) is an ancient rock fortress located in central Sri Lanka. Built in the 5th century by King Kasyapa, it stands 200m above the surrounding plains. UNESCO World Heritage site famous for its frescoes, mirror wall, and panoramic views. Best visited Nov-Mar. Entry: LKR 4,500. 2 hours climbing recommended. Nearby: Dambulla Cave Temple, Polonnaruwa ancient city.",
  "Kandy": "Kandy is Sri Lanka's second largest city, nestled around an artificial lake. Home to the Temple of the Tooth Relic, one of Buddhism's most sacred sites. Rich cultural heritage with traditional dance performances. Best visited year-round. Entry to temple: LKR 1,500. Cool climate at 500m elevation. Famous for annual Esala Perahera festival in July-August.",
  "Mirissa": "Mirissa is a charming coastal village in southern Sri Lanka, famous for whale watching (Nov-Apr) and beautiful beaches. Perfect for swimming, surfing, and sunset cruises. Relaxed atmosphere with fresh seafood restaurants. Entry: Free. Accommodation from LKR 3,000-30,000. Nearby: Matara Fort, Unawatuna Beach.",
  "Nuwara Eliya": "Hill station town at 1,868m elevation known as 'Little England'. Cool climate with terraced tea plantations surrounding the area. Visit tea factories to see traditional production. Best Nov-Mar. Scenic train rides available. Lakes, golf course, and colonial architecture. Temperature: 10-20°C. Nearby: Horton Plains National Park, Hakgala Botanical Garden."
};

const FALLBACK_ROUTE_TIPS = `**DEMO MODE - Using sample data (Gemini API unavailable)**

## 1. Best Time to Travel
- Depart early morning (6-7 AM) to maximize daylight
- Avoid traveling during monsoon (May-September in west/south)
- Plan 2-3 hours per major destination
- Evening arrival in cities recommended

## 2. Road Conditions
- Main highways well-maintained (A-roads: Colombo-Kandy good)
- Secondary roads may have potholes (watch for vehicles)
- Mountain passes can be narrow (Kandy-Nuwara Eliya scenic but slow)
- Drive with caution; local traffic can be unpredictable

## 3. Fuel/Rest Stops
- Fuel stations every 30-50km on main routes
- Rest stops with restaurants every 1-2 hours
- Recommended: Peradeniya, Matale (major towns for breaks)
- Hydrate frequently in hot climate

## 4. Must-See Attractions
- **Sigiriya:** 2-3 hours climbing/exploring the rock
- **Temple of Tooth (Kandy):** 1-2 hours
- **Tea plantations:** 1-2 hours tour
- **Beaches/water activities:** 3-4 hours

## 5. Safety Tips
- Do NOT travel after dark in rural areas
- Keep valuables secure
- Use registered taxis/tuk-tuks
- Inform someone of your route
- Emergency: 118 (police)

## 6. Budget Estimate
- Fuel: LKR 150-200/km (car rental)
- Tolls: LKR 500-1,000 on A-roads
- Meals: LKR 500-2,000 per meal
- Accommodation: LKR 3,000-30,000/night
- **Total estimated: LKR 15,000-25,000/person/day**

*This is demo data. For real-time route optimization, please try again later.*`;

  // AI trip suggestions
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
    return res.json({
      suggestions: FALLBACK_TRIP_SUGGESTIONS,
      fallback: true,
      note: 'Using demo data - Gemini API currently unavailable'
    });
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
    const placeName = req.body.name || 'Unknown';
    const fallbackInfo = FALLBACK_PLACE_INFO[placeName] || FALLBACK_PLACE_INFO['Sigiriya'];
    return res.json({ info: fallbackInfo, fallback: true });
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
    return res.json({ tips: FALLBACK_ROUTE_TIPS, fallback: true });
  }
});

// Helper: search DB for places/businesses matching query words
async function searchDatabase(question) {
  const results = [];
  try {
    // Extract meaningful words (>3 chars) from the question
    const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return results;

    const wordConditions = words.map(w => ({ [Op.iLike]: `%${w}%` }));

    // 1. Search businesses in AuthenticDetail
    const businesses = await AuthenticDetail.findAll({
      where: {
        is_active: true,
        detail_type: 'business',
        [Op.or]: [
          { business_name: { [Op.or]: wordConditions } },
          { title: { [Op.or]: wordConditions } },
          { description: { [Op.or]: wordConditions } },
          { organization: { [Op.or]: wordConditions } }
        ]
      },
      include: [
        { model: User, attributes: ['username', 'mobile_number', 'email'],
          include: [{ model: AuthenticProfile, required: false }] },
        { model: Place, required: false, attributes: ['name', 'address', 'latitude', 'longitude', 'google_place_id'] }
      ],
      limit: 3
    });

    for (const b of businesses) {
      const placeName = b.Place?.name || b.business_name;
      results.push({
        name: b.business_name || placeName,
        reason: b.description
          ? b.description.slice(0, 120) + (b.description.length > 120 ? '...' : '')
          : `${b.title || 'Business'} located in Sri Lanka.`,
        best_months: 'Year-round',
        search_query: `${b.business_name || placeName} Sri Lanka`,
        category: mapBusinessCategory(b.title),
        source: 'database',
        db_type: 'business',
        contact: b.phone || b.User?.mobile_number || null,
        added_by: b.User?.username || null,
        place_name: placeName
      });
    }

    // 2. Search authentic users in AuthenticDetail
    const users = await AuthenticDetail.findAll({
      where: {
        is_active: true,
        detail_type: 'user',
        [Op.or]: [
          { description: { [Op.or]: wordConditions } },
          { expertise: { [Op.or]: wordConditions } },
          { title: { [Op.or]: wordConditions } }
        ]
      },
      include: [
        { model: User, attributes: ['username', 'mobile_number', 'email'],
          include: [{ model: AuthenticProfile, required: false }] },
        { model: Place, required: false, attributes: ['name', 'address', 'latitude', 'longitude', 'google_place_id'] }
      ],
      limit: 3
    });

    for (const u of users) {
      const placeName = u.Place?.name || 'Sri Lanka';
      const profile = u.User?.AuthenticProfile;
      results.push({
        name: placeName,
        reason: u.description
          ? u.description.slice(0, 120) + (u.description.length > 120 ? '...' : '')
          : `Recommended by local expert ${u.User?.username || 'local guide'}.`,
        best_months: 'Year-round',
        search_query: `${placeName} Sri Lanka`,
        category: 'culture',
        source: 'database',
        db_type: 'user',
        expert_name: u.User?.username || null,
        expert_title: u.title || profile?.title || null,
        contact: u.phone || u.User?.mobile_number || null
      });
    }

    // 3. Search Place table by name
    const places = await Place.findAll({
      where: {
        [Op.or]: words.map(w => ({ name: { [Op.iLike]: `%${w}%` } }))
      },
      limit: 3
    });

    for (const p of places) {
      // Don't duplicate if already added from AuthenticDetail
      if (!results.find(r => r.place_name === p.name || r.name === p.name)) {
        results.push({
          name: p.name,
          reason: p.description
            ? p.description.slice(0, 120)
            : `Place in Sri Lanka with authentic local data.`,
          best_months: 'Year-round',
          search_query: `${p.name} Sri Lanka`,
          category: mapPlaceCategory(p.category),
          source: 'database',
          db_type: 'place'
        });
      }
    }
  } catch (err) {
    console.error('[DB search] error:', err.message);
  }
  return results;
}

function mapBusinessCategory(title) {
  if (!title) return 'city';
  const t = title.toLowerCase();
  if (t.includes('hotel') || t.includes('resort') || t.includes('guesthouse')) return 'city';
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('food')) return 'culture';
  if (t.includes('tour') || t.includes('safari') || t.includes('adventure')) return 'adventure';
  if (t.includes('beach') || t.includes('dive') || t.includes('surf')) return 'beach';
  if (t.includes('temple') || t.includes('heritage')) return 'temple';
  if (t.includes('wildlife') || t.includes('park') || t.includes('nature')) return 'wildlife';
  return 'city';
}

function mapPlaceCategory(category) {
  if (!category) return 'culture';
  const c = category.toLowerCase();
  if (c.includes('beach')) return 'beach';
  if (c.includes('temple') || c.includes('religious')) return 'temple';
  if (c.includes('nature') || c.includes('park')) return 'nature';
  if (c.includes('adventure')) return 'adventure';
  if (c.includes('wildlife')) return 'wildlife';
  return 'culture';
}

// AI travel suggestion - public endpoint for homepage
router.post('/travel-suggest', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length < 5) {
      return res.status(400).json({ error: 'Please ask a more detailed question' });
    }

    // Step 1: Search our own database first
    const dbResults = await searchDatabase(question);

    // Step 2: Ask Gemini to fill remaining slots (max 6 total, DB results have priority)
    const remaining = Math.max(1, 3 - dbResults.length);
    const dbNames = dbResults.map(r => r.name).join(', ');
    const avoidClause = dbNames
      ? ` Do NOT suggest these places (already listed): ${dbNames}.`
      : '';

    const prompt = `You are a Sri Lanka travel expert assistant. A user asked: "${question}"
${avoidClause}

Respond with ONLY a valid JSON array (no markdown, no code blocks) of exactly ${remaining} place suggestion(s) in Sri Lanka. Each object must have:
- "name": place name
- "reason": 1-2 sentence explanation relevant to the user's question
- "best_months": short text like "Dec-Mar" or "Year-round"
- "search_query": a Google Maps search query for this place in Sri Lanka
- "category": one of "beach", "temple", "nature", "city", "adventure", "culture", "wildlife"

Return ONLY the JSON array, nothing else.`;

    let geminiResults = [];
    try {
      const text = await callGemini(prompt);
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      geminiResults = (Array.isArray(parsed) ? parsed : []).map(r => ({ ...r, source: 'ai' }));
    } catch (err) {
      console.warn('[travel-suggest] Gemini parse failed:', err.message);
    }

    // Step 3: Combine — DB results first, then Gemini
    const combined = [...dbResults, ...geminiResults].slice(0, 6);

    // If nothing at all, use hardcoded fallback
    if (combined.length === 0) {
      return res.json({
        suggestions: [
          { name: 'Sigiriya', reason: 'UNESCO World Heritage site with stunning views of an ancient fortress.', best_months: 'Nov-Mar', search_query: 'Sigiriya Sri Lanka', category: 'culture', source: 'ai' },
          { name: 'Mirissa Beach', reason: 'Perfect for whale watching and relaxing by the ocean.', best_months: 'Nov-Apr', search_query: 'Mirissa Beach Sri Lanka', category: 'beach', source: 'ai' },
          { name: 'Kandy Temple of the Tooth', reason: 'Sacred Buddhist temple in the heart of Sri Lanka\'s cultural triangle.', best_months: 'Year-round', search_query: 'Temple of the Tooth Kandy', category: 'temple', source: 'ai' }
        ],
        fallback: true
      });
    }

    res.json({ suggestions: combined });
  } catch (error) {
    console.error('AI travel suggest error:', error.response?.data || error.message);
    res.json({
      suggestions: [
        { name: 'Sigiriya', reason: 'UNESCO World Heritage site with stunning views of an ancient fortress.', best_months: 'Nov-Mar', search_query: 'Sigiriya Sri Lanka', category: 'culture', source: 'ai' },
        { name: 'Mirissa Beach', reason: 'Perfect for whale watching and relaxing by the ocean.', best_months: 'Nov-Apr', search_query: 'Mirissa Beach Sri Lanka', category: 'beach', source: 'ai' },
        { name: 'Kandy Temple of the Tooth', reason: 'Sacred Buddhist temple in the heart of Sri Lanka\'s cultural triangle.', best_months: 'Year-round', search_query: 'Temple of the Tooth Kandy', category: 'temple', source: 'ai' }
      ],
      fallback: true
    });
  }
});

// Health check — confirms key is loaded and Gemini is reachable
router.get('/health', async (_req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY not set' });
  }
  try {
    await callGemini('Reply with the single word: OK');
    res.json({ ok: true, key: GEMINI_API_KEY.slice(0, 8) + '...' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.response?.data?.error?.message || e.message });
  }
});

module.exports = router;
