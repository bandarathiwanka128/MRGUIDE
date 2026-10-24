const express = require('express');
const { User, AuthenticDetail, Place, Review, Trip, Store, AuthenticProfile } = require('../../config/database');

const router = express.Router();

// GET /api/admin/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      authenticUsers,
      blockedUsers,
      totalPlaces,
      totalReviews,
      totalTrips,
      totalStores,
      pendingApprovals,
      approvedDetails,
      rejectedDetails,
      authenticProfiles
    ] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'authentic_user' } }),
      User.count({ where: { status: 'blocked' } }),
      Place.count(),
      Review.count(),
      Trip.count(),
      Store.count(),
      AuthenticDetail.count({ where: { verified: false, is_active: true } }),
      AuthenticDetail.count({ where: { verified: true, is_active: true } }),
      AuthenticDetail.count({ where: { is_active: false } }),
      AuthenticProfile.count()
    ]);

    res.json({
      totalUsers,
      authenticUsers,
      blockedUsers,
      totalPlaces,
      totalReviews,
      totalTrips,
      totalStores,
      pendingApprovals,
      approvedDetails,
      rejectedDetails,
      authenticProfiles
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/dashboard/recent
router.get('/recent', async (req, res) => {
  try {
    const [recentUsers, recentReviews, recentPending] = await Promise.all([
      User.findAll({
        order: [['created_at', 'DESC']],
        limit: 5,
        attributes: ['id', 'username', 'email', 'role', 'status', 'created_at']
      }),
      Review.findAll({
        order: [['created_at', 'DESC']],
        limit: 5,
        include: [
          { model: User, attributes: ['username'] },
          { model: Place, attributes: ['name'] }
        ]
      }),
      AuthenticDetail.findAll({
        where: { verified: false, is_active: true },
        order: [['created_at', 'DESC']],
        limit: 5,
        include: [{ model: User, attributes: ['username', 'email'] }]
      })
    ]);

    res.json({ recentUsers, recentReviews, recentPending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
