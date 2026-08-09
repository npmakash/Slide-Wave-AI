/**
 * services/CreditService.js
 * Persistent credit balance and transaction logs backed by MongoDB (with local JSON fallback)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

const CREDITS_FILE = path.join(__dirname, '..', 'data', 'credits.json');
const DEFAULT_INITIAL_CREDITS = 0; // New users start with 0 credits (must purchase credits)

const CREDIT_PACKAGES = {
  pkg_5: { id: 'pkg_5', amountInRs: 5, credits: 10, bonus: 0, label: '10 Credits' },
  pkg_20: { id: 'pkg_20', amountInRs: 20, credits: 40, bonus: 0, label: '40 Credits' },
  pkg_50: { id: 'pkg_50', amountInRs: 50, credits: 110, bonus: 10, label: '110 Credits' },
  pkg_100: { id: 'pkg_100', amountInRs: 100, credits: 230, bonus: 30, label: '230 Credits' },
};

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
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
   * Creates User if new with 0 credits
   */
  static async syncUserWithDB(googleUser) {
    if (!googleUser || !googleUser.email) return googleUser;

    if (isMongoConnected()) {
      try {
        let user = await User.findOne({ email: googleUser.email.toLowerCase() });

        if (!user) {
          user = await User.create({
            email: googleUser.email.toLowerCase(),
            googleId: googleUser.id,
            name: googleUser.name || 'Slide Wave User',
            picture: googleUser.picture,
            credits: 0,
          });

          logger.info(`🍃 Created new MongoDB User: ${user.email} with 0 credits`);
        } else {
          // Update profile attributes
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
    const key = googleUser.email.toLowerCase();
    if (!localData[key]) {
      localData[key] = {
        balance: 0,
        transactions: [],
      };
      CreditService._saveData(localData);
    }

    return {
      ...googleUser,
      credits: localData[key].balance,
    };
  }

  /**
   * Get full credit info and transactions history for user
   */
  static async getCreditInfo(userKey) {
    const email = userKey ? userKey.toLowerCase() : 'default_user';

    if (isMongoConnected()) {
      try {
        let user = await User.findOne({ email });

        if (!user && email.includes('@')) {
          user = await User.create({
            email,
            name: email.split('@')[0],
            credits: 0,
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
            date: t.createdAt.toISOString(),
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
    const info = await CreditService.getCreditInfo(userKey);
    return info.balance || 0;
  }

  /**
   * Deduct credits from user account
   */
  static async deductCredits(userKey, count, description = 'Slide Generation') {
    const email = userKey ? userKey.toLowerCase() : 'default_user';

    if (isMongoConnected()) {
      try {
        let user = await User.findOne({ email });
        if (!user) {
          await CreditService.getCreditInfo(email);
          user = await User.findOne({ email });
        }

        if (!user || user.credits < count) {
          const avail = user ? user.credits : 0;
          throw new Error(`Insufficient credits. Required: ${count}, Available: ${avail}`);
        }

        user.credits -= count;
        await user.save();

        await Transaction.create({
          userId: user._id,
          userEmail: email,
          type: 'usage',
          credits: -count,
          description,
        });

        logger.info(`🍃 MongoDB: Deducted ${count} credits from ${email}. Remaining: ${user.credits}`);
        return user.credits;
      } catch (err) {
        if (err.message.includes('Insufficient credits')) throw err;
        logger.error(`MongoDB deductCredits error: ${err.message}`);
      }
    }

    // Local JSON fallback
    const data = CreditService._readData();
    if (!data[email]) {
      await CreditService.getCreditInfo(email);
      return CreditService.deductCredits(email, count, description);
    }

    if (data[email].balance < count) {
      throw new Error(`Insufficient credits. Required: ${count}, Available: ${data[email].balance}`);
    }

    data[email].balance -= count;
    data[email].transactions.unshift({
      id: `tx_${Date.now()}_usage`,
      type: 'usage',
      credits: -count,
      description,
      date: new Date().toISOString(),
    });

    CreditService._saveData(data);
    logger.info(`Deducted ${count} credits from ${email}. Remaining: ${data[email].balance}`);
    return data[email].balance;
  }

  /**
   * Add purchased credits to user account
   */
  static async addCredits(userKey, packageId, paymentId, orderId) {
    const email = userKey ? userKey.toLowerCase() : 'default_user';
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new Error(`Invalid credit package: ${packageId}`);

    if (isMongoConnected()) {
      try {
        let user = await User.findOne({ email });
        if (!user) {
          await CreditService.getCreditInfo(email);
          user = await User.findOne({ email });
        }

        user.credits += pkg.credits;
        await user.save();

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

        logger.info(`🍃 MongoDB: Added ${pkg.credits} credits to ${email}. New Balance: ${user.credits}`);
        return user.credits;
      } catch (err) {
        logger.error(`MongoDB addCredits error: ${err.message}`);
      }
    }

    // Local JSON fallback
    const data = CreditService._readData();
    if (!data[email]) {
      await CreditService.getCreditInfo(email);
    }

    const currentData = data[email] || (await CreditService.getCreditInfo(email));
    currentData.balance += pkg.credits;
    currentData.transactions.unshift({
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

    data[email] = currentData;
    CreditService._saveData(data);

    logger.info(`Added ${pkg.credits} credits to ${email}. New Balance: ${currentData.balance}`);
    return currentData.balance;
  }

  static getPackages() {
    return CREDIT_PACKAGES;
  }
}

module.exports = CreditService;
