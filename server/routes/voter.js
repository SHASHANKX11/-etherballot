const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');

// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════
//  SEARCH ELECTORAL ROLL
// ═══════════════════════════════════════════

// GET /api/voters/search
router.get('/search', async (req, res) => {
  try {
    const { query, type = 'epic', state, district } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const cleanQuery = String(query).trim();
    let user = null;

    if (type === 'aadhaar' || /^\d{12}$/.test(cleanQuery)) {
      user = await User.findOne({ aadhaarNumber: cleanQuery });
    } else {
      const safeQuery = escapeRegex(cleanQuery);
      user = await User.findOne({
        $or: [
          { name: { $regex: safeQuery, $options: 'i' } },
          { mobile: cleanQuery }
        ]
      });
    }

    if (user) {
      const epicNumber = 'EB' + CryptoJS.SHA256(user.aadhaarNumber).toString().slice(0, 7).toUpperCase();
      return res.json({
        success: true,
        isVoter: true,
        name: user.name.toUpperCase(),
        epicNumber,
        aadhaarHash: '****-****-' + user.aadhaarNumber.slice(-4),
        gender: user.gender ? user.gender.toUpperCase() : 'NOT SPECIFIED',
        state: user.address?.state ? user.address.state.toUpperCase() : 'NATIONAL',
        district: user.address?.district ? user.address.district.toUpperCase() : 'CENTRAL',
        constituency: `${user.address?.district || 'General'} Parliamentary Constituency`,
        pollingStation: `Government Higher Secondary School, ${user.address?.district || 'District Center'}`,
        bloName: `Designated BLO (${user.address?.state?.slice(0, 2).toUpperCase() || 'IN'}-${user.aadhaarNumber.slice(-3)})`,
        bloContact: '1950 (Toll-Free)',
        status: user.isActive ? 'Active & Verified' : 'Inactive',
        blockNumber: '#153,492',
        timestamp: new Date().toISOString()
      });
    }

    // Default simulated sovereign lookup for demonstration
    const simulatedEpic = cleanQuery.toUpperCase().startsWith('EB')
      ? cleanQuery.toUpperCase()
      : 'EB' + Math.floor(1000000 + Math.random() * 9000000);

    res.json({
      success: true,
      isVoter: true,
      name: 'VERIFIED CITIZEN',
      epicNumber: simulatedEpic,
      aadhaarHash: '****-****-' + Math.floor(1000 + Math.random() * 9000),
      gender: 'MALE',
      state: state ? state.toUpperCase() : 'MAHARASHTRA',
      district: district ? district.toUpperCase() : 'MUMBAI',
      constituency: '31 - Mumbai South Parliamentary',
      pollingStation: 'Room No. 4, Government Higher Secondary School, Colaba',
      bloName: 'Suresh Patil (BLO Code: MH-204)',
      bloContact: '1950 (Ext: 442)',
      status: 'Active & Verified',
      blockNumber: '#153,492',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  TRACK APPLICATION STATUS
// ═══════════════════════════════════════════

// GET /api/voters/track/:refId
router.get('/track/:refId', async (req, res) => {
  try {
    const { refId } = req.params;

    if (!refId) {
      return res.status(400).json({
        success: false,
        message: 'Application Reference ID is required'
      });
    }

    res.json({
      success: true,
      isApplication: true,
      refId: String(refId).toUpperCase(),
      formType: 'Form 6 - New Voter Registration',
      applicantName: 'Sovereign Citizen',
      submittedOn: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      status: 'Approved & Cryptographically Minted on Ethereum Ledger',
      epicNumber: 'EB' + Math.floor(1000000 + Math.random() * 9000000),
      stage: 4
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
