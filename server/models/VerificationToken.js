const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index: automatically deleted by MongoDB when expired
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

verificationTokenSchema.index({ userId: 1 });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
