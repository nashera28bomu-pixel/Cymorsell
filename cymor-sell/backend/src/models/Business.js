const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    logo: {
      url: String,
      publicId: String,
    },
    phone: String,
    email: String,
    location: String,
    address: String,
    openingHours: String,
    telegramContact: String,
    website: String,
    socialLinks: [String],

    setupStep: { type: Number, default: 1 }, // 1..6, 7 = complete
    isSetupComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    salesAgent: {
      greeting: { type: String, default: 'Welcome! How can I help you today?' },
      welcomeMessage: { type: String, default: '' },
      botDescription: { type: String, default: '' },
      faq: [{ question: String, answer: String }],
      policies: { type: String, default: '' },
      tone: { type: String, default: 'friendly' },
      suggestedMenuItems: [String],
    },

    invoiceBranding: {
      footerMessage: { type: String, default: 'Thank you for your business!' },
      terms: { type: String, default: '' },
      primaryColor: { type: String, default: '#2563eb' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
