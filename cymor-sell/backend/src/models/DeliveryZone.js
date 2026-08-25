const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true },
    fee: { type: Number, required: true, min: 0 },
    estimatedTime: { type: String, default: '' },
    isPickup: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);
