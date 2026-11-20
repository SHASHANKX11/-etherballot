const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const electionRoutes = require('./routes/election');
const votingRoutes = require('./routes/voting');
const voterRoutes = require('./routes/voter');
const voterCardRoutes = require('./routes/voterCard');

// Import models for seeding
const Admin = require('./models/Admin');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV;

// ═══════════════════════════════════════════
//  PROXY & SECURITY CONFIGURATION
// ═══════════════════════════════════════════
// Trust first proxy (nginx reverse proxy) so express-rate-limit and req.ip work properly
app.set('trust proxy', 1);

// Disable fingerprinting
app.disable('x-powered-by');

// ═══════════════════════════════════════════
//  PERFORMANCE: Gzip compression
// ═══════════════════════════════════════════
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6 // Balanced between speed and compression ratio
}));

// ═══════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════

// Security Headers (configured to allow iframe preview and cross-origin resource access)
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,     // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
}));

// CORS configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // In development mode, allow any origin (e.g. localhost ports, mobile devices, local IP)
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Allow requests with no origin (e.g. server-to-server, curl, mobile)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In production, reject disallowed origins without throwing an unhandled exception
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with strict size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

// ═══════════════════════════════════════════
//  SECURITY: Input sanitization middleware
//  Prevents NoSQL injection via $ operators
// ═══════════════════════════════════════════
const sanitizeInput = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeInput);
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) continue; // Block MongoDB operators
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ═══════════════════════════════════════════
//  RATE LIMITING (hardened)
// ═══════════════════════════════════════════

// General API rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'development' ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts.' }
});
app.use('/api/auth/', authLimiter);

// Even stricter for admin login
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin login attempts. Try again later.' }
});
app.use('/api/admin/login', adminAuthLimiter);

// Strict limit on voting endpoint to prevent abuse
const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Voting rate limit exceeded.' }
});
app.use('/api/voting/cast', voteLimiter);

// ═══════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/voter-card', voterCardRoutes);

// ═══════════════════════════════════════════
//  STATIC SCREENSHOTS UTILITY & ASSETS SERVING
// ═══════════════════════════════════════════
const copyScreenshots = () => {
  try {
    const brainDir = 'C:\\Users\\SHASHANK K 11\\.gemini\\antigravity\\brain\\0133a98c-26c9-4afe-98ef-d7f9941c469b';
    const destDir = path.join(__dirname, '../assets/screenshots');
    const clientPublicScreenshots = path.join(__dirname, '../client/public/screenshots');

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(clientPublicScreenshots)) fs.mkdirSync(clientPublicScreenshots, { recursive: true });

    const files = [
      { src: 'etherballot_01_home_hero_1793761849962.jpg', dest: '01_home_page.jpg' },
      { src: 'etherballot_02_voter_registration_aadhaar_1793761871633.jpg', dest: '02_voter_registration.jpg' },
      { src: 'etherballot_03_registration_details_gps_1793761894740.jpg', dest: '03_registration_gps.jpg' },
      { src: 'etherballot_04_email_verification_otp_1793761915741.jpg', dest: '04_email_verification_otp.jpg' },
      { src: 'etherballot_05_biometric_face_ai_1793761939637.jpg', dest: '05_biometric_face_ai.jpg' },
      { src: 'etherballot_06_voter_signin_portal_1793761959904.jpg', dest: '06_voter_login.jpg' },
      { src: 'etherballot_07_ballot_casting_1793761981659.jpg', dest: '07_ballot_casting.jpg' },
      { src: 'etherballot_08_vote_receipt_sealed_1793762006376.jpg', dest: '08_vote_receipt_sealed.jpg' },
      { src: 'etherballot_09_election_results_analytics_1793762059018.jpg', dest: '09_election_results_analytics.jpg' },
      { src: 'etherballot_10_admin_audit_dashboard_1793762117159.jpg', dest: '10_admin_dashboard.jpg' }
    ];

    for (const f of files) {
      const srcPath = path.join(brainDir, f.src);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(destDir, f.dest));
        fs.copyFileSync(srcPath, path.join(clientPublicScreenshots, f.dest));
      }
    }

    const stepFiles = [
      { step: '1803', dest: '11_navbar_metamask_connected.png' },
      { step: '1825', dest: '12_voter_login_qr_tab.png' },
      { step: '1865', dest: '13_digital_voter_card_epic.png' },
      { step: '1881', dest: '14_camera_qr_scanner_modal.png' },
      { step: '1885', dest: '15_qr_verified_result_modal.png' },
      { step: '1900', dest: '16_polling_officer_scanner.png' },
      { step: '1961', dest: '17_admin_overview_portal.png' },
      { step: '1965', dest: '18_admin_electoral_roll.png' }
    ];

    for (const s of stepFiles) {
      const sPath = path.join(brainDir, '.system_generated', 'steps', s.step, 'media_0.png');
      if (fs.existsSync(sPath)) {
        fs.copyFileSync(sPath, path.join(destDir, s.dest));
        fs.copyFileSync(sPath, path.join(clientPublicScreenshots, s.dest));
      }
    }
  } catch (err) {
    console.error('Error synchronizing screenshots:', err.message);
  }
};
copyScreenshots();

