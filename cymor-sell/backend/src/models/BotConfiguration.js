const mongoose = require('mongoose');

// Non-secret bot behavior config, separate from the TelegramBot token record.
const botConfigurationSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
    isActive: { type: Boolean, default: false },
    lastMenuVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BotConfiguration', botConfigurationSchema);
