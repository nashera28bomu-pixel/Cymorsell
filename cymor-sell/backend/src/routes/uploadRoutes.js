const express = require('express');
const router = express.Router();
const upload = require('../controllers/uploadController');
const { requireAuth, requireBusiness } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.post('/image', requireAuth, requireBusiness, uploadImage.single('image'), upload.uploadGenericImage);

module.exports = router;
