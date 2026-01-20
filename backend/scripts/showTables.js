const { sequelize, User, AuthenticProfile, Place, AuthenticDetail, Review, Store } = require('../config/database');

async function showTableData() {
  try {
    console.log('\n=== USERS TABLE ===');
    const users = await User.findAll();
    console.table(users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    })));

    console.log('\n=== AUTHENTIC PROFILES TABLE ===');
    const profiles = await AuthenticProfile.findAll();
    console.table(profiles.map(profile => ({
      id: profile.id,
      user_id: profile.user_id,
      title: profile.title,
      business_name: profile.business_name,
      job_title: profile.job_title
    })));

    console.log('\n=== PLACES TABLE ===');
    const places = await Place.findAll();
    console.table(places.map(place => ({
      id: place.id,
      name: place.name,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address
    })));

    console.log('\n=== AUTHENTIC DETAILS TABLE ===');
    const details = await AuthenticDetail.findAll();
    console.table(details.map(detail => ({
      id: detail.id,
      place_id: detail.place_id,
      user_id: detail.user_id,
      detail_type: detail.detail_type,
      title: detail.title,
      verified: detail.verified
    })));

    console.log('\n=== REVIEWS TABLE ===');
    const reviews = await Review.findAll();
    console.table(reviews.map(review => ({
      id: review.id,
      place_id: review.place_id,
      user_id: review.user_id,
      rating: review.rating,
      created_at: review.created_at
    })));

    console.log('\n=== STORES TABLE ===');
    const stores = await Store.findAll();
    console.table(stores.map(store => ({
      id: store.id,
      name: store.name,
      business_type: store.business_type,
      address: store.address,
      rating: store.rating,
      is_verified: store.is_verified,
      owner_id: store.owner_id
    })));

  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await sequelize.close();
  }
}

showTableData();