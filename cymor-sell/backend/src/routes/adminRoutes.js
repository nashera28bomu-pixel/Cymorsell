const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');
const { authLimiter, broadcastLimiter } = require('../middleware/rateLimiters');

router.post('/login', authLimiter, admin.adminLogin);
router.post('/logout', admin.adminLogout);

router.get('/analytics', requireAdmin, admin.getPlatformAnalytics);
router.get('/broadcasts', requireAdmin, admin.listBroadcasts);
router.post('/broadcasts', requireAdmin, broadcastLimiter, admin.createBroadcast);
router.get('/maintenance', requireAdmin, admin.getMaintenance);
router.patch('/maintenance', requireAdmin, admin.setMaintenance);
router.get('/activity-logs', requireAdmin, admin.listActivityLogs);

module.exports = router;
