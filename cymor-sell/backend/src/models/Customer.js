const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    telegramUserId: { type: String, required: true, index: true },
    telegramUsername: String,
    name: String,
    phone: String,
    defaultAddress: String,
    ordersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

customerSchema.index({ business: 1, telegramUserId: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
