const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, trim: true },
    image: {
      url: String,
      publicId: String,
    },
    variations: [
      {
        type: { type: String }, // e.g. "size", "color"
        options: [String],
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ business: 1, sku: 1 });
productSchema.index({ business: 1, name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
