const express = require('express');
const router = express.Router();
const { GuidePayout, GuideTrip, Guide } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// GET /api/payouts/guide/:guideId — guide's payout history
router.get('/guide/:guideId', authenticateToken, async (req, res) => {
  try {
    const guide = await Guide.findByPk(req.params.guideId);
    if (!guide || guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const payouts = await GuidePayout.findAll({
      where: { guide_id: guide.id },
      include: [{ model: GuideTrip }],
      order: [['created_at', 'DESC']]
    });
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

module.exports = router;
