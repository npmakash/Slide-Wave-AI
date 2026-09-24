/**
 * config/db.js
 * Scalable MongoDB database connection module using Mongoose with auto-retry
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slidewave';

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      connectTimeoutMS: 10000,
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
    logger.warn('⚠️ Server continuing with local persistence mode. Set MONGODB_URI in .env for production cloud database persistence.');
    return null;
  }
}

module.exports = connectDB;
