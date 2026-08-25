const { Order } = require('../models/Order');
const orderService = require('../services/orderService');

async function listOrders(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { business: req.businessId };
    if (status) filter.status = status;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page, 10), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, business: req.businessId }).populate('invoice receipt');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// Dashboard-created order (owner manually recording a sale). Bot-created orders
// go through the telegram commerce engine instead.
async function createOrder(req, res, next) {
  try {
    const { customer, items, deliveryMethod, deliveryZoneId, deliveryAddress, notes } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'items are required' });

    const { order } = await orderService.createOrderFromCart({
      businessId: req.businessId,
      customerInput: customer || {},
      items,
      deliveryMethod: deliveryMethod || 'pickup',
      deliveryZoneId,
      deliveryAddress,
      notes,
    });
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

async function confirmPayment(req, res, next) {
  try {
    const { order, receipt } = await orderService.confirmPayment(req.params.id, req.businessId, req.user._id);
    res.json({ order, receipt });
  } catch (err) {
    next(err);
  }
}

async function rejectPayment(req, res, next) {
  try {
    const { reason } = req.body;
    const order = await orderService.rejectPayment(req.params.id, req.businessId, req.user._id, reason);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await orderService.updateStatus(req.params.id, req.businessId, status, req.user._id);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, getOrder, createOrder, confirmPayment, rejectPayment, updateStatus };
