const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// ─── Persisted reference so we never create duplicate MongoMemoryServer instances ─
let mongodInstance = null;
let connectionPromise = null;
let connectionUri = null;
let listenersAttached = false;

/**
 * Validate whether a string is a valid MongoDB connection URI scheme.
 */
const isValidMongoUri = (uri) => {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  return (
    trimmed.startsWith("mongodb://") || trimmed.startsWith("mongodb+srv://")
  );
};

/**
 * Attach event listeners to Mongoose connection.
 */
const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on("disconnected", () => {
    console.warn(
      `⚠️  MongoDB disconnected from ${connectionUri || "the database"}.`,
    );
  });
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });
};

// ─── Build and return a resilient, isolated embedded MongoDB URI ─────────────
const getEmbeddedUri = async () => {
  if (mongodInstance) {
    try {
      return mongodInstance.getUri();
    } catch {
      mongodInstance = null;
    }
  }

  const { MongoMemoryServer } = require("mongodb-memory-server");

  const dbDir = path.join(__dirname, "..", "data", "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: "wiredTiger",
      },
    });
    return mongodInstance.getUri();
  } catch (err) {
    console.warn(`⚠️  Persistent storage at ${dbDir} unavailable (${err.message.split('\n')[0]}). Falling back to in-memory MongoDB...`);
    mongodInstance = await MongoMemoryServer.create();
    return mongodInstance.getUri();
  }
};

/**
 * Connect (or reconnect) to MongoDB.
 * Tries the URI from .env first; falls back to an embedded instance.
 */
const connectDB = async () => {
  try {
    // ── Try the configured URI ──────────────────────────────────────────────
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.log("⚠️  Local MongoDB not found. Starting embedded database...");
    try {
      const uri = await getEmbeddedUri();
      await mongoose.connect(uri);
      console.log(`✅ Embedded MongoDB Connected: ${mongoose.connection.host}`);
      console.log("   💾 Data will be persistently stored at: server/data/db");
    } catch (memError) {
      console.error(
        `❌ Embedded MongoDB Connection Error: ${memError.message}`,
      );
      process.exit(1);
    }
  }

  // ── Attach event listeners only once ────────────────────────────────────
  mongoose.connection.removeAllListeners("disconnected");
  mongoose.connection.removeAllListeners("error");

  mongoose.connection.on("disconnected", async () => {
    console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    try {
      let uri = process.env.MONGODB_URI;
      // If we're using the embedded server, get its URI
      if (mongodInstance) {
        uri = mongodInstance.getUri();
      }
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("✅ MongoDB reconnected.");
    } catch (e) {
      console.error("❌ Reconnection failed:", e.message);
    }
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
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

process.on("SIGINT", stopDB);
process.on("SIGTERM", stopDB);

module.exports = connectDB;
