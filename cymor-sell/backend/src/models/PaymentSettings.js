const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
    mpesaNumber: String,
    mpesaName: String,
    bankName: String,
    bankAccountName: String,
    bankAccountNumber: String,
    otherInstructions: String,
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
