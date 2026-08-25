const express = require('express');
const router = express.Router();
const products = require('../controllers/productController');
const { requireAuth, requireBusiness } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { apiLimiter } = require('../middleware/rateLimiters');

router.use(requireAuth, requireBusiness, apiLimiter);

router.get('/', products.listProducts);
router.post('/', products.createProduct);
router.get('/:id', products.getProduct);
router.patch('/:id', products.updateProduct);
router.delete('/:id', products.deleteProduct);
router.post('/:id/image', uploadImage.single('image'), products.uploadProductImage);

module.exports = router;
