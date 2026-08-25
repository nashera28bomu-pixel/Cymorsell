const User = require('../models/User');
const Business = require('../models/Business');
const { signToken } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogService');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTS);
    await logActivity({ actor: user._id, action: 'USER_REGISTERED' });
    res.status(201).json({ user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: user.toSafeObject(), token });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie('token');
  res.json({ success: true });
}

async function me(req, res) {
  let business = null;
  if (req.user.business) {
    business = await Business.findById(req.user.business);
  }
  res.json({ user: req.user.toSafeObject(), business });
}

// Generates a short-lived link token used when redirecting from the management
// Telegram bot to the web dashboard, so no long-lived credential travels in a URL.
async function createTelegramLinkToken(req, res, next) {
  try {
    const jwt = require('jsonwebtoken');
    const env = require('../config/env');
    const token = jwt.sign({ sub: req.user._id.toString(), purpose: 'telegram-link' }, env.LINK_TOKEN_SECRET, {
      expiresIn: '10m',
    });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me, createTelegramLinkToken };
