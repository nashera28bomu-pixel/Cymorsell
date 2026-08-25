const mongoose = require('mongoose');

// Singleton document (one row) holding platform-wide settings.
const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'singleton', unique: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: 'We are performing scheduled maintenance. Please check back shortly.',
    },
  },
  { timestamps: true }
);

systemSettingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne({ key: 'singleton' });
  if (!doc) doc = await this.create({ key: 'singleton' });
  return doc;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
