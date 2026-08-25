const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    receiptNumber: { type: String, required: true, unique: true },
    file: {
      url: String,
      publicId: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
