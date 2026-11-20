const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  aadhaarNumber: {
    type: String,
    required: [true, 'Aadhaar number is required'],
    unique: true,
    match: [/^\d{12}$/, 'Aadhaar must be 12 digits']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^\d{10}$/, 'Mobile must be 10 digits']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  address: {
    state: { type: String, required: true },
    district: { type: String, required: true },
    pincode: { type: String },
    addressLine: { type: String },
    constituency: { type: String }
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    constituency: { type: String, default: null },
    pollingStation: { type: String, default: null },
    detectedAt: { type: Date, default: null }
  },
  faceDescriptor: {
    type: [Number],  // 128-dimensional face descriptor array from face-api.js
    required: [true, 'Face data is required for registration']
  },
  faceImageHash: {
    type: String  // SHA-256 hash of face image for integrity
  },
  walletAddress: {
    type: String,
    default: null
  },
  hasVoted: {
    type: Map,
    of: Boolean,
    default: {}
  },
  otpSecret: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // role: 'user' = standard voter, 'admin' = admin voter, 'voter' kept for backward compat
  role: {
    type: String,
    enum: ['voter', 'user', 'admin'],
    default: 'user'
  },

  // --- Voter ID (assigned after email verify) ---
  voterId: {
    type: String,
    unique: true,
    sparse: true
  },

  // --- Voter Registration ID (e.g. EBV2025110001) ---
  voterRegId: {
    type: String,
    unique: true,
    sparse: true
  },

  // --- Approval & Status ---
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  checkInStatus: {
    type: String,
    enum: ['not_checked_in', 'checked_in'],
    default: 'not_checked_in'
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedInStation: {
    type: String,
    default: null
  },

  // --- Polling Station & Constituency Details ---
  assignedPollingStation: {
    type: String,
    default: 'Government High School, Bangalore'
  },
  pollingStationAddress: {
    type: String,
    default: 'Bangalore Central, Karnataka'
  },
  constituency: {
    type: String,
    default: 'Karnataka - Bangalore Central'
  },

  // --- QR token (single-use signed token for QR login & polling check-in) ---
  qrToken: {
    type: String,
    default: null
  },
  qrTokenExpiry: {
    type: Date,
    default: null
  },
  qrTokenUsed: {
    type: Boolean,
    default: false
  },
  qrTokenRevoked: {
    type: Boolean,
    default: false
  },
  totalScans: {
    type: Number,
    default: 0
  },
  lastScannedAt: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ mobile: 1 });
userSchema.index({ email: 1 });
userSchema.index({ voterId: 1 });
userSchema.index({ 'address.state': 1, 'address.district': 1 });

// Generate sequential voter ID: EB-YYYY-NNNNNN
userSchema.statics.generateVoterId = async function() {
  const year = new Date().getFullYear();
  const prefix = `EB-${year}-`;
  const count = await this.countDocuments({ voterId: { $regex: `^${prefix}` } });
  const seq = String(count + 1).padStart(6, '0');
  return `${prefix}${seq}`;
};

// Generate Voter Registration ID: EBV{YEAR}{SEQUENCE}
userSchema.statics.generateVoterRegId = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments();
  const seq = String(count + 1).padStart(6, '0');
  return `EBV${year}${seq}`;
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
    return;
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 min lock
  }
  await this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function() {
  await this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

module.exports = mongoose.model('User', userSchema);
