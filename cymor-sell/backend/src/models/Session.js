const mongoose = require('mongoose');

// Lightweight per-chat conversation state for a business bot (cart, current
// step in checkout, etc). Stored in Mongo (not memory) so it survives
// Render dyno restarts/redeploys.
const sessionSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    chatId: { type: String, required: true },
    state: { type: String, default: 'IDLE' }, // IDLE | BROWSING | CHECKOUT_DELIVERY | CHECKOUT_ADDRESS | CHECKOUT_CONFIRM
    cart: [
      {
        productId: String,
        quantity: Number,
        variation: mongoose.Schema.Types.Mixed,
      },
    ],
    checkout: {
      deliveryMethod: String,
      deliveryZoneId: String,
      deliveryAddress: String,
    },
    lastProductPage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

sessionSchema.index({ business: 1, chatId: 1 }, { unique: true });

module.exports = mongoose.model('Session', sessionSchema);
