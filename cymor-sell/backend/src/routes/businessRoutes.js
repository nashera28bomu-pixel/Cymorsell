const express = require('express');
const router = express.Router();
const business = require('../controllers/businessController');
const { requireAuth, requireBusiness } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.post('/', requireAuth, business.createBusiness);
router.get('/me', requireAuth, requireBusiness, business.getMyBusiness);
router.patch('/me', requireAuth, requireBusiness, business.updateBusiness);
router.post('/me/logo', requireAuth, requireBusiness, uploadImage.single('logo'), business.updateLogo);

module.exports = router;
