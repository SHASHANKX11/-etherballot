const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ─── Persisted reference so we never create a second MongoMemoryServer ───────
let mongodInstance = null;
let connectionPromise = null;
let connectionUri = null;
let listenersAttached = false;

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

  mongodInstance = await MongoMemoryServer.create({
    instance: {
      dbPath: dbDir,
      storageEngine: 'wiredTiger'
    }
  });

  return mongodInstance.getUri();
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
    const configuredUri = process.env.MONGODB_URI?.trim();
    const uri = configuredUri || await getEmbeddedUri();
    const isEmbedded = !configuredUri;

    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: isEmbedded ? 5000 : 3000
      });
      connectionUri = uri;

      if (isEmbedded) {
        console.log(`✅ Embedded MongoDB Connected: ${conn.connection.host}`);
        console.log('   💾 Data will be persistently stored at: server/data/db');
      } else {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      }

      if (!listenersAttached) {
        listenersAttached = true;
        mongoose.connection.on('disconnected', () => {
          console.warn(`⚠️  MongoDB disconnected from ${connectionUri || 'the configured database'}.`);
        });
        mongoose.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err.message);
        });
      }

      return conn.connection;
    } catch (error) {
      const source = isEmbedded ? 'embedded MongoDB' : 'configured MongoDB URI';
      throw new Error(`Unable to connect to ${source}: ${error.message}`, { cause: error });
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;
