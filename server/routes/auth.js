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

    // Primary: Email verification code
    if (email) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format.'
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      otpStore.set(normalizedEmail, {
        otp,
        expiry: Date.now() + 5 * 60 * 1000,
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
        expiry: Date.now() + 5 * 60 * 1000,
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
      pincode, addressLine, faceDescriptor
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

    const user = await User.create({
      aadhaarNumber,
      name,
      email: email.toLowerCase().trim(),
      emailVerified: false,
      mobile,
      dateOfBirth,
      gender,
      address: { state, district, pincode, addressLine },
      faceDescriptor,
      faceImageHash,
      isVerified: true
    });

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
        aadhaarLast4: user.aadhaarNumber.slice(-4),
        mobile: user.mobile,
        state: user.address.state,
        district: user.address.district,
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
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number'
      });
    }

    const user = await User.findOne({ aadhaarNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this Aadhaar number'
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
    if (req.userRole === 'voter') {
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

module.exports = router;

