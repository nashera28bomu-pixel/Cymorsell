const ActivityLog = require('../models/ActivityLog');

async function logActivity({ business, actor, action, meta }) {
  try {
    await ActivityLog.create({ business, actor, action, meta });
  } catch (err) {
    // Never let logging failures break the actual operation.
    console.error('[activityLog] failed to write log:', err.message);
  }
}

module.exports = { logActivity };
