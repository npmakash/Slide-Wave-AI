/**
 * controllers/admin.controller.js
 * Admin Operations: User listing, credit granting, system analytics
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const CreditService = require('../services/CreditService');
const logger = require('../utils/logger');

const CREDITS_FILE = path.join(__dirname, '..', 'data', 'credits.json');
const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function readLocalCredits() {
  if (!fs.existsSync(CREDITS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}

class AdminController {
  /** GET /api/admin/users — List all registered users and credit details */
  static async getAllUsers(req, res) {
    try {
      const historyList = readHistory();
      const userSlideCounts = {};

      for (const h of historyList) {
        const email = (h.userEmail || 'anonymous').toLowerCase();
        userSlideCounts[email] = (userSlideCounts[email] || 0) + (h.slideCount || 1);
      }

      let userList = [];

      if (isMongoConnected()) {
        const mongoUsers = await User.find().sort({ createdAt: -1 });
        userList = mongoUsers.map((u) => {
          const email = u.email.toLowerCase();
          return {
            id: u._id.toString(),
            email: u.email,
            name: u.name || email.split('@')[0],
            picture: u.picture,
            credits: u.credits,
            totalSlidesGenerated: userSlideCounts[email] || 0,
            createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
          };
        });
      } else {
        const localData = readLocalCredits();
        const emails = Object.keys(localData);

        userList = emails.map((email) => ({
          id: `local_${email}`,
          email,
          name: email.split('@')[0],
          picture: null,
          credits: localData[email].balance || 0,
          totalSlidesGenerated: userSlideCounts[email.toLowerCase()] || 0,
          createdAt: new Date().toISOString(),
        }));
      }

      res.json({
        success: true,
        count: userList.length,
        users: userList,
      });
    } catch (err) {
      logger.error(`Admin getAllUsers error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** GET /api/admin/stats — Aggregate system analytics */
  static async getAdminStats(req, res) {
    try {
      const historyList = readHistory();
      const totalSlidesGenerated = historyList.reduce((acc, curr) => acc + (curr.slideCount || 1), 0);
      const totalHistoryCount = historyList.length;

      let totalUsers = 0;
      let totalActiveCredits = 0;

      if (isMongoConnected()) {
        totalUsers = await User.countDocuments();
        const creditSum = await User.aggregate([
          { $group: { _id: null, totalCredits: { $sum: '$credits' } } },
        ]);
        totalActiveCredits = creditSum[0]?.totalCredits || 0;
      } else {
        const localData = readLocalCredits();
        const emails = Object.keys(localData);
        totalUsers = emails.length;
        totalActiveCredits = emails.reduce((acc, email) => acc + (localData[email].balance || 0), 0);
      }

      res.json({
        success: true,
        stats: {
          totalUsers,
          totalActiveCredits,
          totalSlidesGenerated,
          totalHistoryCount,
        },
      });
    } catch (err) {
      logger.error(`Admin getAdminStats error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** POST /api/admin/credits/add — Admin direct credit grant */
  static async addCreditsToUser(req, res) {
    try {
      const { email, amount, reason } = req.body;

      if (!email || !amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Valid target user email and positive credit amount required.' });
      }

      const targetEmail = email.toLowerCase().trim();
      const creditToAdd = Number(amount);
      const note = reason || `Admin granted ${creditToAdd} credits`;

      if (isMongoConnected()) {
        let user = await User.findOne({ email: targetEmail });
        if (!user) {
          user = await User.create({
            email: targetEmail,
            name: targetEmail.split('@')[0],
            credits: 0,
          });
        }

        user.credits += creditToAdd;
        await user.save();

        await Transaction.create({
          userId: user._id,
          userEmail: targetEmail,
          type: 'bonus',
          credits: creditToAdd,
          description: `👑 ${note}`,
        });

        logger.info(`👑 Admin added ${creditToAdd} credits to ${targetEmail}. New balance: ${user.credits}`);

        return res.json({
          success: true,
          email: targetEmail,
          newBalance: user.credits,
          added: creditToAdd,
          message: `Successfully granted ${creditToAdd} credits to ${targetEmail}`,
        });
      }

      // Local JSON fallback
      const localData = readLocalCredits();
      if (!localData[targetEmail]) {
        localData[targetEmail] = { balance: 0, transactions: [] };
      }

      localData[targetEmail].balance += creditToAdd;
      localData[targetEmail].transactions.unshift({
        id: `tx_${Date.now()}_admin_bonus`,
        type: 'bonus',
        credits: creditToAdd,
        description: `👑 ${note}`,
        date: new Date().toISOString(),
      });

      fs.writeFileSync(CREDITS_FILE, JSON.stringify(localData, null, 2), 'utf-8');
      logger.info(`👑 Admin added ${creditToAdd} credits to ${targetEmail}. New balance: ${localData[targetEmail].balance}`);

      res.json({
        success: true,
        email: targetEmail,
        newBalance: localData[targetEmail].balance,
        added: creditToAdd,
        message: `Successfully granted ${creditToAdd} credits to ${targetEmail}`,
      });
    } catch (err) {
      logger.error(`Admin addCreditsToUser error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = AdminController;
