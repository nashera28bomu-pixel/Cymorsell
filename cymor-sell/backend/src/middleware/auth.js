const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

// Verifies JWT (from HTTP-only cookie or Authorization header) and attaches req.user
async function requireAuth(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Not authenticated' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Ensures the authenticated user actually owns a business, and attaches req.businessId
async function requireBusiness(req, res, next) {
  if (!req.user?.business) {
    return res.status(403).json({ error: 'No business associated with this account' });
  }
  req.businessId = req.user.business.toString();
  next();
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

module.exports = { requireAuth, requireBusiness, signToken };