app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Root API Overview & Service Endpoint
app.get('/', (req, res) => {
  res.json({
    project: 'EtherBallot',
    description: 'Decentralized Ethereum Voting System with Biometric Verification',
    version: '2.0.0',
    status: 'OPERATIONAL',
    environment: NODE_ENV,
    network: 'Ethereum EVM (Sepolia Testnet / Local)',
    services: {
      client: process.env.CLIENT_URL || 'http://localhost:5173',
      health: 'http://localhost:5000/api/health',
      auth: 'http://localhost:5000/api/auth',
      elections: 'http://localhost:5000/api/elections',
      voting: 'http://localhost:5000/api/voting',
      voterCard: 'http://localhost:5000/api/voter-card',
      admin: 'http://localhost:5000/api/admin'
    },
    demoCredentials: {
      admin: {
        url: 'http://localhost:5173/admin/login',
        username: 'superadmin',
        password: 'Admin@123456'
      },
      voter: {
        url: 'http://localhost:5173/login',
        voterId: 'EB-2026-000001',
        aadhaar: '123456789012'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check (no sensitive info exposed)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EtherBallot API is running',
    version: '2.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════
//  CLIENT STATIC ASSET SERVING & SPA ROUTING
// ═══════════════════════════════════════════

const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback: any non-API route serves index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath);
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Fallback 404 handler if static client is not built
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler — never leak stack traces or internal error messages to client
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (NODE_ENV === 'development') console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ═══════════════════════════════════════════
//  SEED SUPER ADMIN (reads from .env)
// ═══════════════════════════════════════════

const seedSuperAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ role: 'super_admin' });
    if (!existingAdmin) {
      const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
      const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
      const name     = process.env.SUPER_ADMIN_NAME     || 'Super Administrator';
      const email    = process.env.SUPER_ADMIN_EMAIL    || 'admin@etherballot.com';

      await Admin.create({ username, password, name, email, role: 'super_admin' });
      console.log('🔐 Super Admin seeded — change default password immediately!');
      console.log(`   Username: ${username}`);
    }
  } catch (error) {
    console.error('Error seeding super admin:', error.message);
  }
};

const DEMO_FACE_DESCRIPTOR = Array.from({ length: 128 }, (_, i) =>
  Number((Math.sin(i * 0.1) * 0.05).toFixed(4))
);

const seedDemoVoter = async () => {
  try {
    const dummyAadhaar = '111122223333';
    const existing = await User.findOne({ aadhaarNumber: dummyAadhaar });
    if (!existing) {
      await User.create({
        aadhaarNumber: dummyAadhaar,
        name: 'Demo Citizen (Test Voter)',
        email: 'demo.voter@etherballot.gov.in',
        emailVerified: true,
        mobile: '9876543210',
        dateOfBirth: new Date('1995-01-01'),
        gender: 'male',
        address: {
          state: 'Maharashtra',
          district: 'Mumbai City',
          pincode: '400001',
          addressLine: '123 Election Promenade'
        },
        faceDescriptor: DEMO_FACE_DESCRIPTOR
      });
      console.log('👤 Dummy Voter seeded: Aadhaar 111122223333 | Mobile: 9876543210');
    }
  } catch (error) {
    console.error('Error seeding demo voter:', error.message);
  }
};

// ═══════════════════════════════════════════
//  GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════

const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

// ═══════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════

let server;

const startServer = async () => {
  await connectDB();
  await seedSuperAdmin();
  await seedDemoVoter();

  server = app.listen(PORT, () => {
    const border = '═'.repeat(43);
    console.log(`
    ╔${border}╗
    ║                                           ║
    ║   🗳️  EtherBallot API Server v2.0.0       ║
    ║   📡  Port    : ${String(PORT).padEnd(24)}║
    ║   🌍  Env     : ${String(NODE_ENV).padEnd(24)}║
    ║   🔒  Security: Helmet + Rate Limit       ║
    ║   ⚡  Perf    : Gzip Compression          ║
    ║                                           ║
    ╚${border}╝
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is momentarily busy.`);
    } else {
      console.error('❌ Server startup error:', err.message);
    }
    process.exit(1);
  });

  process.once('SIGUSR2', () => {
    if (server) {
      server.close(() => process.kill(process.pid, 'SIGUSR2'));
    } else {
      process.kill(process.pid, 'SIGUSR2');
    }
  });

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    gracefulShutdown('uncaughtException');
  });
};

startServer();
