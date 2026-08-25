const express = require('express');
const router = express.Router();
const analytics = require('../controllers/analyticsController');
const { requireAuth, requireBusiness } = require('../middleware/auth');

router.use(requireAuth, requireBusiness);
router.get('/', analytics.getBusinessAnalytics);

module.exports = router;
