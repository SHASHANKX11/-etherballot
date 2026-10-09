const express = require('express');
const router = express.Router();
const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════
//  CREATE ELECTION
// ═══════════════════════════════════════════

// POST /api/elections
router.post('/', protect, authorize('super_admin', 'state_admin'), async (req, res) => {
  try {
    const { name, description, type, state, district, candidates, startDate, endDate } = req.body;

    // State admin can only create elections for their state
    if (req.userRole === 'state_admin') {
      if (type === 'national') {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can create national elections'
        });
      }
      if (state !== req.user.state) {
        return res.status(403).json({
          success: false,
          message: 'You can only create elections for your state'
        });
      }
    }

    if (!candidates || candidates.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 candidates are required'
      });
    }

    const election = await Election.create({
      name,
      description,
      type,
      state: state || null,
      district: district || null,
      candidates,
      startDate,
      endDate,
      createdBy: req.user._id,
      auditLog: [{
        action: 'CREATED',
        performedBy: req.user._id,
        details: `Election created by ${req.user.name}`
      }]
    });

    await AuditLog.create({
      action: 'ELECTION_CREATED',
      performedBy: { userId: req.user._id, userType: req.userRole },
      targetResource: { type: 'Election', id: election._id },
      details: `Election "${name}" created`,
      success: true
    });

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      election
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  GET ELECTIONS
// ═══════════════════════════════════════════

// GET /api/elections
router.get('/', async (req, res) => {
  try {
    let filter = {};
    
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.state) filter.state = req.query.state;

    const elections = await Election.find(filter)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: elections.length, elections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/elections/active
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const elections = await Election.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ startDate: 1 });

    res.json({ success: true, count: elections.length, elections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/elections/:id
router.get('/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'name role');
    
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    res.json({ success: true, election });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  UPDATE ELECTION STATUS
// ═══════════════════════════════════════════

// PUT /api/elections/:id/status
router.put('/:id/status', protect, authorize('super_admin', 'state_admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    // State admin can only manage their state's elections
    if (req.userRole === 'state_admin' && election.state !== req.user.state) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage elections in your state'
      });
    }

    const validTransitions = {
      'draft': ['upcoming', 'cancelled'],
      'upcoming': ['active', 'cancelled'],
      'active': ['completed'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[election.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${election.status}' to '${status}'`
      });
    }

    election.status = status;
    if (status === 'active') election.isActive = true;
    if (status === 'completed' || status === 'cancelled') election.isActive = false;

    election.auditLog.push({
      action: `STATUS_CHANGED_TO_${status.toUpperCase()}`,
      performedBy: req.user._id,
      details: `Status changed to ${status} by ${req.user.name}`
    });

    await election.save();

    const auditAction = status === 'active'    ? 'ELECTION_STARTED'
                      : status === 'completed' ? 'ELECTION_ENDED'
                      : status === 'cancelled' ? 'ELECTION_ENDED'
                      : 'ADMIN_ACTION'; // draft → upcoming

    await AuditLog.create({
      action: auditAction,
      performedBy: { userId: req.user._id, userType: req.userRole },
      targetResource: { type: 'Election', id: election._id },
      details: `Election "${election.name}" status changed to ${status}`,
      success: true
    });

    res.json({
      success: true,
      message: `Election status updated to ${status}`,
      election
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════

// GET /api/elections/:id/results
router.get('/:id/results', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    res.json({
      success: true,
      election: {
        name: election.name,
        status: election.status,
        totalVoters: election.totalVoters,
        totalVotesCast: election.totalVotesCast,
        candidates: election.candidates,
        results: election.results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/elections/:id (Super Admin or State Admin)
router.delete('/:id', protect, authorize('super_admin', 'state_admin'), async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    // State admin can only delete elections in their state
    if (req.userRole === 'state_admin' && election.state !== req.user.state) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete elections in your state'
      });
    }

    await Election.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'ELECTION_ENDED',
      performedBy: { userId: req.user._id, userType: req.userRole },
      targetResource: { type: 'Election', id: req.params.id },
      details: `Election "${election.name}" was deleted by ${req.user.name}`,
      success: true
    });

    res.json({
      success: true,
      message: 'Election deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
