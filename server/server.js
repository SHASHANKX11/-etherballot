require('dotenv').config();
const path = require('path');
const fs = require('fs');
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

// Import Admin model for seeding
const Admin = require('./models/Admin');

const app = express();
const PORT = 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ═══════════════════════════════════════════
//  SECURITY: Disable fingerprinting
// ═══════════════════════════════════════════
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

// CORS configuration (supports local dev, iframe previews, and custom domain)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, mobile) or any origin in preview
    callback(null, true);
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
  max: 15,
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

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    gracefulShutdown('uncaughtException');
  });
};

startServer();
