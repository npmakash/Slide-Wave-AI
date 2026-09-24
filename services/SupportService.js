/**
 * services/SupportService.js
 * Dual MongoDB & JSON local file persistent manager for Developer Support Messages
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const SupportMessage = require('../models/SupportMessage');
const logger = require('../utils/logger');

const SUPPORT_FILE = path.join(__dirname, '..', 'data', 'support.json');

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

class SupportService {
  static _ensureFile() {
    try {
      const dataDir = path.dirname(SUPPORT_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (!fs.existsSync(SUPPORT_FILE)) fs.writeFileSync(SUPPORT_FILE, JSON.stringify([]), 'utf-8');
    } catch (err) {}
  }

  static _readData() {
    SupportService._ensureFile();
    try {
      const raw = fs.readFileSync(SUPPORT_FILE, 'utf-8');
      return JSON.parse(raw || '[]');
    } catch (err) {
      return [];
    }
  }

  static _saveData(data) {
    SupportService._ensureFile();
    try {
      fs.writeFileSync(SUPPORT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {}
  }

  /** Send a new message from user to Admin */
  static async createMessage({ userEmail, userName, userPicture, message }) {
    if (!userEmail || !message || !message.trim()) {
      throw new Error('User email and non-empty message are required.');
    }

    const cleanEmail = String(userEmail).toLowerCase().trim();
    const cleanMessage = String(message).trim();
    const cleanName = userName || cleanEmail.split('@')[0];
    const cleanPicture = userPicture || '';

    if (isMongoConnected()) {
      try {
        const doc = await SupportMessage.create({
          userEmail: cleanEmail,
          userName: cleanName,
          userPicture: cleanPicture,
          message: cleanMessage,
        });
        logger.info(`💬 Saved Developer Support message to MongoDB from ${cleanEmail}`);
        return {
          id: doc._id.toString(),
          userEmail: doc.userEmail,
          userName: doc.userName,
          userPicture: doc.userPicture,
          message: doc.message,
          createdAt: doc.createdAt.toISOString(),
        };
      } catch (err) {
        logger.error(`MongoDB SupportMessage create error: ${err.message}`);
      }
    }

    // Fallback to local JSON file
    const list = SupportService._readData();
    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userEmail: cleanEmail,
      userName: cleanName,
      userPicture: cleanPicture,
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newMsg);
    SupportService._saveData(list);
    logger.info(`💬 Saved Developer Support message to local file from ${cleanEmail}`);
    return newMsg;
  }

  /** Get all support messages (for Admin Inbox) */
  static async getAllMessages() {
    if (isMongoConnected()) {
      try {
        const docs = await SupportMessage.find().sort({ createdAt: -1 });
        return docs.map((doc) => ({
          id: doc._id.toString(),
          userEmail: doc.userEmail,
          userName: doc.userName,
          userPicture: doc.userPicture,
          message: doc.message,
          createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        }));
      } catch (err) {
        logger.error(`MongoDB SupportMessage getAll error: ${err.message}`);
      }
    }

    return SupportService._readData();
  }

  /** Delete all messages / reset inbox in DB and local storage */
  static async deleteAllMessages() {
    if (isMongoConnected()) {
      try {
        await SupportMessage.deleteMany({});
        logger.info(`🗑️ Deleted all Support Messages from MongoDB`);
      } catch (err) {
        logger.error(`MongoDB SupportMessage deleteMany error: ${err.message}`);
      }
    }

    SupportService._saveData([]);
    logger.info(`🗑️ Cleared local support.json file`);
    return true;
  }

  /** Delete a single message by ID */
  static async deleteMessageById(id) {
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      try {
        await SupportMessage.findByIdAndDelete(id);
        logger.info(`🗑️ Deleted Support Message ${id} from MongoDB`);
        return true;
      } catch (err) {
        logger.error(`MongoDB SupportMessage deleteById error: ${err.message}`);
      }
    }

    // Local fallback deletion
    let list = SupportService._readData();
    list = list.filter((m) => m.id !== id);
    SupportService._saveData(list);
    return true;
  }
}

module.exports = SupportService;
