const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Separate admin session check. Admin identity is server-side only (env-configured),
// never inferred from a Telegram username.
function requireAdmin(req, res, next) {
  try {
    const token =
      req.cookies?.adminToken ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'Admin authentication required' });

    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    req.admin = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

module.exports = { requireAdmin };
