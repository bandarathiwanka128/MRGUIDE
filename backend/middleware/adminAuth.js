const authenticateToken = require('./auth');

module.exports = (req, res, next) => authenticateToken(req, res, () => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
});
