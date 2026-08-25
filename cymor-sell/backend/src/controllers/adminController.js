const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const Business = require('../models/Business');
const User = require('../models/User');
const { Order } = require('../models/Order');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const Customer = require('../models/Customer');
const Broadcast = require('../models/Broadcast');
const SystemSettings = require('../models/SystemSettings');
const ActivityLog = require('../models/ActivityLog');
const ai_requests = require('../utils/aiRequestCounter');

const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 12 * 60 * 60 * 1000,
};

// Server-side-only admin login. Identity is NEVER derived from a Telegram username.
async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ error: 'Admin login is not configured on this server' });
    }
    if (email?.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    const match = await bcrypt.compare(password || '', env.ADMIN_PASSWORD_HASH);
    if (!match) return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = jwt.sign({ sub: 'admin', role: 'admin' }, env.JWT_SECRET, { expiresIn: '12h' });
    res.cookie('adminToken', token, ADMIN_COOKIE_OPTS);
    res.json({ success: true, token });
  } catch (err) {
    next(err);
  }
}

async function adminLogout(req, res) {
  res.clearCookie('adminToken');
  res.json({ success: true });
}

// Aggregate-only. Never returns per-business product/customer/payment detail.
async function getPlatformAnalytics(req, res, next) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [businesses, activeBusinesses, users, ordersToday, ordersMonth, invoiceCount, receiptCount] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ isActive: true, isSetupComplete: true }),
      Customer.distinct('telegramUserId').then((arr) => arr.length),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Invoice.countDocuments(),
      Receipt.countDocuments(),
    ]);

    res.json({
      businesses,
      activeBusinesses,
      telegramUsers: users,
      ordersToday,
      ordersMonth,
      pdfsGenerated: invoiceCount + receiptCount,
      aiRequests: ai_requests.getCount(),
      systemStatus: 'ONLINE',
    });
  } catch (err) {
    next(err);
  }
}

async function createBroadcast(req, res, next) {
  try {
    const { message, target } = req.body;
    if (!message || !['all', 'owners', 'active_owners'].includes(target)) {
      return res.status(400).json({ error: 'message and a valid target are required' });
    }

    let query = {};
    if (target === 'owners') query = { telegramUserId: { $exists: true, $ne: null } };
    if (target === 'active_owners') query = { telegramUserId: { $exists: true, $ne: null }, business: { $ne: null } };

    const recipients = await User.find(query);
    const broadcast = await Broadcast.create({
      message,
      target,
      status: 'sending',
      totalTargeted: recipients.length,
    });

    // Queue-friendly, rate-limited send. For MVP scale we send inline with a small delay;
    // production should move this to a background worker/queue.
    const { sendBroadcastMessage } = require('../telegram/mainBot');
    let success = 0;
    let failure = 0;
    for (const user of recipients) {
      try {
        await sendBroadcastMessage(user.telegramUserId, message);
        success += 1;
      } catch (err) {
        failure += 1;
      }
      await new Promise((r) => setTimeout(r, 50)); // gentle pacing to respect Telegram rate limits
    }

    broadcast.successCount = success;
    broadcast.failureCount = failure;
    broadcast.status = 'completed';
    await broadcast.save();

    res.json({ broadcast });
  } catch (err) {
    next(err);
  }
}

async function listBroadcasts(req, res, next) {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(50);
    res.json({ broadcasts });
  } catch (err) {
    next(err);
  }
}

async function getMaintenance(req, res, next) {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({ maintenanceMode: settings.maintenanceMode, maintenanceMessage: settings.maintenanceMessage });
  } catch (err) {
    next(err);
  }
}

async function setMaintenance(req, res, next) {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    const settings = await SystemSettings.getSettings();
    if (maintenanceMode !== undefined) settings.maintenanceMode = !!maintenanceMode;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;
    await settings.save();
    await ActivityLog.create({ action: 'MAINTENANCE_MODE_CHANGED', meta: { maintenanceMode: settings.maintenanceMode } });
    res.json({ maintenanceMode: settings.maintenanceMode, maintenanceMessage: settings.maintenanceMessage });
  } catch (err) {
    next(err);
  }
}

async function listActivityLogs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      ActivityLog.countDocuments(),
    ]);
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin, adminLogout, getPlatformAnalytics, createBroadcast, listBroadcasts,
  getMaintenance, setMaintenance, listActivityLogs,
};
