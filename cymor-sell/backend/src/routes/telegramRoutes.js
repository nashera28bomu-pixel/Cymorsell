const express = require('express');
const router = express.Router();
const telegram = require('../controllers/telegramController');
const { requireAuth, requireBusiness } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimiters');

router.post('/connect', requireAuth, requireBusiness, telegram.connectBot);
router.get('/status', requireAuth, requireBusiness, telegram.getBotStatus);

// Public webhook endpoints (Telegram calls these directly - no auth, but rate limited)
router.post('/webhook/main', webhookLimiter, telegram.mainWebhook);
router.post('/webhook/business/:botId', webhookLimiter, telegram.businessWebhook);

module.exports = router;
