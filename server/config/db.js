const mongoose = require('mongoose');

// ─── Persisted reference so we never create duplicate MongoMemoryServer instances ─
let mongodInstance = null;

// ─── Build and return a resilient, isolated embedded MongoDB URI ─────────────
const getEmbeddedUri = async () => {
  if (mongodInstance) {
    try {
      return mongodInstance.getUri();
    } catch {
      mongodInstance = null;
    }
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');

  // Launch isolated, ephemeral in-memory instance (prevents lock file and code 62 errors)
  mongodInstance = await MongoMemoryServer.create({
    instance: {
      dbName: 'etherballot',
      storageEngine: 'ephemeralForTest'
    }
  });

  return mongodInstance.getUri();
};

// ─── Connect to MongoDB (Primary URI → In-Memory Fallback) ────────────────────
const connectDB = async () => {
  // If already connected, do nothing
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Attempt 1: Try Primary MongoDB URI (e.g. local service / Atlas)
  const primaryUri = process.env.MONGODB_URI;
  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ Primary MongoDB Connected: ${conn.connection.host}`);
      setupListeners();
      return conn;
    } catch (err) {
      console.log('ℹ️  Primary MongoDB not reachable. Initializing embedded database...');
    }
  }

  // Attempt 2: Start isolated In-Memory MongoDB (100% crash-proof, no lock conflicts)
  try {
    const uri = await getEmbeddedUri();
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ Embedded MongoDB Connected: ${mongoose.connection.host}`);
    setupListeners();
    return conn;
  } catch (memErr) {
    console.error(`❌ Embedded MongoDB Error: ${memErr.message}`);
    // If memory server failed, try recreating once
    if (mongodInstance) {
      try { await mongodInstance.stop(); } catch {}
      mongodInstance = null;
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const fallbackUri = mongodInstance.getUri();
    const conn = await mongoose.connect(fallbackUri);
    console.log(`✅ Embedded MongoDB (Recovery) Connected: ${mongoose.connection.host}`);
    setupListeners();
    return conn;
  }
};

// ─── Deduplicated Connection Event Listeners ─────────────────────────────────
const setupListeners = () => {
  mongoose.connection.removeAllListeners('disconnected');
  mongoose.connection.removeAllListeners('error');

  mongoose.connection.on('disconnected', async () => {
    console.warn('⚠️  MongoDB disconnected. Attempting auto-reconnect...');
    try {
      const uri = mongodInstance ? mongodInstance.getUri() : (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/etherballot');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ MongoDB reconnected successfully.');
    } catch (e) {
      console.error('❌ Reconnection failed:', e.message);
    }
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
};

// ─── Graceful Shutdown Helper ────────────────────────────────────────────────
const stopDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
  } catch {
    // ignore on exit
  }
};

process.on('SIGINT', stopDB);
process.on('SIGTERM', stopDB);

module.exports = connectDB;
