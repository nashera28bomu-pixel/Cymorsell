const express = require('express');
const router = express.Router();
const customers = require('../controllers/customerController');
const { requireAuth, requireBusiness } = require('../middleware/auth');

router.use(requireAuth, requireBusiness);
router.get('/', customers.listCustomers);

module.exports = router;
