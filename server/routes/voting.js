const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════
//  CAST VOTE
// ═══════════════════════════════════════════

// POST /api/voting/cast
router.post('/cast', protect, authorize('voter'), async (req, res) => {
  try {
    const { electionId, candidateIndex } = req.body;

    // Get the election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    // Check if election is active
    if (election.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This election is not currently active'
      });
    }

    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Voting is not currently open for this election'
      });
    }

    // Validate candidate
    if (candidateIndex < 0 || candidateIndex >= election.candidates.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate selection'
      });
    }

    // Check user verification
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required. You must verify your registered email address before casting your ballot.'
      });
    }

    // Check if user already voted in this election
    if (user.hasVoted && user.hasVoted.get(electionId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election'
      });
    }

    // Check election scope — voter must be in the eligible area
    if (election.type === 'state' && election.state !== user.address.state) {
      return res.status(403).json({
        success: false,
        message: 'You are not eligible to vote in this state election'
      });
    }
    if (election.type === 'district') {
      if (election.state !== user.address.state || election.district !== user.address.district) {
        return res.status(403).json({
          success: false,
          message: 'You are not eligible to vote in this district election'
        });
      }
    }

    // Create vote hash for blockchain reference
    const voteData = `${user._id}-${electionId}-${candidateIndex}-${Date.now()}`;
    const voteHash = CryptoJS.SHA256(voteData).toString();

    // Record the vote
    // Mark user as voted
    user.hasVoted.set(electionId, true);
    await user.save({ validateModifiedOnly: true });

    // Update election vote counts
    election.totalVotesCast += 1;

    // Update results
    const existingResult = election.results.find(r => r.candidateIndex === candidateIndex);
    if (existingResult) {
      existingResult.voteCount += 1;
    } else {
      election.results.push({
        candidateIndex,
        candidateName: election.candidates[candidateIndex].name,
        party: election.candidates[candidateIndex].party,
        voteCount: 1
      });
    }

    await election.save();

    await AuditLog.create({
      action: 'VOTE_CAST',
      performedBy: {
        userId: user._id,
        userType: 'voter',
        aadhaarHash: CryptoJS.SHA256(user.aadhaarNumber).toString()
      },
      targetResource: { type: 'Election', id: election._id },
      details: `Vote cast in election "${election.name}"`,
      success: true,
      metadata: { voteHash, blockchainTxPending: true }
    });

    res.json({
      success: true,
      message: 'Your vote has been recorded successfully!',
      voteHash,
      receipt: {
        electionName: election.name,
        timestamp: new Date().toISOString(),
        voteHash,
        status: 'confirmed'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  CHECK VOTING STATUS
// ═══════════════════════════════════════════

// GET /api/voting/status/:electionId
router.get('/status/:electionId', protect, authorize('voter'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const hasVoted = user.hasVoted && user.hasVoted.get(req.params.electionId);

    res.json({
      success: true,
      hasVoted: !!hasVoted,
      electionId: req.params.electionId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  GET ELIGIBLE ELECTIONS
// ═══════════════════════════════════════════

// GET /api/voting/eligible-elections
router.get('/eligible-elections', protect, authorize('voter'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();

    // Find active elections the voter is eligible for
    const elections = await Election.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { type: 'national' },
        { type: 'state', state: user.address.state },
        {
          type: 'district',
          state: user.address.state,
          district: user.address.district
        }
      ]
    });

    // Mark which ones are already voted
    const electionsWithStatus = elections.map(election => ({
      ...election.toObject(),
      hasVoted: user.hasVoted ? !!user.hasVoted.get(election._id.toString()) : false
    }));

    res.json({
      success: true,
      count: electionsWithStatus.length,
      elections: electionsWithStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  VERIFY VOTE (using hash)
// ═══════════════════════════════════════════

// POST /api/voting/verify
router.post('/verify', async (req, res) => {
  try {
    const { voteHash } = req.body;

    if (!voteHash) {
      return res.status(400).json({
        success: false,
        message: 'Vote hash is required'
      });
    }

    const auditRecord = await AuditLog.findOne({
      action: 'VOTE_CAST',
      'metadata.voteHash': voteHash
    });

    if (!auditRecord) {
      return res.status(404).json({
        success: false,
        message: 'No vote found with this hash',
        verified: false
      });
    }

    res.json({
      success: true,
      verified: true,
      message: 'Vote verified successfully',
      timestamp: auditRecord.createdAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
