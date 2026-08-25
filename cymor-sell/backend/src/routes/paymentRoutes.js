const express = require('express');
const router = express.Router();
const payment = require('../controllers/paymentController');
const { requireAuth, requireBusiness } = require('../middleware/auth');

router.use(requireAuth, requireBusiness);

router.get('/', payment.getSettings);
router.patch('/', payment.updateSettings);

module.exports = router;
