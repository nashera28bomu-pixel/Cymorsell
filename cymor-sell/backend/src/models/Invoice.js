const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    file: {
      url: String,
      publicId: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
