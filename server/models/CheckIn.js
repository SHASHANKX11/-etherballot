const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  voterId: {
    type: String,
    required: false
  },
  voterRegId: {
    type: String,
    required: false
  },
  voterName: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['VERIFIED', 'ALREADY_CHECKED_IN', 'INVALID_QR', 'LOCATION_MISMATCH', 'PENDING_APPROVAL'],
    required: true
  },
  scannedAt: {
    type: Date,
    default: Date.now
  },
  pollingStation: {
    type: String,
    default: 'Government High School, Bangalore'
  },
  assignedStation: {
    type: String,
    default: ''
  },
  officerId: {
    type: String,
    default: 'POL-OFFICER-001'
  },
  officerName: {
    type: String,
    default: 'Presiding Officer'
  },
  ipAddress: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

checkInSchema.index({ voterId: 1, scannedAt: -1 });
checkInSchema.index({ status: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
