const express = require('express');
const router = express.Router();
const orders = require('../controllers/orderController');
const { requireAuth, requireBusiness } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiters');

router.use(requireAuth, requireBusiness, apiLimiter);

router.get('/', orders.listOrders);
router.post('/', orders.createOrder);
router.get('/:id', orders.getOrder);
router.post('/:id/confirm-payment', orders.confirmPayment);
router.post('/:id/reject-payment', orders.rejectPayment);
router.patch('/:id/status', orders.updateStatus);

module.exports = router;
