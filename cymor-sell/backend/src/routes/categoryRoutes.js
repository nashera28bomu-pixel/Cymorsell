const express = require('express');
const router = express.Router();
const products = require('../controllers/productController');
const { requireAuth, requireBusiness } = require('../middleware/auth');

router.use(requireAuth, requireBusiness);

router.get('/', products.listCategories);
router.post('/', products.createCategory);
router.delete('/:id', products.deleteCategory);

module.exports = router;
