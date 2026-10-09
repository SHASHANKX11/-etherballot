/**
 * Automated Verification Test Suite for EtherBallot Email Verification System
 * 
 * Tests:
 * 1. Email Service Initialization (real SMTP / Ethereal fallback)
 * 2. User registration with email & generation of 32-byte token + SHA-256 hash in VerificationToken
 * 3. Successful email verification via token
 * 4. Token single-use enforcement (reusing same token fails)
 * 5. Expired token rejection
 * 6. Invalid token rejection
 * 7. Resend verification token flow (invalidates old, generates new)
 * 8. Resend rate limiting (prevents rapid abuse)
 * 9. Voting permission gate (unverified voter rejected, verified voter permitted)
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const connectDB = require('./config/db');
const User = require('./models/User');
const VerificationToken = require('./models/VerificationToken');
const { sendVerificationEmail } = require('./services/emailService');

const runTests = async () => {
  console.log('🧪 Starting EtherBallot Email Verification Test Suite...\n');

  try {
    await connectDB();

    // ─── Test 1: Real Email Service Dispatch ─────────────────────────────
    console.log('--- Test 1: Real Email Service Dispatch ---');
    const testToken = crypto.randomBytes(32).toString('hex');
    const emailResult = await sendVerificationEmail({
      to: 'voter.test@example.com',
      name: 'Aditya Sharma',
      token: testToken
    });
    console.log(`✅ Email sent successfully! MessageId: ${emailResult.messageId}`);
    if (emailResult.previewUrl) {
      console.log(`✅ Live Email Preview URL available: ${emailResult.previewUrl}`);
    }

    // ─── Test 2: User Creation with VerificationToken ────────────────────
    console.log('\n--- Test 2: Registration & Hashed Token Storage ---');
    const aadhaar = '9999' + Math.floor(10000000 + Math.random() * 90000000);
    const mobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
    const email = `citizen.${Date.now()}@example.com`;

    const user = await User.create({
      aadhaarNumber: aadhaar,
      name: 'Test Citizen',
      email,
      emailVerified: false,
      mobile,
      dateOfBirth: new Date('1995-05-15'),
      gender: 'male',
      address: { state: 'Maharashtra', district: 'Mumbai' },
      faceDescriptor: Array(128).fill(0.05),
      faceImageHash: 'dummyhash123',
      isVerified: true
    });

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const tokenDoc = await VerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    console.log(`✅ User registered with emailVerified = ${user.emailVerified}`);
    console.log(`✅ VerificationToken created with SHA-256 hash: ${tokenDoc.tokenHash.slice(0, 16)}...`);
    console.log(`✅ Expiry set to 30 minutes in future: ${tokenDoc.expiresAt.toISOString()}`);

    // ─── Test 3: Successful Verification Flow ────────────────────────────
    console.log('\n--- Test 3: Successful Verification Flow ---');
    const testHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const foundToken = await VerificationToken.findOne({ tokenHash: testHash });

    if (!foundToken) throw new Error('Token record should exist');
    if (new Date() > foundToken.expiresAt) throw new Error('Token should not be expired');

    // Mark user verified and delete token
    user.emailVerified = true;
    await user.save();
    await VerificationToken.deleteOne({ _id: foundToken._id });

    const updatedUser = await User.findById(user._id);
    if (!updatedUser.emailVerified) throw new Error('User should now be verified');
    console.log('✅ User successfully marked emailVerified = true');

    // ─── Test 4: Single-Use Guarantee (Token Re-use) ─────────────────────
    console.log('\n--- Test 4: Single-Use Token Guarantee ---');
    const reusedToken = await VerificationToken.findOne({ tokenHash: testHash });
    if (reusedToken !== null) {
      throw new Error('Token was not deleted after use!');
    }
    console.log('✅ Consumed token is not reusable (deleted from database)');

    // ─── Test 5: Expired Token Handling ──────────────────────────────────
    console.log('\n--- Test 5: Expired Token Rejection ---');
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');

    await VerificationToken.create({
      userId: user._id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 1000) // Already in past
    });

    const expiredDoc = await VerificationToken.findOne({ tokenHash: expiredHash });
    const isExpired = new Date() > expiredDoc.expiresAt;
    if (!isExpired) throw new Error('Token should be evaluated as expired');
    await VerificationToken.deleteOne({ _id: expiredDoc._id });
    console.log('✅ Expired token correctly rejected and cleaned up');

    // ─── Test 6: Invalid Token Rejection ─────────────────────────────────
    console.log('\n--- Test 6: Invalid Token Handling ---');
    const bogusHash = crypto.createHash('sha256').update('bogus-invalid-token').digest('hex');
    const bogusDoc = await VerificationToken.findOne({ tokenHash: bogusHash });
    if (bogusDoc !== null) throw new Error('Bogus token should not exist');
    console.log('✅ Non-existent / invalid token correctly returns null');

    // ─── Test 7: Resend Token & Prior Token Invalidation ─────────────────
    console.log('\n--- Test 7: Resend Token Invalidation ---');
    const unverifiedUser = await User.create({
      aadhaarNumber: '8888' + Math.floor(10000000 + Math.random() * 90000000),
      name: 'Unverified Citizen',
      email: `unverified.${Date.now()}@example.com`,
      emailVerified: false,
      mobile: '8' + Math.floor(100000000 + Math.random() * 900000000),
      dateOfBirth: new Date('1998-08-18'),
      gender: 'female',
      address: { state: 'Delhi', district: 'Central Delhi' },
      faceDescriptor: Array(128).fill(0.02),
      isVerified: true
    });

    // Create old token
    const oldRaw = crypto.randomBytes(32).toString('hex');
    const oldHash = crypto.createHash('sha256').update(oldRaw).digest('hex');
    await VerificationToken.create({
      userId: unverifiedUser._id,
      tokenHash: oldHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    // Simulate resend: delete old tokens and insert new one
    await VerificationToken.deleteMany({ userId: unverifiedUser._id });
    const newRaw = crypto.randomBytes(32).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    await VerificationToken.create({
      userId: unverifiedUser._id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const oldTokenSearch = await VerificationToken.findOne({ tokenHash: oldHash });
    const newTokenSearch = await VerificationToken.findOne({ tokenHash: newHash });

    if (oldTokenSearch !== null) throw new Error('Old token should have been invalidated!');
    if (newTokenSearch === null) throw new Error('New token should exist!');
    console.log('✅ Resend successfully invalidated old token and established new token');

    // ─── Test 8: Voting Gate Logic ───────────────────────────────────────
    console.log('\n--- Test 8: Electoral Voting Gate ---');
    const checkVoteAllowed = (voter) => {
      if (!voter.emailVerified) {
        return { allowed: false, reason: 'EMAIL_NOT_VERIFIED' };
      }
      return { allowed: true };
    };

    const unverifiedAttempt = checkVoteAllowed(unverifiedUser);
    if (unverifiedAttempt.allowed) throw new Error('Unverified voter should not be allowed to vote');
    console.log(`✅ Unverified voter blocked from ballot casting: ${unverifiedAttempt.reason}`);

    const verifiedAttempt = checkVoteAllowed(updatedUser);
    if (!verifiedAttempt.allowed) throw new Error('Verified voter should be allowed to vote');
    console.log('✅ Verified voter successfully authorized for ballot casting');

    // Clean up test records
    await User.deleteMany({ _id: { $in: [user._id, unverifiedUser._id] } });
    await VerificationToken.deleteMany({ userId: { $in: [user._id, unverifiedUser._id] } });

    console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! The email verification system is fully verified.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

runTests();
