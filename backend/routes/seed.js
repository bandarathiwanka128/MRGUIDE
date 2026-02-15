const express = require('express');
const bcrypt = require('bcryptjs');
const { User, AuthenticProfile, Place, AuthenticDetail, Review } = require('../config/database');

const router = express.Router();

// Seed 5 authentic places with realistic data (Wikipedia-sourced info + fake contact data)
router.post('/seed-places', async (req, res) => {
  try {
    // --- 1. Create 5 authentic users ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Auth@12345', salt);

    const authenticUsers = [
      {
        username: 'kamal_perera',
        email: 'kamal.perera@mrguide.lk',
        password: hashedPassword,
        mobile_number: '+94771234567',
        country_code: '+94',
        country: 'Sri Lanka',
        role: 'authentic_user'
      },
      {
        username: 'nimal_silva',
        email: 'nimal.silva@mrguide.lk',
        password: hashedPassword,
        mobile_number: '+94772345678',
        country_code: '+94',
        country: 'Sri Lanka',
        role: 'authentic_user'
      },
      {
        username: 'saman_kumara',
        email: 'saman.kumara@mrguide.lk',
        password: hashedPassword,
        mobile_number: '+94773456789',
        country_code: '+94',
        country: 'Sri Lanka',
        role: 'authentic_user'
      },
      {
        username: 'dilani_fernando',
        email: 'dilani.fernando@mrguide.lk',
        password: hashedPassword,
        mobile_number: '+94774567890',
        country_code: '+94',
        country: 'Sri Lanka',
        role: 'authentic_user'
      },
      {
        username: 'ruwan_jayasinghe',
        email: 'ruwan.jayasinghe@mrguide.lk',
        password: hashedPassword,
        mobile_number: '+94775678901',
        country_code: '+94',
        country: 'Sri Lanka',
        role: 'authentic_user'
      }
    ];

    const createdUsers = [];
    for (const userData of authenticUsers) {
      const [user] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData
      });
      createdUsers.push(user);
    }

    // --- 2. Create authentic profiles for each user ---
    const profiles = [
      {
        user_id: createdUsers[0].id,
        title: 'Heritage Tour Guide',
        education: 'BA in History - University of Peradeniya',
        job_title: 'Senior Tour Guide',
        age: 42,
        description: 'Licensed tour guide with 15 years of experience specializing in Sigiriya and the Cultural Triangle. Fluent in English, Sinhala, and Tamil.',
        has_business: true,
        business_name: 'Kamal Heritage Tours',
        business_type: 'Tour Guide Service',
        business_description: 'Premium guided tours of Sigiriya, Dambulla, and Polonnaruwa with expert historical commentary.'
      },
      {
        user_id: createdUsers[1].id,
        title: 'Local Food Expert',
        education: 'Diploma in Culinary Arts - SLITHM',
        job_title: 'Chef & Food Blogger',
        age: 35,
        description: 'Professional chef and food enthusiast from Kandy. Expert in traditional Kandyan cuisine and temple food culture.',
        has_business: true,
        business_name: 'Kandy Spice Kitchen',
        business_type: 'Restaurant & Cooking Classes',
        business_description: 'Authentic Kandyan dining experience with cooking classes for tourists. Located near Temple of the Tooth.'
      },
      {
        user_id: createdUsers[2].id,
        title: 'Wildlife Photographer',
        education: 'BSc in Zoology - University of Colombo',
        job_title: 'Wildlife Guide & Photographer',
        age: 38,
        description: 'Certified wildlife guide for Yala National Park with expertise in leopard tracking and bird watching. Published in National Geographic Sri Lanka.',
        has_business: true,
        business_name: 'Wild Lanka Safaris',
        business_type: 'Safari Tours',
        business_description: 'Premium wildlife safaris in Yala, Udawalawe, and Wilpattu with professional photography guidance.'
      },
      {
        user_id: createdUsers[3].id,
        title: 'Heritage Architect',
        education: 'MSc in Architecture - University of Moratuwa',
        job_title: 'Heritage Conservation Specialist',
        age: 45,
        description: 'Expert in Dutch colonial architecture and Galle Fort preservation. Consultant for UNESCO heritage sites in Sri Lanka.',
        has_business: false,
        business_name: null,
        business_type: null,
        business_description: null
      },
      {
        user_id: createdUsers[4].id,
        title: 'Tea Estate Manager',
        education: 'BSc in Agriculture - University of Ruhuna',
        job_title: 'Tea Estate Manager & Guide',
        age: 50,
        description: 'Third-generation tea planter from Ella region. Offers authentic tea plantation tours and tea tasting experiences.',
        has_business: true,
        business_name: 'Ella Tea Trails',
        business_type: 'Tea Plantation Tours',
        business_description: 'Guided tours through working tea estates with tea plucking experience, factory visits, and premium Ceylon tea tasting.'
      }
    ];

    for (const profileData of profiles) {
      await AuthenticProfile.findOrCreate({
        where: { user_id: profileData.user_id },
        defaults: profileData
      });
    }

    // --- 3. Create 5 Places (Wikipedia-sourced data) ---
    const places = [
      {
        name: 'Sigiriya Rock Fortress',
        category: 'tourism',
        latitude: 7.9570,
        longitude: 80.7603,
        description: 'Sigiriya or Sinhagiri is an ancient rock fortress located in the northern Matale District near the town of Dambulla. It is a site of historical and archaeological significance dominated by a massive column of granite approximately 180 metres high. According to chronicles, King Kashyapa (477-495 CE) built his palace on top of the rock and decorated its sides with colorful frescoes. The site was designated as a UNESCO World Heritage Site in 1982. It is one of the best preserved examples of ancient urban planning.',
        address: 'Sigiriya, Matale District, Central Province, Sri Lanka',
        google_place_id: 'sigiriya_rock_fortress',
        price_level: 4,
        estimated_cost: 30.00
      },
      {
        name: 'Temple of the Sacred Tooth Relic',
        category: 'temple',
        latitude: 7.2936,
        longitude: 80.6413,
        description: 'Sri Dalada Maligawa or the Temple of the Sacred Tooth Relic is a Buddhist temple in Kandy, Sri Lanka. It is located in the royal palace complex of the former Kingdom of Kandy, which houses the relic of the tooth of the Buddha. Since ancient times, the relic has played an important role in local politics because it is believed that whoever holds the relic holds the governance of the country. The temple is a UNESCO World Heritage Site.',
        address: 'Sri Dalada Veediya, Kandy 20000, Sri Lanka',
        google_place_id: 'temple_tooth_kandy',
        price_level: 2,
        estimated_cost: 10.00
      },
      {
        name: 'Galle Fort',
        category: 'tourism',
        latitude: 6.0269,
        longitude: 80.2170,
        description: 'Galle Fort, in the Bay of Galle on the southwest coast of Sri Lanka, was first built in 1588 by the Portuguese, then extensively fortified by the Dutch during the 17th century from 1649 onwards. It is a historical, archaeological and architectural heritage monument, which even after more than 432 years maintains a polished appearance. The fort is a UNESCO World Heritage Site and the largest remaining fortress in Asia built by European occupiers.',
        address: 'Church Street, Fort, Galle 80000, Sri Lanka',
        google_place_id: 'galle_fort',
        price_level: 1,
        estimated_cost: 0.00
      },
      {
        name: 'Yala National Park',
        category: 'park',
        latitude: 6.3798,
        longitude: 81.5218,
        description: 'Yala National Park is the most visited and second largest national park in Sri Lanka, bordering the Indian Ocean. The park covers 979 square kilometres and is home to 215 bird species and 44 mammal species. It has one of the highest leopard densities in the world. The park also contains important cultural ruins indicating that the region was once part of the ancient Ruhuna kingdom.',
        address: 'Yala National Park, Hambantota District, Southern Province, Sri Lanka',
        google_place_id: 'yala_national_park',
        price_level: 4,
        estimated_cost: 35.00
      },
      {
        name: 'Nine Arches Bridge, Ella',
        category: 'tourism',
        latitude: 6.8782,
        longitude: 81.0466,
        description: 'The Nine Arches Bridge, also called the Bridge in the Sky, is a viaduct bridge in Sri Lanka built during the British colonial period. It is located in Demodara, between Ella and Demodara railway stations. The bridge is 24 meters high and 91 meters long, built entirely of stone, bricks and cement without any steel. It is one of the most iconic landmarks in Sri Lanka and a popular tourist attraction.',
        address: 'Demodara, Ella, Badulla District, Uva Province, Sri Lanka',
        google_place_id: 'nine_arches_ella',
        price_level: 1,
        estimated_cost: 0.00
      }
    ];

    const createdPlaces = [];
    for (const placeData of places) {
      const [place] = await Place.findOrCreate({
        where: { google_place_id: placeData.google_place_id },
        defaults: { ...placeData, created_by: createdUsers[0].id }
      });
      createdPlaces.push(place);
    }

    // --- 4. Add Reviews ---
    const reviews = [
      { place_id: createdPlaces[0].id, user_id: createdUsers[1].id, rating: 5, comment: 'Absolutely breathtaking! The climb is worth every step. The frescoes are magnificent and the view from the top is unreal.' },
      { place_id: createdPlaces[0].id, user_id: createdUsers[2].id, rating: 4, comment: 'Amazing historical site. Go early morning to avoid the heat. The lion paw entrance is incredible.' },
      { place_id: createdPlaces[0].id, user_id: createdUsers[3].id, rating: 5, comment: 'A masterpiece of ancient engineering. The water gardens and mirror wall are fascinating.' },
      { place_id: createdPlaces[1].id, user_id: createdUsers[0].id, rating: 5, comment: 'A deeply spiritual experience. The temple architecture is stunning and the rituals are beautiful to witness.' },
      { place_id: createdPlaces[1].id, user_id: createdUsers[4].id, rating: 4, comment: 'Must-visit in Kandy. Try to attend the evening puja ceremony. Very peaceful atmosphere.' },
      { place_id: createdPlaces[2].id, user_id: createdUsers[0].id, rating: 5, comment: 'Walking through Galle Fort is like stepping back in time. Beautiful Dutch colonial architecture everywhere.' },
      { place_id: createdPlaces[2].id, user_id: createdUsers[1].id, rating: 4, comment: 'Great cafes, boutique shops, and stunning ocean views. Perfect for a half-day exploration.' },
      { place_id: createdPlaces[3].id, user_id: createdUsers[2].id, rating: 5, comment: 'Saw 3 leopards in one safari! The wildlife diversity is incredible. Book a morning safari for best sightings.' },
      { place_id: createdPlaces[3].id, user_id: createdUsers[4].id, rating: 4, comment: 'Amazing national park. The elephants, crocodiles, and bird life are spectacular. Bring binoculars!' },
      { place_id: createdPlaces[4].id, user_id: createdUsers[3].id, rating: 5, comment: 'The most photogenic bridge in Sri Lanka. Visit when the train passes for an unforgettable experience.' },
      { place_id: createdPlaces[4].id, user_id: createdUsers[0].id, rating: 5, comment: 'Stunning engineering from the colonial era. The surrounding tea plantations add to the beauty.' }
    ];

    for (const reviewData of reviews) {
      const existing = await Review.findOne({
        where: { place_id: reviewData.place_id, user_id: reviewData.user_id }
      });
      if (!existing) {
        await Review.create(reviewData);
      }
    }

    // --- 5. Add Authentic Details (User + Business data) ---
    const authenticDetails = [
      // Sigiriya - Kamal (Tour Guide Business)
      {
        place_id: createdPlaces[0].id,
        google_place_id: 'sigiriya_rock_fortress',
        user_id: createdUsers[0].id,
        detail_type: 'business',
        title: 'Heritage Tour Guide',
        business_name: 'Kamal Heritage Tours',
        organization: 'Kamal Heritage Tours (Pvt) Ltd',
        job_title: 'Senior Tour Guide',
        expertise: 'Ancient Sri Lankan history, Sigiriya architecture, Frescoes, Water gardens',
        description: 'I offer guided tours of Sigiriya with in-depth historical commentary. Each tour includes the water gardens, mirror wall, frescoes, lion platform, and summit palace. Available in English, Sinhala, and Tamil.',
        phone: '+94771234567',
        email: 'kamal.tours@mrguide.lk',
        website: 'https://kamalheritage.lk',
        packages: [
          { name: 'Standard Tour', price: '$25 per person', description: '3-hour guided tour of Sigiriya with historical commentary' },
          { name: 'Premium Tour', price: '$50 per person', description: 'Full day tour including Sigiriya + Pidurangala Rock + lunch' },
          { name: 'Cultural Triangle Package', price: '$120 per person', description: '2-day tour covering Sigiriya, Dambulla Cave Temple, and Polonnaruwa' }
        ],
        verified: true,
        is_active: true
      },
      // Temple of Tooth - Nimal (Restaurant Business)
      {
        place_id: createdPlaces[1].id,
        google_place_id: 'temple_tooth_kandy',
        user_id: createdUsers[1].id,
        detail_type: 'business',
        title: 'Local Food Expert',
        business_name: 'Kandy Spice Kitchen',
        organization: 'Kandy Spice Kitchen',
        job_title: 'Head Chef & Owner',
        expertise: 'Traditional Kandyan cuisine, Sri Lankan spices, Cooking classes',
        description: 'Located 5 minutes walk from the Temple of the Tooth. We serve authentic Kandyan rice and curry, traditional sweetmeats, and offer hands-on cooking classes for tourists.',
        phone: '+94772345678',
        email: 'spicekitchen@mrguide.lk',
        website: 'https://kandyspicekitchen.lk',
        packages: [
          { name: 'Lunch Buffet', price: '$8 per person', description: 'Traditional rice and curry buffet with 10+ dishes' },
          { name: 'Cooking Class', price: '$30 per person', description: '3-hour cooking class - learn to make 5 Sri Lankan dishes' },
          { name: 'Dinner Experience', price: '$15 per person', description: 'Candlelit dinner with traditional Kandyan dance show' }
        ],
        verified: true,
        is_active: true
      },
      // Yala - Saman (Safari Business)
      {
        place_id: createdPlaces[3].id,
        google_place_id: 'yala_national_park',
        user_id: createdUsers[2].id,
        detail_type: 'business',
        title: 'Wildlife Photographer & Guide',
        business_name: 'Wild Lanka Safaris',
        organization: 'Wild Lanka Safaris (Pvt) Ltd',
        job_title: 'Lead Safari Guide',
        expertise: 'Leopard tracking, Bird watching, Wildlife photography, Conservation',
        description: 'Professional wildlife safaris with certified naturalist guides. We have a 95% leopard sighting rate. Small group sizes (max 6) for the best experience.',
        phone: '+94773456789',
        email: 'safaris@wildlanka.lk',
        website: 'https://wildlankasafaris.lk',
        packages: [
          { name: 'Morning Safari', price: '$45 per person', description: '5:30 AM - 11:00 AM half-day safari with breakfast' },
          { name: 'Full Day Safari', price: '$80 per person', description: 'Full day safari with lunch, covering all 5 blocks' },
          { name: 'Photography Safari', price: '$100 per person', description: 'Specialized safari for photographers with extended stops and expert guidance' }
        ],
        verified: true,
        is_active: true
      },
      // Galle Fort - Dilani (User expert, no business)
      {
        place_id: createdPlaces[2].id,
        google_place_id: 'galle_fort',
        user_id: createdUsers[3].id,
        detail_type: 'user',
        title: 'Heritage Conservation Specialist',
        organization: 'University of Moratuwa - Department of Architecture',
        job_title: 'Senior Lecturer & Consultant',
        expertise: 'Dutch colonial architecture, Fort conservation, UNESCO heritage management',
        description: 'I have been studying and documenting Galle Fort architecture for over 20 years. The fort contains excellent examples of Dutch Reformed Church architecture, merchant houses, and military bastions. I can provide expert insights into the architectural significance of various buildings within the fort.',
        phone: '+94774567890',
        email: 'dilani.arch@mrguide.lk',
        website: null,
        packages: null,
        verified: true,
        is_active: true
      },
      // Nine Arches Bridge - Ruwan (Tea Estate Business)
      {
        place_id: createdPlaces[4].id,
        google_place_id: 'nine_arches_ella',
        user_id: createdUsers[4].id,
        detail_type: 'business',
        title: 'Tea Estate Manager',
        business_name: 'Ella Tea Trails',
        organization: 'Ella Tea Trails',
        job_title: 'Owner & Guide',
        expertise: 'Ceylon tea production, Tea plantation tours, Ella region hiking trails',
        description: 'Our tea estate is located just 10 minutes from the Nine Arches Bridge. We offer guided tours through working tea plantations, factory visits to see tea processing, and premium tea tasting sessions. We also guide hikes to Little Adam Peak and Ella Rock.',
        phone: '+94775678901',
        email: 'teatrails@mrguide.lk',
        website: 'https://ellateatrails.lk',
        packages: [
          { name: 'Tea Plantation Walk', price: '$15 per person', description: '1.5 hour guided walk through tea fields with plucking experience' },
          { name: 'Factory Tour + Tasting', price: '$20 per person', description: 'See how tea is processed from leaf to cup, with tasting of 6 varieties' },
          { name: 'Full Ella Experience', price: '$60 per person', description: 'Tea tour + Nine Arches Bridge visit + Little Adam Peak hike + lunch' }
        ],
        verified: true,
        is_active: true
      }
    ];

    for (const detailData of authenticDetails) {
      const existing = await AuthenticDetail.findOne({
        where: { place_id: detailData.place_id, user_id: detailData.user_id }
      });
      if (!existing) {
        await AuthenticDetail.create(detailData);
      }
    }

    // --- Return summary ---
    res.status(201).json({
      message: 'Seed data created successfully!',
      summary: {
        users_created: createdUsers.length,
        places_created: createdPlaces.length,
        password_for_all_users: 'Auth@12345'
      },
      places: createdPlaces.map((p, i) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        location: `${p.latitude}, ${p.longitude}`,
        address: p.address,
        authentic_user: authenticUsers[i].username,
        authentic_user_email: authenticUsers[i].email
      })),
      note: 'All 5 authentic users can login with password: Auth@12345. You can edit their profiles and place details after logging in.'
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed data', details: error.message });
  }
});

module.exports = router;
