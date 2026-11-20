const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const AuditLog = require('../models/AuditLog');
const { protect, generateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendOtpEmail } = require('../services/emailService');

// Simulated OTP store (in production, use Redis or similar)
const otpStore = new Map();

// ═══════════════════════════════════════════
//  AADHAAR VALIDATION (SIMULATED)
// ═══════════════════════════════════════════

// POST /api/auth/validate-aadhaar
router.post('/validate-aadhaar', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number. Must be 12 digits.'
      });
    }

    // Check if already registered
    const existingUser = await User.findOne({ aadhaarNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This Aadhaar number is already registered.',
        alreadyRegistered: true
      });
    }

    // Simulate Aadhaar validation (in production, call UIDAI API)
    const simulatedData = {
      valid: true,
      name: 'Verified Citizen',
      aadhaarLast4: aadhaarNumber.slice(-4)
    };

    res.json({
      success: true,
      message: 'Aadhaar number validated successfully',
      data: simulatedData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  OTP MANAGEMENT
// ═══════════════════════════════════════════

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email, mobile } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address or mobile number.'
      });
    }

    // Generate 6-digit verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const OTP_TTL = 10 * 60 * 1000;   // 10 minutes
    const RESEND_COOLDOWN = 60 * 1000; // 60 seconds

    // Primary: Email verification code
    if (email) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format.'
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // 60-second resend cooldown
      const existing = otpStore.get(normalizedEmail);
      if (existing && existing.resendAt && Date.now() < existing.resendAt) {
        const wait = Math.ceil((existing.resendAt - Date.now()) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${wait}s before requesting a new code.`,
          retryAfter: wait
        });
      }

      otpStore.set(normalizedEmail, {
        otp,
        expiry: Date.now() + OTP_TTL,
        resendAt: Date.now() + RESEND_COOLDOWN,
        attempts: 0
      });

      // Try to find user name if exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      const recipientName = existingUser ? existingUser.name : 'Citizen';

      let emailSent = false;
      let emailError = null;
      try {
        await sendOtpEmail({
          to: normalizedEmail,
          name: recipientName,
          otp
        });
        emailSent = true;
      } catch (err) {
        console.error(`❌ Failed to send OTP email to ${normalizedEmail}:`, err.message);
        emailError = err.message;
      }

      return res.json({
        success: true,
        message: emailSent
          ? `Verification code dispatched to ${normalizedEmail}`
          : `Verification code generated. (Email delivery error: ${emailError})`,
        emailSent,
        // Include OTP in dev mode for testing
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

    // Fallback: Mobile verification code (if mobile explicitly requested)
    if (mobile) {
      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number. Must be 10 digits.'
        });
      }

      otpStore.set(mobile, {
        otp,
        expiry: Date.now() + OTP_TTL,
        resendAt: Date.now() + RESEND_COOLDOWN,
        attempts: 0
      });

      console.log(`📱 OTP for ${mobile}: ${otp}`);

      return res.json({
        success: true,
        message: 'OTP sent successfully',
        // Include OTP in dev mode for testing
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, mobile, otp } = req.body;

    const targetKey = email ? email.toLowerCase().trim() : mobile;

    if (!targetKey) {
      return res.status(400).json({
        success: false,
        message: 'Email address or mobile number is required'
      });
    }

    const stored = otpStore.get(targetKey);
    if (!stored) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found. Please request a new code.'
      });
    }

    if (Date.now() > stored.expiry) {
      otpStore.delete(targetKey);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    if (stored.attempts >= 3) {
      otpStore.delete(targetKey);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.'
      });
    }

    if (stored.otp !== String(otp).trim()) {
      stored.attempts++;
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // OTP verified
    otpStore.delete(targetKey);

    // If verified by email, update emailVerified in DB if user exists
    if (email) {
      await User.updateOne({ email: targetKey }, { emailVerified: true });
    }

    await AuditLog.create({
      action: 'OTP_VERIFIED',
      performedBy: { userType: 'voter' },
      details: `Verification code confirmed for: ${email ? targetKey : `mobile ...${mobile.slice(-4)}`}`,
      success: true
    });

    res.json({
      success: true,
      message: 'Verification code confirmed successfully',
      verified: true
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  REGISTRATION
// ═══════════════════════════════════════════

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      aadhaarNumber, name, email, mobile,
      dateOfBirth, gender, state, district,
      pincode, addressLine, faceDescriptor,
      constituency, location, latitude, longitude, pollingStation
    } = req.body;

    // Validations
    if (!aadhaarNumber || !name || !email || !mobile || !dateOfBirth || !gender || !state || !district) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields (including email)'
      });
    }

    // Input length and format validation
    if (name && name.length > 100) {
      return res.status(400).json({ success: false, message: 'Name is too long' });
    }
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Valid face data (128-dimensional descriptor) is required for registration'
      });
    }

    // Validate face descriptor values are within expected range
    const isValidDescriptor = faceDescriptor.every(v => typeof v === 'number' && !isNaN(v) && v >= -1 && v <= 1);
    if (!isValidDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'Face data contains invalid values'
      });
    }

    // Check for duplicate
    const existingUser = await User.findOne({
      $or: [{ aadhaarNumber }, { mobile }, { email: email.toLowerCase().trim() }]
    });

    if (existingUser) {
      let duplicateMsg = 'Aadhaar already registered';
      if (existingUser.mobile === mobile) duplicateMsg = 'Mobile number already registered';
      if (existingUser.email === email.toLowerCase().trim()) duplicateMsg = 'Email address is already registered';
      return res.status(400).json({
        success: false,
        message: duplicateMsg
      });
    }

    // Create face image hash for integrity
    const faceImageHash = CryptoJS.SHA256(JSON.stringify(faceDescriptor)).toString();

    // Generate unique sequential voterId
    const voterId = await User.generateVoterId();

    // Prepare location details
    const locLat = location?.lat || location?.latitude || (typeof latitude === 'number' ? latitude : null);
    const locLng = location?.lng || location?.longitude || (typeof longitude === 'number' ? longitude : null);
    const resolvedConstituency = constituency || addressLine?.constituency || `${district} Central Assembly Constituency`;
    const resolvedStation = pollingStation || `Polling Station #42, ${district} Civic Center`;

    const user = await User.create({
      aadhaarNumber,
      name,
      email: email.toLowerCase().trim(),
      emailVerified: false,
      mobile,
      dateOfBirth,
      gender,
      address: {
        state,
        district,
        pincode,
        addressLine,
        constituency: resolvedConstituency
      },
      location: {
        latitude: locLat,
        longitude: locLng,
        constituency: resolvedConstituency,
        pollingStation: resolvedStation,
        detectedAt: new Date()
      },
      faceDescriptor,
      faceImageHash,
      isVerified: false,
      role: 'user',
      voterId
    });

    // Generate signed single-use QR token (JWT, 30-day validity)
    const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
    const jwt = require('jsonwebtoken');
    const qrPayload = { sub: user._id.toString(), type: 'qr_login', voterId: user.voterId };
    const qrToken = jwt.sign(qrPayload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '30d' });
    user.qrToken = qrToken;
    user.qrTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.qrTokenUsed = false;
    await user.save({ validateModifiedOnly: true });

    // Generate cryptographically secure random verification token (32 bytes = 64 hex characters)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save hashed token
    await VerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    // Send real verification email with the raw token
    let emailDispatched = true;
    let emailPreviewUrl = null;
    try {
      const emailResult = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: rawVerificationToken
      });
      emailPreviewUrl = emailResult?.previewUrl;

      await AuditLog.create({
        action: 'EMAIL_VERIFICATION_SENT',
        performedBy: { userId: user._id, userType: 'voter' },
        details: `Verification email dispatched to ${user.email}`,
        success: true
      });
    } catch (mailErr) {
      console.error('❌ Failed to dispatch verification email:', mailErr.message);
      emailDispatched = false;
      await AuditLog.create({
        action: 'EMAIL_VERIFICATION_FAILED',
        performedBy: { userId: user._id, userType: 'voter' },
        details: `Email dispatch failed: ${mailErr.message}`,
        success: false
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, 'voter');

    await AuditLog.create({
      action: 'USER_REGISTER',
      performedBy: { userId: user._id, userType: 'voter' },
      details: `New voter registered: ${name}`,
      success: true
    });

    res.status(201).json({
      success: true,
      message: emailDispatched
        ? 'Registration successful! A verification email has been sent to your inbox.'
        : 'Registration completed, but verification email could not be sent. Please click resend verification.',
      token,
      emailDispatched,
      emailPreviewUrl, // Provided in development/Ethereal mode for convenience
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        voterId: user.voterId,
        qrToken: user.qrToken,
        aadhaarLast4: user.aadhaarNumber.slice(-4),
        mobile: user.mobile,
        state: user.address.state,
        district: user.address.district,
        constituency: user.address.constituency,
        location: user.location,
        role: 'voter'
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry detected. User may already be registered.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { aadhaarNumber, voterId, qrToken } = req.body;
    let identifier = (aadhaarNumber || voterId || qrToken || '').toString().trim();

    // If identifier is JSON string from QR scan
    if (identifier.startsWith('{')) {
      try {
        const parsed = JSON.parse(identifier);
        identifier = parsed.voterId || parsed.voterRegId || parsed.qrToken || parsed.token || identifier;
      } catch {}
    }

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number or Voter ID QR code is required'
      });
    }

    let user = null;
    if (/^\d{12}$/.test(identifier)) {
      user = await User.findOne({ aadhaarNumber: identifier });
    } else if (identifier.startsWith('EB')) {
      user = await User.findOne({
        $or: [{ voterId: identifier.toUpperCase() }, { voterRegId: identifier.toUpperCase() }]
      });
    } else {
      // Try JWT or stored qrToken
      const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(identifier, JWT_SECRET);
        user = await User.findById(decoded.sub || decoded.id);
      } catch {
        user = await User.findOne({ qrToken: identifier });
      }
    }

    // Alias fallback for demo accounts
    if (!user && (identifier.includes('EBV2025110001') || identifier.includes('EB-2026-000142') || identifier.toLowerCase().includes('shashank'))) {
      user = await User.findOne({ $or: [{ voterId: 'EB-2026-000001' }, { name: /Shashank/i }] });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No voter account found with this identifier'
      });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many attempts. Try again later.'
      });
    }

    // Check if voter account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Mask mobile: show first 2 and last 2 digits only
    const maskedMobile = user.mobile.slice(0, 2) + '******' + user.mobile.slice(-2);

    // Return user info for next steps (OTP + face verification)
    res.json({
      success: true,
      message: 'Aadhaar verified. Please complete OTP and face verification.',
      userId: user._id,
      mobile: maskedMobile,
      // Provide raw mobile in development for automatic pre-fill/ease of testing
      ...(process.env.NODE_ENV === 'development' && { rawMobile: user.mobile }),
      name: user.name,
      requiresOTP: true,
      requiresFace: true,
      email: user.email ? (user.email.slice(0, 2) + '***@' + user.email.split('@')[1]) : null,
      rawEmail: user.email,
      emailVerified: !!user.emailVerified
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login/verify-face
router.post('/login/verify-face', async (req, res) => {
  try {
    const { userId, faceDescriptor } = req.body;

    if (!userId || !faceDescriptor) {
      return res.status(400).json({
        success: false,
        message: 'User ID and face data are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Compare face descriptors: calculate Euclidean distance
    const storedDescriptor = user.faceDescriptor;
    if (!storedDescriptor || storedDescriptor.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No face data on record. Please re-register.'
      });
    }

    // Calculate Euclidean distance between descriptors
    let distance = 0;
    for (let i = 0; i < storedDescriptor.length; i++) {
      const diff = (faceDescriptor[i] || 0) - storedDescriptor[i];
      distance += diff * diff;
    }
    distance = Math.sqrt(distance);

    // Threshold for face match (face-api.js typically uses 0.6)
    const MATCH_THRESHOLD = 0.6;
    const isDemoBypass = process.env.NODE_ENV === 'development' && req.body.isDemoBypass === true;
    const isMatch = isDemoBypass || (distance < MATCH_THRESHOLD);

    if (!isMatch) {
      await user.incrementLoginAttempts();
      
      await AuditLog.create({
        action: 'FACE_FAILED',
        performedBy: { userId: user._id, userType: 'voter' },
        details: `Face verification failed. Distance: ${distance.toFixed(4)}`,
        success: false
      });

      return res.status(401).json({
        success: false,
        message: 'Face verification failed. Please try again.'
      });
    }

    // Face matched — generate token
    await user.resetLoginAttempts();
    const token = generateToken(user._id, 'voter');

    await AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: { userId: user._id, userType: 'voter' },
      details: `Voter logged in successfully. Face distance: ${distance.toFixed(4)}`,
      success: true
    });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        aadhaarLast4: user.aadhaarNumber.slice(-4),
        mobile: user.mobile,
        state: user.address.state,
        district: user.address.district,
        role: 'voter'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    let userData;
    if (req.userRole === 'voter' || req.userRole === 'user' || req.userRole === 'admin') {
      userData = await User.findById(req.user._id).select('-faceDescriptor');
    } else {
      userData = req.user;
    }

    res.json({
      success: true,
      user: userData,
      role: req.userRole
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  EMAIL VERIFICATION ENDPOINTS
// ═══════════════════════════════════════════

// GET /api/auth/verify-email?token=...
// Browser link verification handler with redirection
router.get('/verify-email', async (req, res) => {
  const clientUrl = process.env.APP_URL || (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:5173');
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.redirect(`${clientUrl}/verify-email?status=invalid&message=${encodeURIComponent('Missing or malformed verification token')}`);
    }

    // 1. Compute SHA-256 hash of raw token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find matching verification record
    const record = await VerificationToken.findOne({ tokenHash });
    if (!record) {
      await AuditLog.create({
        action: 'EMAIL_VERIFICATION_FAILED',
        performedBy: { userType: 'voter' },
        details: 'Verification failed: token not found or already consumed',
        success: false
      });
      return res.redirect(`${clientUrl}/verify-email?status=expired&message=${encodeURIComponent('Verification link is invalid or has already been used.')}`);
    }

    // 3. Check expiration
    if (new Date() > record.expiresAt) {
      await VerificationToken.deleteOne({ _id: record._id });
      await AuditLog.create({
        action: 'EMAIL_VERIFICATION_FAILED',
        performedBy: { userId: record.userId, userType: 'voter' },
        details: 'Verification failed: token expired',
        success: false
      });
      return res.redirect(`${clientUrl}/verify-email?status=expired&message=${encodeURIComponent('Verification link has expired after 30 minutes. Please request a new one.')}`);
    }

    // 4. Find user and mark verified
    const user = await User.findById(record.userId);
    if (!user) {
      await VerificationToken.deleteOne({ _id: record._id });
      return res.redirect(`${clientUrl}/verify-email?status=invalid&message=${encodeURIComponent('User account not found')}`);
    }

    if (user.emailVerified) {
      // Invalidate token regardless
      await VerificationToken.deleteOne({ _id: record._id });
      return res.redirect(`${clientUrl}/verify-email?status=already-verified&message=${encodeURIComponent('Your email is already verified. You can proceed directly to voting.')}`);
    }

    user.emailVerified = true;
    await user.save({ validateModifiedOnly: true });

    // 5. Invalidate token permanently (Single-use guarantee)
    await VerificationToken.deleteOne({ _id: record._id });

    await AuditLog.create({
      action: 'EMAIL_VERIFIED',
      performedBy: { userId: user._id, userType: 'voter' },
      details: `Email successfully verified for ${user.email}`,
      success: true
    });

    return res.redirect(`${clientUrl}/verify-email?status=success&email=${encodeURIComponent(user.email)}`);
  } catch (error) {
    console.error('❌ Error during GET /verify-email:', error.message);
    return res.redirect(`${clientUrl}/verify-email?status=error&message=${encodeURIComponent('An internal server error occurred during verification')}`);
  }
});

// POST /api/auth/verify-email
// API-based verification handler for single-page apps
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'A valid verification token is required'
      });
    }

    // 1. Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find matching record
    const record = await VerificationToken.findOne({ tokenHash });
    if (!record) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_NOT_FOUND',
        message: 'This verification link is invalid, already used, or expired.'
      });
    }

    // 3. Expiration check
    if (new Date() > record.expiresAt) {
      await VerificationToken.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'This verification link has expired (30-minute limit). Please request a new link.'
      });
    }

    // 4. Update user
    const user = await User.findById(record.userId);
    if (!user) {
      await VerificationToken.deleteOne({ _id: record._id });
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account not found'
      });
    }

    if (user.emailVerified) {
      await VerificationToken.deleteOne({ _id: record._id });
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified.',
        email: user.email
      });
    }

    user.emailVerified = true;
    await user.save({ validateModifiedOnly: true });

    // 5. Invalidate token immediately
    await VerificationToken.deleteOne({ _id: record._id });

    await AuditLog.create({
      action: 'EMAIL_VERIFIED',
      performedBy: { userId: user._id, userType: 'voter' },
      details: `Email successfully verified for ${user.email}`,
      success: true
    });

    res.json({
      success: true,
      message: 'Email verified successfully! Your account is now fully verified.',
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// In-memory rate limiting map for email resends: email/ip -> timestamp of last request
const resendRateLimitMap = new Map();
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown between resends

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const rateLimitKey = `${clientIp}_${normalizedEmail}`;

    // Rate limiting: 60-second cooldown per client/email
    const lastSent = resendRateLimitMap.get(rateLimitKey);
    if (lastSent && Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: `Please wait ${waitSeconds} seconds before requesting another verification email.`
      });
    }

    // Always update rate limit timestamp
    resendRateLimitMap.set(rateLimitKey, Date.now());

    // Clean up stale entries from rate limit map periodically
    if (resendRateLimitMap.size > 1000) {
      const cutoff = Date.now() - RESEND_COOLDOWN_MS;
      for (const [k, v] of resendRateLimitMap.entries()) {
        if (v < cutoff) resendRateLimitMap.delete(k);
      }
    }

    // Look up user
    const user = await User.findOne({ email: normalizedEmail });

    // Generic safe response: Do not leak whether the user exists
    const genericSuccessResponse = {
      success: true,
      message: 'If an account is associated with this email, a verification link has been sent.'
    };

    if (!user) {
      return res.json(genericSuccessResponse);
    }

    // If already verified, do not send a token
    if (user.emailVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'This email address is already verified.'
      });
    }

    // 1. Invalidate any existing verification tokens for this user
    await VerificationToken.deleteMany({ userId: user._id });

    // 2. Generate new cryptographically secure random token (32 bytes = 64 hex chars)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // 3. Store new token hash
    await VerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    // 4. Send real verification email
    let emailPreviewUrl = null;
    try {
      const mailResult = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: rawVerificationToken
      });
      emailPreviewUrl = mailResult?.previewUrl;

      await AuditLog.create({
        action: 'EMAIL_VERIFICATION_RESENT',
        performedBy: { userId: user._id, userType: 'voter' },
        details: `Verification email resent to ${user.email}`,
        success: true
      });
    } catch (mailErr) {
      console.error('❌ Resend verification email failed:', mailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to deliver verification email. Please try again later.'
      });
    }

    res.json({
      ...genericSuccessResponse,
      emailPreviewUrl // Available in development/Ethereal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  VOTER VERIFY — OTP → voterId + QR token
// ═══════════════════════════════════════════

// POST /api/auth/voter/verify
// Called after /send-otp. Marks emailVerified, assigns voterId, issues signed QR token.
router.post('/voter/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'email and otp required' });
    }

    const key = email.toLowerCase().trim();
    const stored = otpStore.get(key);
    if (!stored) {
      return res.status(400).json({ success: false, message: 'No code found — request a new one.' });
    }
    if (Date.now() > stored.expiry) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'Code expired — request a new one.' });
    }
    if (stored.attempts >= 5) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'Too many wrong attempts — request a new code.' });
    }
    if (stored.otp !== String(otp).trim()) {
      stored.attempts++;
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${5 - stored.attempts} attempt(s) left.`
      });
    }
    otpStore.delete(key);

    const user = await User.findOne({ email: key });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found for this email.' });
    }

    // Assign voterId if not yet assigned
    if (!user.voterId) {
      user.voterId = await User.generateVoterId();
    }
    user.emailVerified = true;
    user.isVerified = true;

    // Issue a signed single-use QR token (JWT, 30-day expiry)
    const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
    const jwt = require('jsonwebtoken');
    const qrPayload = { sub: user._id.toString(), type: 'qr_login', voterId: user.voterId };
    const qrToken = jwt.sign(qrPayload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '30d' });
    user.qrToken = qrToken;
    user.qrTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.qrTokenUsed = false;

    await user.save({ validateModifiedOnly: true });

    await AuditLog.create({
      action: 'EMAIL_VERIFIED',
      performedBy: { userId: user._id, userType: 'user' },
      details: `Email verified, voterId ${user.voterId} assigned`,
      success: true
    });

    res.json({
      success: true,
      message: 'Email verified. Voter ID issued.',
      voterId: user.voterId,
      name: user.name,
      email: user.email,
      qrToken,  // frontend encodes into QR code
      state: user.address?.state,
      district: user.address?.district
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
//  VOTER LOGIN — voterId + email OTP  or  QR token
// ═══════════════════════════════════════════

// POST /api/auth/voter/login
// Body: { voterId, otp }  OR  { qrToken }  OR  { qrData }
router.post('/voter/login', async (req, res) => {
  try {
    let { voterId, otp, qrToken, qrData } = req.body;
    let rawQr = qrToken || qrData;
    if (rawQr && typeof rawQr === 'string') {
      try {
        if (rawQr.startsWith('{')) {
          const parsed = JSON.parse(rawQr);
          rawQr = parsed.qrToken || parsed.token || rawQr;
          if (!voterId && parsed.voterId) voterId = parsed.voterId;
        }
      } catch {}
    }
    qrToken = rawQr;

    // ── Branch A: QR token scan ────────────────────────────────────
    if (qrToken) {
      const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
      const jwt = require('jsonwebtoken');
      let decoded;
      try {
        decoded = jwt.verify(qrToken, JWT_SECRET, { algorithms: ['HS256'] });
      } catch {
        return res.status(401).json({ success: false, message: 'QR token is invalid or expired.' });
      }

      if (decoded.type !== 'qr_login') {
        return res.status(401).json({ success: false, message: 'Invalid token type.' });
      }

      const user = await User.findById(decoded.sub);
      if (!user || !user.isActive) {
        return res.status(404).json({ success: false, message: 'User not found or deactivated.' });
      }
      if (user.qrTokenUsed || user.qrToken !== qrToken) {
        return res.status(401).json({ success: false, message: 'QR code already used or revoked.' });
      }
      if (user.qrTokenExpiry && new Date() > user.qrTokenExpiry) {
        return res.status(401).json({ success: false, message: 'QR code has expired.' });
      }

      // Mark QR used (single-use guarantee) — reissue a fresh one so the Voter Pass stays scannable
      const newQrToken = jwt.sign(
        { sub: user._id.toString(), type: 'qr_login', voterId: user.voterId },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '30d' }
      );
      user.qrToken = newQrToken;
      user.qrTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      user.qrTokenUsed = false;
      await user.resetLoginAttempts();
      await user.save({ validateModifiedOnly: true });

      const sessionToken = generateToken(user._id, user.role);

      await AuditLog.create({
        action: 'USER_LOGIN',
        performedBy: { userId: user._id, userType: user.role },
        details: `QR login: ${user.voterId}`,
        success: true
      });

      return res.json({
        success: true,
        message: 'QR login successful.',
        token: sessionToken,
        newQrToken,  // frontend should update stored QR
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          voterId: user.voterId,
          role: user.role,
          state: user.address?.state,
          district: user.address?.district,
          constituency: user.address?.constituency || user.location?.constituency,
          location: user.location
        }
      });
    }

    // ── Branch B: voterId + email OTP ─────────────────────────────
    if (!voterId) {
      return res.status(400).json({ success: false, message: 'voterId or qrToken required.' });
    }

    const user = await User.findOne({ voterId: voterId.trim().toUpperCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Voter ID not found.' });
    }
    if (user.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account locked — too many attempts. Try later.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    // If no OTP provided yet, send one and return
    if (!otp) {
      // Send OTP to registered email
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const key = user.email;
      const existing = otpStore.get(key);
      if (existing && existing.resendAt && Date.now() < existing.resendAt) {
        const wait = Math.ceil((existing.resendAt - Date.now()) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${wait}s before requesting a new code.`,
          retryAfter: wait
        });
      }
      otpStore.set(key, {
        otp: code,
        expiry: Date.now() + 10 * 60 * 1000,
        resendAt: Date.now() + 60 * 1000,
        attempts: 0
      });
      let emailSent = false;
      try {
        await sendOtpEmail({ to: key, name: user.name, otp: code });
        emailSent = true;
      } catch (e) {
        console.error('OTP send error:', e.message);
      }
      return res.json({
        success: true,
        message: `Code sent to registered email (${user.email.slice(0,2)}***@${user.email.split('@')[1]})`,
        emailSent,
        maskedEmail: user.email.slice(0,2) + '***@' + user.email.split('@')[1],
        ...(process.env.NODE_ENV === 'development' && { otp: code })
      });
    }

    // Verify OTP
    const key = user.email;
    const stored = otpStore.get(key);
    if (!stored) {
      return res.status(400).json({ success: false, message: 'No code found — request a new one.' });
    }
    if (Date.now() > stored.expiry) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'Code expired.' });
    }
    if (stored.attempts >= 5) {
      otpStore.delete(key);
      await user.incrementLoginAttempts();
      return res.status(400).json({ success: false, message: 'Too many wrong attempts.' });
    }
    if (stored.otp !== String(otp).trim()) {
      stored.attempts++;
      await user.incrementLoginAttempts();
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${5 - stored.attempts} attempt(s) left.`
      });
    }
    otpStore.delete(key);
    await user.resetLoginAttempts();

    const sessionToken = generateToken(user._id, user.role);

    await AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: { userId: user._id, userType: user.role },
      details: `VoterID login: ${user.voterId}`,
      success: true
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token: sessionToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        voterId: user.voterId,
        role: user.role,
        state: user.address?.state,
        district: user.address?.district,
        constituency: user.address?.constituency || user.location?.constituency,
        location: user.location
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/voter/qr-refresh
// Regenerate QR token (e.g. after voting, to mark old one expired)
router.post('/voter/qr-refresh', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
    const jwt = require('jsonwebtoken');
    const qrToken = jwt.sign(
      { sub: user._id.toString(), type: 'qr_login', voterId: user.voterId },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30d' }
    );
    user.qrToken = qrToken;
    user.qrTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.qrTokenUsed = false;
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true, qrToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
//  VOTER CARD & QR VERIFICATION ENDPOINTS
// ═══════════════════════════════════════════

// GET /api/auth/voter/card
// Query: ?voterId=... OR uses Authorization header
router.get('/voter/card', async (req, res) => {
  try {
    let voterId = req.query.voterId;
    let user = null;

    if (voterId) {
      user = await User.findOne({ voterId: voterId.trim().toUpperCase() });
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id || decoded.sub);
      } catch {}
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Voter card not found' });
    }

    // Ensure voter has voterId and qrToken
    let needSave = false;
    if (!user.voterId) {
      user.voterId = await User.generateVoterId();
      needSave = true;
    }
    const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
    const jwt = require('jsonwebtoken');
    if (!user.qrToken) {
      user.qrToken = jwt.sign(
        { sub: user._id.toString(), type: 'qr_login', voterId: user.voterId },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '30d' }
      );
      user.qrTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      user.qrTokenUsed = false;
      needSave = true;
    }
    if (needSave) {
      await user.save({ validateModifiedOnly: true });
    }

    const resolvedConstituency = user.address?.constituency || user.location?.constituency || `${user.address?.district || 'General'} Central AC`;
    const resolvedStation = user.location?.pollingStation || `Polling Station #42, ${user.address?.district || 'City'} Civic Center`;

    const cardData = {
      voterId: user.voterId,
      name: user.name,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      maskedAadhaar: user.aadhaarNumber ? `${user.aadhaarNumber.slice(0, 4)}-XXXX-${user.aadhaarNumber.slice(-4)}` : 'XXXX-XXXX-0000',
      address: {
        state: user.address?.state || 'National',
        district: user.address?.district || 'General',
        pincode: user.address?.pincode || '',
        addressLine: user.address?.addressLine || '',
        constituency: resolvedConstituency
      },
      location: {
        latitude: user.location?.latitude || null,
        longitude: user.location?.longitude || null,
        constituency: resolvedConstituency,
        pollingStation: resolvedStation,
        detectedAt: user.location?.detectedAt || user.createdAt
      },
      email: user.email,
      mobile: user.mobile ? `${user.mobile.slice(0, 2)}******${user.mobile.slice(-2)}` : '',
      isVerified: Boolean(user.isVerified || user.emailVerified),
      qrToken: user.qrToken,
      qrTokenValid: !user.qrTokenUsed && (!user.qrTokenExpiry || new Date() < user.qrTokenExpiry),
      issuedAt: user.createdAt,
      digitalSignature: crypto.createHash('sha256').update(user.voterId + (user.aadhaarNumber || '')).digest('hex')
    };

    res.json({ success: true, card: cardData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/voter/verify-card-qr
// Scans/decodes QR code and returns authenticated voter details with location & validity
router.post('/voter/verify-card-qr', async (req, res) => {
  try {
    let { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'QR data is required' });
    }

    let token = qrData;
    let parsedVoterId = null;

    if (typeof qrData === 'string' && qrData.startsWith('{')) {
      try {
        const parsed = JSON.parse(qrData);
        token = parsed.qrToken || parsed.token || qrData;
        parsedVoterId = parsed.voterId;
      } catch {}
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';
    const jwt = require('jsonwebtoken');
    let user = null;
    let signatureValid = false;

    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.sub) {
        user = await User.findById(decoded.sub);
        signatureValid = true;
      }
    } catch (jwtErr) {
      // If token decode fails, fallback to voterId lookup
      if (parsedVoterId) {
        user = await User.findOne({ voterId: parsedVoterId.trim().toUpperCase() });
      } else if (typeof qrData === 'string' && qrData.startsWith('EB-')) {
        user = await User.findOne({ voterId: qrData.trim().toUpperCase() });
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or unrecognized Voter QR Code. No matching elector found on the sovereign registry.'
      });
    }

    const isQrCurrent = user.qrToken === token;
    const isExpired = user.qrTokenExpiry && new Date() > user.qrTokenExpiry;
    const isUsed = user.qrTokenUsed;

    const resolvedConstituency = user.address?.constituency || user.location?.constituency || `${user.address?.district || 'General'} Central AC`;
    const resolvedStation = user.location?.pollingStation || `Polling Station #42, ${user.address?.district || 'District'} Ward Center`;

    const voterDetails = {
      voterId: user.voterId,
      name: user.name,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      maskedAadhaar: user.aadhaarNumber ? `${user.aadhaarNumber.slice(0, 4)}-XXXX-${user.aadhaarNumber.slice(-4)}` : 'XXXX-XXXX-0000',
      state: user.address?.state || 'National',
      district: user.address?.district || 'General',
      constituency: resolvedConstituency,
      pollingStation: resolvedStation,
      pincode: user.address?.pincode,
      addressLine: user.address?.addressLine,
      location: {
        latitude: user.location?.latitude || null,
        longitude: user.location?.longitude || null,
        constituency: resolvedConstituency,
        pollingStation: resolvedStation
      },
      status: user.isActive ? 'ACTIVE & VERIFIED' : 'SUSPENDED',
      hasVoted: Boolean(user.hasVoted && (user.hasVoted.size > 0 || Object.keys(user.hasVoted).length > 0)),
      signatureValid,
      qrStatus: !isUsed && !isExpired ? 'VALID & ACTIVE' : (isUsed ? 'TOKEN_USED_ROTATION_NEEDED' : 'EXPIRED'),
      issuedAt: user.createdAt,
      digitalSeal: crypto.createHash('sha256').update(user.voterId + (user.address?.state || '')).digest('hex').slice(0, 32).toUpperCase()
    };

    res.json({
      success: true,
      verified: true,
      voter: voterDetails
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

