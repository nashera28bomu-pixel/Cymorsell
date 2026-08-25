const express = require('express');
const router = express.Router();
const delivery = require('../controllers/deliveryController');
const { requireAuth, requireBusiness } = require('../middleware/auth');

router.use(requireAuth, requireBusiness);

router.get('/', delivery.listZones);
router.post('/', delivery.createZone);
router.patch('/:id', delivery.updateZone);
router.delete('/:id', delivery.deleteZone);

module.exports = router;
