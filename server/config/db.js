const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ─── Persisted reference so we never create a second MongoMemoryServer ───────
let mongodInstance = null;
let connectionPromise = null;
let connectionUri = null;
let listenersAttached = false;

/**
 * Validate whether a string is a valid MongoDB connection URI scheme.
 */
const isValidMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  return trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://');
};

/**
 * Attach event listeners to Mongoose connection.
 */
const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('disconnected', () => {
    console.warn(`⚠️  MongoDB disconnected from ${connectionUri || 'the database'}.`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
};

/**
 * Build and return the embedded MongoDB URI.
 * Reuses the existing instance if one is already running.
 */
const getEmbeddedUri = async () => {
  if (mongodInstance) {
    return mongodInstance.getUri();
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');

  const dbDir = path.join(__dirname, '..', 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger'
      }
    });
    return mongodInstance.getUri();
  } catch (err) {
    console.warn(`⚠️  Persistent storage with wiredTiger failed (${err.message}). Starting in-memory MongoDB instance...`);
    mongodInstance = await MongoMemoryServer.create();
    return mongodInstance.getUri();
  }
};

/**
 * Connect to MongoDB using the configured URI or the embedded fallback.
 * Reuses an existing or in-flight Mongoose connection.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const rawUri = process.env.MONGODB_URI?.trim();
    let configuredUri = null;

    if (rawUri) {
      if (isValidMongoUri(rawUri)) {
        configuredUri = rawUri;
      } else {
        console.warn(`⚠️  Configured MONGODB_URI ("${rawUri}") is not a valid MongoDB URI (must start with "mongodb://" or "mongodb+srv://").`);
        console.warn('   Automatically falling back to embedded MongoDB...');
      }
    }

    // Attempt remote/configured MongoDB if valid URI was provided
    if (configuredUri) {
      try {
        const maskedUri = configuredUri.replace(/\/\/.*@/, '//***:***@');
        console.log(`Connecting to configured MongoDB URI (${maskedUri})...`);
        const conn = await mongoose.connect(configuredUri, {
          serverSelectionTimeoutMS: 4000
        });
        connectionUri = configuredUri;
        console.log(`✅ MongoDB Connected to remote database: ${conn.connection.host}`);
        attachListeners();
        return conn.connection;
      } catch (error) {
        console.warn(`⚠️  Failed to connect to configured MongoDB URI: ${error.message}`);
        console.warn('   Automatically falling back to embedded MongoDB...');
      }
    }

    // Connect to embedded MongoDB fallback
    try {
      const embeddedUri = await getEmbeddedUri();
      const conn = await mongoose.connect(embeddedUri, {
        serverSelectionTimeoutMS: 8000
      });
      connectionUri = embeddedUri;
      console.log(`✅ Embedded MongoDB Connected: ${conn.connection.host}`);
      console.log('   💾 Data stored at: server/data/db');
      attachListeners();
      return conn.connection;
    } catch (error) {
      console.error('❌ Unable to connect to embedded MongoDB:', error.message);
      throw new Error(`Unable to connect to MongoDB: ${error.message}`, { cause: error });
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;
