/**
 * services/CreditService.js
 * Scalable, thread-safe persistent credit balance and transaction manager
 * backed by MongoDB (with automatic local fallback migration)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

const CREDITS_FILE = path.join(__dirname, '..', 'data', 'credits.json');

const CREDIT_PACKAGES = {
  pkg_5: { id: 'pkg_5', amountInRs: 5, credits: 10, bonus: 0, label: '10 Credits' },
  pkg_20: { id: 'pkg_20', amountInRs: 20, credits: 40, bonus: 0, label: '40 Credits' },
  pkg_50: { id: 'pkg_50', amountInRs: 50, credits: 110, bonus: 10, label: '110 Credits' },
  pkg_100: { id: 'pkg_100', amountInRs: 100, credits: 230, bonus: 30, label: '230 Credits' },
};

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function normalizeEmail(email) {
  if (!email) return 'anonymous';
  return String(email).toLowerCase().trim();
}

class CreditService {
  /** Local JSON fallback helpers */
  static _ensureFile() {
    try {
      const dataDir = path.dirname(CREDITS_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (!fs.existsSync(CREDITS_FILE)) fs.writeFileSync(CREDITS_FILE, JSON.stringify({}), 'utf-8');
    } catch (err) {}
  }

  static _readData() {
    CreditService._ensureFile();
    try {
      return JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf-8') || '{}');
    } catch (err) {
      return {};
    }
  }

  static _saveData(data) {
    CreditService._ensureFile();
    try {
      fs.writeFileSync(CREDITS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {}
  }

  /**
   * Synchronize Google OAuth login user with MongoDB
   * Ensures credits are NEVER reset to 0 upon login or server restart.
   */
  static async syncUserWithDB(googleUser) {
    if (!googleUser || !googleUser.email) return googleUser;
    const email = normalizeEmail(googleUser.email);

    if (isMongoConnected()) {
      try {
        let user = await User.findOne({ email });

        if (!user) {
          // Check if user had local json credits before Mongo connection
          const localData = CreditService._readData();
          const localBalance = localData[email]?.balance || 0;

          user = await User.create({
            email,
            googleId: googleUser.id,
            name: googleUser.name || email.split('@')[0],
            picture: googleUser.picture,
            credits: localBalance,
          });

          logger.info(`🍃 Created new MongoDB User: ${user.email} with ${localBalance} initial credits`);
        } else {
          // Update profile details without overwriting credits
          user.name = googleUser.name || user.name;
          user.picture = googleUser.picture || user.picture;
          if (googleUser.id) user.googleId = googleUser.id;
          await user.save();
        }

        return {
          id: user._id.toString(),
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          picture: user.picture,
          credits: user.credits,
        };
      } catch (err) {
        logger.error(`Failed to sync user with MongoDB: ${err.message}`);
      }
    }

    // Local JSON fallback
    const localData = CreditService._readData();
    if (!localData[email]) {
      localData[email] = {
        balance: 0,
        transactions: [],
      };
      CreditService._saveData(localData);
    }

    return {
      ...googleUser,
      email,
      credits: localData[email].balance,
    };
  }

  /**
   * Get full credit info and transactions history for user
   */
  static async getCreditInfo(userKey) {
    const email = normalizeEmail(userKey);

    if (isMongoConnected()) {
      try {
        let user = await User.findOne({ email });

        if (!user && email.includes('@')) {
          const localData = CreditService._readData();
          const localBalance = localData[email]?.balance || 0;

          user = await User.create({
            email,
            name: email.split('@')[0],
            credits: localBalance,
          });
        }

        if (user) {
          const rawTxs = await Transaction.find({ userEmail: email }).sort({ createdAt: -1 }).limit(100);
          const transactions = rawTxs.map((t) => ({
            id: t._id.toString(),
            type: t.type,
            packageId: t.packageId,
            amountInRs: t.amountInRs,
            credits: t.credits,
            razorpayPaymentId: t.razorpayPaymentId,
            razorpayOrderId: t.razorpayOrderId,
            description: t.description,
            date: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
          }));

          return {
            balance: user.credits,
            transactions,
          };
        }
      } catch (err) {
        logger.error(`MongoDB getCreditInfo error: ${err.message}`);
      }
    }

    // Local JSON fallback
    const data = CreditService._readData();
    if (!data[email]) {
      data[email] = {
        balance: 0,
        transactions: [],
      };
      CreditService._saveData(data);
    }
    return data[email];
  }

  /**
   * Get current balance for user
   */
  static async getBalance(userKey) {
    const email = normalizeEmail(userKey);

    if (isMongoConnected()) {
      try {
        const user = await User.findOne({ email });
        if (user) return user.credits;
      } catch (err) {
        logger.error(`MongoDB getBalance error: ${err.message}`);
      }
    }

    const info = await CreditService.getCreditInfo(email);
    return info.balance || 0;
  }

  /**
   * Deduct credits from user account (Atomic MongoDB operation)
   */
  static async deductCredits(userKey, count, description = 'Slide Generation') {
    const email = normalizeEmail(userKey);
    const amountToDeduct = Math.abs(Number(count) || 0);

    if (amountToDeduct <= 0) return await CreditService.getBalance(email);

    if (isMongoConnected()) {
      try {
        // Atomic find & update with balance check
        const user = await User.findOneAndUpdate(
          { email, credits: { $gte: amountToDeduct } },
          { $inc: { credits: -amountToDeduct } },
          { new: true }
        );

        if (!user) {
          const existing = await User.findOne({ email });
          const avail = existing ? existing.credits : 0;
          throw new Error(`Insufficient credits. Required: ${amountToDeduct}, Available: ${avail}`);
        }

        await Transaction.create({
          userId: user._id,
          userEmail: email,
          type: 'usage',
          credits: -amountToDeduct,
          description,
        });

        logger.info(`🍃 MongoDB Atomic: Deducted ${amountToDeduct} credits from ${email}. Remaining: ${user.credits}`);
        return user.credits;
      } catch (err) {
        if (err.message.includes('Insufficient credits')) throw err;
        logger.error(`MongoDB deductCredits error: ${err.message}`);
      }
    }

    // Local JSON fallback
    const data = CreditService._readData();
    if (!data[email]) {
      data[email] = { balance: 0, transactions: [] };
    }

    if (data[email].balance < amountToDeduct) {
      throw new Error(`Insufficient credits. Required: ${amountToDeduct}, Available: ${data[email].balance}`);
    }

    data[email].balance -= amountToDeduct;
    data[email].transactions.unshift({
      id: `tx_${Date.now()}_usage`,
      type: 'usage',
      credits: -amountToDeduct,
      description,
      date: new Date().toISOString(),
    });

    CreditService._saveData(data);
    logger.info(`Local fallback: Deducted ${amountToDeduct} credits from ${email}. Remaining: ${data[email].balance}`);
    return data[email].balance;
  }

  /**
   * Add purchased credits to user account (Atomic MongoDB operation)
   */
  static async addCredits(userKey, packageId, paymentId, orderId) {
    const email = normalizeEmail(userKey);
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new Error(`Invalid credit package: ${packageId}`);

    if (isMongoConnected()) {
      try {
        let user = await User.findOneAndUpdate(
          { email },
          { $inc: { credits: pkg.credits } },
          { new: true }
        );

        if (!user) {
          user = await User.create({
            email,
            name: email.split('@')[0],
            credits: pkg.credits,
          });
        }

        await Transaction.create({
          userId: user._id,
          userEmail: email,
          type: 'purchase',
          packageId: pkg.id,
          amountInRs: pkg.amountInRs,
          credits: pkg.credits,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          description: `Purchased ${pkg.credits} Credits (₹${pkg.amountInRs})`,
        });

        logger.info(`🍃 MongoDB Atomic: Added ${pkg.credits} credits to ${email}. New Balance: ${user.credits}`);
        return user.credits;
      } catch (err) {
        logger.error(`MongoDB addCredits error: ${err.message}`);
      }
    }

    // Local JSON fallback
    const data = CreditService._readData();
    if (!data[email]) {
      data[email] = { balance: 0, transactions: [] };
    }

    data[email].balance += pkg.credits;
    data[email].transactions.unshift({
      id: `tx_${Date.now()}_purchase`,
      type: 'purchase',
      packageId: pkg.id,
      amountInRs: pkg.amountInRs,
      credits: pkg.credits,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      description: `Purchased ${pkg.credits} Credits (₹${pkg.amountInRs})`,
      date: new Date().toISOString(),
    });

    CreditService._saveData(data);
    logger.info(`Local fallback: Added ${pkg.credits} credits to ${email}. New Balance: ${data[email].balance}`);
    return data[email].balance;
  }

  /**
   * Grant bonus/admin credits to user (Atomic MongoDB operation)
   */
  static async grantCredits(userKey, creditAmount, reason = 'Admin granted credits') {
    const email = normalizeEmail(userKey);
    const amountToAdd = Number(creditAmount);

    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      throw new Error('Invalid credit amount to grant.');
    }

    if (isMongoConnected()) {
      try {
        let user = await User.findOneAndUpdate(
          { email },
          { $inc: { credits: amountToAdd } },
          { new: true }
        );

        if (!user) {
          user = await User.create({
            email,
            name: email.split('@')[0],
            credits: amountToAdd,
          });
        }

        await Transaction.create({
          userId: user._id,
          userEmail: email,
          type: 'bonus',
          credits: amountToAdd,
          description: `👑 ${reason}`,
        });

        logger.info(`👑 MongoDB Atomic: Granted ${amountToAdd} credits to ${email}. New Balance: ${user.credits}`);
        return user.credits;
      } catch (err) {
        logger.error(`MongoDB grantCredits error: ${err.message}`);
      }
    }

    // Local JSON fallback
    const data = CreditService._readData();
    if (!data[email]) {
      data[email] = { balance: 0, transactions: [] };
    }

    data[email].balance += amountToAdd;
    data[email].transactions.unshift({
      id: `tx_${Date.now()}_admin_bonus`,
      type: 'bonus',
      credits: amountToAdd,
      description: `👑 ${reason}`,
      date: new Date().toISOString(),
    });

    CreditService._saveData(data);
    logger.info(`👑 Local fallback: Granted ${amountToAdd} credits to ${email}. New Balance: ${data[email].balance}`);
    return data[email].balance;
  }

  static getPackages() {
    return CREDIT_PACKAGES;
  }
}

module.exports = CreditService;
