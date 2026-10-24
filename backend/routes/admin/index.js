const express = require('express');
const adminAuth = require('../../middleware/adminAuth');
const router = express.Router();

// This gate covers every admin API, including future routes.
router.use(adminAuth);
router.use((req, res, next) => {
  for (const key of ['page', 'limit']) {
    const value = req.query[key];
    if (value !== undefined && (!/^\d+$/.test(value) || Number(value) < 1 ||
      Number(value) > (key === 'limit' ? 100 : 100000))) {
      return res.status(400).json({ error: `Invalid ${key}` });
    }
  }
  next();
});
router.get('/auth/me', (req, res) => res.json(req.user));
router.use('/dashboard', require('./dashboard'));
router.use('/users', require('./users'));
router.use('/authentic-details', require('./authenticDetails'));
router.use('/places', require('./places'));
router.use('/reviews', require('./reviews'));
router.use('/trips', require('./trips'));
router.use('/stores', require('./stores'));
router.use('/guides', require('./guides'));

module.exports = router;
