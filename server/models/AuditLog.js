const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTER', 'USER_LOGIN', 'USER_LOGIN_FAILED',
      'VOTE_CAST', 'VOTE_ATTEMPTED',
      'ELECTION_CREATED', 'ELECTION_STARTED', 'ELECTION_ENDED',
      'ADMIN_CREATED', 'ADMIN_LOGIN', 'ADMIN_ACTION',
      'FACE_VERIFIED', 'FACE_FAILED',
      'OTP_SENT', 'OTP_VERIFIED', 'OTP_FAILED',
      'EMAIL_VERIFICATION_SENT', 'EMAIL_VERIFIED', 'EMAIL_VERIFICATION_FAILED', 'EMAIL_VERIFICATION_RESENT',
      'VOTER_DELETED',
      'SECURITY_ALERT'
    ]
  },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    userType: { type: String, enum: ['voter', 'super_admin', 'state_admin', 'district_admin'] },
    aadhaarHash: { type: String }  // SHA-256 hashed
  },
  targetResource: {
    type: { type: String },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  details: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  success: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'performedBy.userId': 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
