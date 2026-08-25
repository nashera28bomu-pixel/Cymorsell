const Customer = require('../models/Customer');

async function listCustomers(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Customer.find({ business: req.businessId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Customer.countDocuments({ business: req.businessId }),
    ]);
    res.json({ items, total, page: parseInt(page, 10), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCustomers };
