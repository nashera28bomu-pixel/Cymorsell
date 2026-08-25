const mongoose = require('mongoose');

// Stores the sensitive bot token. Never serialize `token` back to the frontend.
const telegramBotSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
    botUsername: { type: String, required: true, unique: true, index: true },
    token: { type: String, required: true, select: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    webhookSet: { type: Boolean, default: false },
    lastError: String,
  },
  { timestamps: true }
);

telegramBotSchema.methods.toPublicObject = function () {
  return {
    id: this._id,
    business: this.business,
    botUsername: this.botUsername,
    isVerified: this.isVerified,
    isActive: this.isActive,
    webhookSet: this.webhookSet,
  };
};

module.exports = mongoose.model('TelegramBot', telegramBotSchema);
