/**
 * config/db.js
 * Scalable MongoDB database connection module using Mongoose with auto-retry
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

function isPlaceholderURI(uri) {
  if (!uri) return true;
  if (
    uri.includes('<') ||
    uri.includes('>') ||
    uri.includes('cluster.mongodb.net') ||
    uri.includes('cluster0.mongodb.net') ||
    uri.includes('username:password')
  ) {
    return true;
  }
  return false;
}

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slidewave';

  if (isPlaceholderURI(mongoURI)) {
    logger.warn('⚠️ MONGODB_URI contains an unconfigured placeholder hostname (e.g., cluster.mongodb.net).');
    logger.warn('⚠️ Please set a valid MongoDB Atlas connection URI (e.g. cluster0.xxxx.mongodb.net) in environment variables.');
    logger.warn('⚠️ Server continuing with local persistence mode.');
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000, // Timeout after 8s
      connectTimeoutMS: 8000,
    });
    isConnected = true;
    logger.info(`🍃 MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB Runtime Error: ${err.message}`);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB Disconnected. Attempting reconnection...');
      isConnected = false;
    });

    return conn;
  } catch (err) {
    logger.error(`❌ MongoDB Initial Connection Error: ${err.message}`);
    logger.warn('⚠️ Server continuing with local persistence mode.');
    return null;
  }
}

module.exports = connectDB;
module.exports.isPlaceholderURI = isPlaceholderURI;
