const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceReceiptController');
const { requireAuth, requireBusiness } = require('../middleware/auth');

router.use(requireAuth, requireBusiness);
router.get('/:id', ctrl.getReceipt);

module.exports = router;
