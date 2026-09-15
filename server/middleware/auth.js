const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'etherballot_secure_jwt_secret_dev_key_2026';

// Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized - no token' });
  }

  // Basic token format validation before verifying
  if (token.length > 1000) {
    return res.status(401).json({ success: false, message: 'Not authorized - invalid token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],  // Explicitly restrict to expected algorithm
    });
    
    // Validate token payload structure
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, message: 'Not authorized - malformed token' });
    }

    if (decoded.role === 'voter') {
      req.user = await User.findById(decoded.id).select('-faceDescriptor');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      // Check if voter account is still active
      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: 'Account has been deactivated' });
      }
    } else {
      req.user = await Admin.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Admin not found' });
      }
      // Check if admin account is still active
      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: 'Account has been deactivated' });
      }
    }
    
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized - invalid token' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this route'  // Don't reveal actual role in response
      });
    }
    next();
  };
};

// Super Admin only
const superAdminOnly = (req, res, next) => {
  if (req.userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Only Super Admin can perform this action'
    });
  }
  next();
};

// State-level access check
const stateAccess = (req, res, next) => {
  if (req.userRole === 'super_admin') return next();
  
  const requestedState = req.params.state || req.body.state;
  if (req.userRole === 'state_admin' && req.user.state !== requestedState) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your assigned state'
    });
  }
  if (req.userRole === 'district_admin' && req.user.state !== requestedState) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your assigned state'
    });
  }
  next();
};

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    algorithm: 'HS256',       // Explicitly set algorithm
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { protect, authorize, superAdminOnly, stateAccess, generateToken };
