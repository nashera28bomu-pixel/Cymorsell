const { Order } = require('../models/Order');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const Business = require('../models/Business');
const PaymentSettings = require('../models/PaymentSettings');
const { calculateCart } = require('./cartService');
const { generateOrderNumber, generateInvoiceNumber, generateReceiptNumber } = require('./orderNumberService');
const { uploadBufferToCloudinary } = require('./uploadService');
const { generateInvoice } = require('../pdf/invoiceGenerator');
const { generateReceipt } = require('../pdf/receiptGenerator');
const { logActivity } = require('./activityLogService');
const Product = require('../models/Product');

/**
 * Creates an order from a confirmed cart. Recomputes everything server-side —
 * the caller's prices/totals (if any) are ignored.
 */
async function createOrderFromCart({ businessId, customerInput, items, deliveryMethod, deliveryZoneId, deliveryAddress, notes }) {
  const cart = await calculateCart({ businessId, items, deliveryZoneId, deliveryMethod });

  // decrement stock
  for (const line of cart.lineItems) {
    await Product.updateOne({ _id: line.product, business: businessId }, { $inc: { stock: -line.quantity } });
  }

  const customer = await Customer.findOneAndUpdate(
    { business: businessId, telegramUserId: customerInput.telegramUserId },
    {
      $set: {
        telegramUsername: customerInput.telegramUsername,
        name: customerInput.name,
        phone: customerInput.phone,
        defaultAddress: deliveryAddress,
      },
      $setOnInsert: { business: businessId, telegramUserId: customerInput.telegramUserId },
    },
    { upsert: true, new: true }
  );

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    business: businessId,
    orderNumber,
    customer: customer._id,
    customerSnapshot: {
      name: customerInput.name,
      telegramUserId: customerInput.telegramUserId,
      telegramUsername: customerInput.telegramUsername,
      phone: customerInput.phone,
    },
    items: cart.lineItems,
    deliveryMethod,
    deliveryZone: deliveryMethod === 'delivery' ? deliveryZoneId : undefined,
    deliveryZoneName: cart.deliveryZoneName,
    deliveryFee: cart.deliveryFee,
    deliveryAddress,
    notes,
    itemsTotal: cart.itemsTotal,
    total: cart.total,
    status: 'AWAITING_PAYMENT',
  });

  await Customer.updateOne({ _id: customer._id }, { $inc: { ordersCount: 1 } });

  // Generate invoice (PENDING) immediately, reusable file.
  const business = await Business.findById(businessId);
  const paymentSettings = await PaymentSettings.findOne({ business: businessId });
  const invoiceNumber = await generateInvoiceNumber();
  const pdfBuffer = await generateInvoice({ ...order.toObject(), invoiceNumber }, business, paymentSettings);
  const uploadResult = await uploadBufferToCloudinary(pdfBuffer, 'invoices', 'raw');

  const invoice = await Invoice.create({
    business: businessId,
    order: order._id,
    invoiceNumber,
    status: 'PENDING',
    file: { url: uploadResult.secure_url, publicId: uploadResult.public_id },
  });

  order.invoice = invoice._id;
  await order.save();

  await logActivity({ business: businessId, action: 'ORDER_CREATED', meta: { orderId: order._id, orderNumber } });

  return { order, invoice };
}

async function markAwaitingVerification(orderId, businessId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, business: businessId, status: 'AWAITING_PAYMENT' },
    { status: 'PAYMENT_VERIFICATION' },
    { new: true }
  );
  return order;
}

/**
 * Only a business owner can call this (enforced at the route/controller level).
 * A customer message of "I've paid" must never reach this function directly.
 */
async function confirmPayment(orderId, businessId, actorUserId) {
  const order = await Order.findOne({ _id: orderId, business: businessId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  if (order.status === 'PAID') return order;

  order.status = 'PAID';
  order.paymentConfirmedAt = new Date();
  await order.save();

  const business = await Business.findById(businessId);
  const receiptNumber = await generateReceiptNumber();
  const pdfBuffer = await generateReceipt({ ...order.toObject(), receiptNumber }, business);
  const uploadResult = await uploadBufferToCloudinary(pdfBuffer, 'receipts', 'raw');

  const receipt = await Receipt.create({
    business: businessId,
    order: order._id,
    receiptNumber,
    file: { url: uploadResult.secure_url, publicId: uploadResult.public_id },
  });

  order.receipt = receipt._id;
  await order.save();

  await Invoice.updateOne({ _id: order.invoice }, { status: 'PAID' });
  await Customer.updateOne({ _id: order.customer }, { $inc: { totalSpent: order.total } });

  await logActivity({ business: businessId, actor: actorUserId, action: 'PAYMENT_CONFIRMED', meta: { orderId } });

  return { order, receipt };
}

async function rejectPayment(orderId, businessId, actorUserId, reason) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, business: businessId },
    { status: 'PAYMENT_REJECTED', paymentRejectedAt: new Date(), paymentRejectionReason: reason },
    { new: true }
  );
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  await logActivity({ business: businessId, actor: actorUserId, action: 'PAYMENT_REJECTED', meta: { orderId } });
  return order;
}

async function updateStatus(orderId, businessId, status, actorUserId) {
  const { ORDER_STATUSES } = require('../models/Order');
  if (!ORDER_STATUSES.includes(status)) {
    const err = new Error('Invalid order status');
    err.status = 400;
    throw err;
  }
  const order = await Order.findOneAndUpdate({ _id: orderId, business: businessId }, { status }, { new: true });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  await logActivity({ business: businessId, actor: actorUserId, action: 'ORDER_STATUS_UPDATED', meta: { orderId, status } });
  return order;
}

module.exports = { createOrderFromCart, markAwaitingVerification, confirmPayment, rejectPayment, updateStatus };
