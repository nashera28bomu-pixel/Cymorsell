const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { logActivity } = require('../services/activityLogService');

async function listProducts(req, res, next) {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = { business: req.businessId };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Product.find(filter).populate('category').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Product.countDocuments(filter),
    ]);

    res.json({ items, total, page: parseInt(page, 10), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ _id: req.params.id, business: req.businessId }).populate('category');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, description, category, price, stock, sku, variations } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'name and price are required' });

    const product = await Product.create({
      business: req.businessId,
      name,
      description,
      category: category || undefined,
      price,
      stock: stock || 0,
      sku,
      variations: variations || [],
    });

    await logActivity({ business: req.businessId, actor: req.user._id, action: 'PRODUCT_ADDED', meta: { productId: product._id } });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const allowed = ['name', 'description', 'category', 'price', 'stock', 'sku', 'variations', 'isActive'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    const product = await Product.findOneAndUpdate({ _id: req.params.id, business: req.businessId }, updates, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, business: req.businessId });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.image?.publicId) await deleteFromCloudinary(product.image.publicId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function uploadProductImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const product = await Product.findOne({ _id: req.params.id, business: req.businessId });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.image?.publicId) await deleteFromCloudinary(product.image.publicId);
    const result = await uploadBufferToCloudinary(req.file.buffer, 'products');
    product.image = { url: result.secure_url, publicId: result.public_id };
    await product.save();

    res.json({ product });
  } catch (err) {
    next(err);
  }
}

// Categories

async function listCategories(req, res, next) {
  try {
    const categories = await Category.find({ business: req.businessId }).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const category = await Category.create({ business: req.businessId, name });
    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Category already exists' });
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, business: req.businessId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct, uploadProductImage,
  listCategories, createCategory, deleteCategory,
};
