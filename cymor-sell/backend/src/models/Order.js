const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAYMENT_VERIFICATION',
  'PAID',
  'PAYMENT_REJECTED',
  'PROCESSING',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // snapshot at time of order
    unitPrice: { type: Number, required: true }, // snapshot - never trust client price on reorder
    quantity: { type: Number, required: true, min: 1 },
    variation: { type: mongoose.Schema.Types.Mixed },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true }, // CYM-xxxx
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerSnapshot: {
      name: String,
      telegramUserId: String,
      telegramUsername: String,
      phone: String,
    },
    items: [orderItemSchema],
    deliveryMethod: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
    deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },
    deliveryZoneName: String,
    deliveryFee: { type: Number, default: 0 },
    deliveryAddress: String,
    notes: String,

    itemsTotal: { type: Number, required: true },
    total: { type: Number, required: true },

    status: { type: String, enum: ORDER_STATUSES, default: 'AWAITING_PAYMENT', index: true },
    paymentMethod: { type: String, default: 'manual' },
    paymentConfirmedAt: Date,
    paymentRejectedAt: Date,
    paymentRejectionReason: String,

    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    receipt: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },
  },
  { timestamps: true }
);

orderSchema.index({ business: 1, createdAt: -1 });
orderSchema.index({ business: 1, status: 1 });

module.exports = { Order: mongoose.model('Order', orderSchema), ORDER_STATUSES };
