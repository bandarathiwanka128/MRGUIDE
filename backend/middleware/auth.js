const jwt = require('jsonwebtoken');
const { User } = require('../config/database');

// Read the current account on every request so role changes and blocks take effect
// immediately, including for tokens issued before the change.
const authenticateToken = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ') || !authorization.slice(7).trim()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  let claims;
  try {
    claims = jwt.verify(authorization.slice(7).trim(), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  try {
    const user = await User.findByPk(claims.id, {
      attributes: ['id', 'username', 'role', 'status'],
    });
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }
    req.user = { ...claims, id: user.id, username: user.username, role: user.role };
    return next();
  } catch (error) {
    console.error('Account verification failed:', error.message);
    return res.status(503).json({ error: 'Unable to verify account. Please try again.' });
  }
};

module.exports = authenticateToken;
