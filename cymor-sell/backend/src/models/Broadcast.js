const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    target: { type: String, enum: ['all', 'owners', 'active_owners'], required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'sending', 'completed', 'failed'], default: 'pending' },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    totalTargeted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Broadcast', broadcastSchema);
