/**
 * config/db.js
 * MongoDB database connection module using Mongoose
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slidewave';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if MongoDB service unavailable
    });
    logger.info(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.error(`❌ MongoDB Connection Error: ${err.message}`);
    logger.warn('⚠️ Server continuing with fallback memory state. Ensure MongoDB service is running on your system.');
  }
}

module.exports = connectDB;
