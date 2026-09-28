/**
 * services/CouponService.js
 * Coupon logic supporting MongoDB atomic operations & local JSON fallback
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const CreditService = require('./CreditService');
const logger = require('../utils/logger');

const COUPONS_FILE = path.join(__dirname, '..', 'data', 'coupons.json');

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function normalizeCode(code) {
  if (!code) return '';
  return String(code).toUpperCase().trim();
}

function normalizeEmail(email) {
  if (!email) return 'anonymous';
  return String(email).toLowerCase().trim();
}

class CouponService {
  /** Local JSON fallback helpers */
  static _ensureFile() {
    try {
      const dataDir = path.dirname(COUPONS_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (!fs.existsSync(COUPONS_FILE)) fs.writeFileSync(COUPONS_FILE, JSON.stringify([]), 'utf-8');
    } catch (err) {}
  }

  static _readData() {
    CouponService._ensureFile();
    try {
      return JSON.parse(fs.readFileSync(COUPONS_FILE, 'utf-8') || '[]');
    } catch (err) {
      return [];
    }
  }

  static _saveData(data) {
    CouponService._ensureFile();
    try {
      fs.writeFileSync(COUPONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {}
  }

  /**
   * Create a new coupon (Admin)
   */
  static async createCoupon({ code, credits, maxUses = 1, expiresAt = null, createdBy = 'admin' }) {
    const cleanCode = normalizeCode(code);
    const creditAmount = Number(credits);
    const usesLimit = Number(maxUses);

    if (!cleanCode) throw new Error('Coupon code is required.');
    if (isNaN(creditAmount) || creditAmount <= 0) throw new Error('Valid positive credit amount required.');
    if (isNaN(usesLimit) || usesLimit <= 0) throw new Error('Valid max usages limit required.');

    let parsedExpiry = null;
    if (expiresAt) {
      parsedExpiry = new Date(expiresAt);
      if (isNaN(parsedExpiry.getTime())) throw new Error('Invalid expiration date format.');
    }

    if (isMongoConnected()) {
      const existing = await Coupon.findOne({ code: cleanCode });
      if (existing) throw new Error(`Coupon code '${cleanCode}' already exists.`);

      const newCoupon = await Coupon.create({
        code: cleanCode,
        credits: creditAmount,
        maxUses: usesLimit,
        expiresAt: parsedExpiry,
        createdBy,
      });

      logger.info(`🎟️ MongoDB: Created Coupon ${cleanCode} (+${creditAmount} credits, max uses: ${usesLimit})`);
      return newCoupon;
    }

    // Local JSON fallback
    const localCoupons = CouponService._readData();
    if (localCoupons.some((c) => c.code === cleanCode)) {
      throw new Error(`Coupon code '${cleanCode}' already exists.`);
    }

    const newCoupon = {
      _id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      code: cleanCode,
      credits: creditAmount,
      maxUses: usesLimit,
      usedCount: 0,
      expiresAt: parsedExpiry ? parsedExpiry.toISOString() : null,
      isActive: true,
      createdBy,
      redeemedBy: [],
      createdAt: new Date().toISOString(),
    };

    localCoupons.unshift(newCoupon);
    CouponService._saveData(localCoupons);
    logger.info(`🎟️ Local fallback: Created Coupon ${cleanCode}`);
    return newCoupon;
  }

  /**
   * List all coupons (Admin)
   */
  static async getAllCoupons() {
    let list = [];
    const now = new Date();

    if (isMongoConnected()) {
      const mongoCoupons = await Coupon.find().sort({ createdAt: -1 });
      list = mongoCoupons.map((c) => c.toObject());
    } else {
      list = CouponService._readData();
    }

    return list.map((c) => {
      const expiresAtDate = c.expiresAt ? new Date(c.expiresAt) : null;
      const isExpired = expiresAtDate && expiresAtDate < now;
      const isExhausted = c.usedCount >= c.maxUses;

      let computedStatus = 'active';
      if (!c.isActive) computedStatus = 'disabled';
      else if (isExpired) computedStatus = 'expired';
      else if (isExhausted) computedStatus = 'exhausted';

      return {
        id: c._id ? c._id.toString() : c.id,
        code: c.code,
        credits: c.credits,
        maxUses: c.maxUses,
        usedCount: c.usedCount || 0,
        expiresAt: c.expiresAt,
        isActive: c.isActive,
        status: computedStatus,
        redeemedByCount: (c.redeemedBy || []).length,
        createdAt: c.createdAt,
      };
    });
  }

  /**
   * Delete coupon by ID (Admin)
   */
  static async deleteCoupon(couponId) {
    if (!couponId) throw new Error('Coupon ID required.');

    if (isMongoConnected()) {
      await Coupon.findByIdAndDelete(couponId);
      logger.info(`🎟️ MongoDB: Deleted coupon ${couponId}`);
      return true;
    }

    const localCoupons = CouponService._readData();
    const updated = localCoupons.filter((c) => c._id !== couponId && c.id !== couponId);
    CouponService._saveData(updated);
    logger.info(`🎟️ Local fallback: Deleted coupon ${couponId}`);
    return true;
  }

  /**
   * Redeem coupon code for a user
   */
  static async redeemCoupon(rawCode, userEmail) {
    const code = normalizeCode(rawCode);
    const email = normalizeEmail(userEmail);

    if (!code) throw new Error('Please enter a coupon code.');
    if (!email || email === 'anonymous') throw new Error('Authentication required to redeem coupons.');

    const now = new Date();

    if (isMongoConnected()) {
      const coupon = await Coupon.findOne({ code });
      if (!coupon) throw new Error('Invalid coupon code. Please check and try again.');
      if (!coupon.isActive) throw new Error('This coupon is no longer active.');

      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        throw new Error('This coupon has expired.');
      }

      if (coupon.usedCount >= coupon.maxUses) {
        throw new Error('This coupon code usage limit has been reached.');
      }

      const alreadyRedeemed = coupon.redeemedBy.some(
        (r) => normalizeEmail(r.userEmail) === email
      );
      if (alreadyRedeemed) {
        throw new Error('You have already redeemed this coupon code.');
      }

      // Atomically update coupon usages and push redemption log
      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: coupon._id,
          usedCount: { $lt: coupon.maxUses },
          'redeemedBy.userEmail': { $ne: email },
        },
        {
          $inc: { usedCount: 1 },
          $push: { redeemedBy: { userEmail: email, redeemedAt: now } },
        },
        { new: true }
      );

      if (!updatedCoupon) {
        throw new Error('Coupon redemption failed. Usage limit reached or already claimed.');
      }

      // Grant credits to user account
      const newBalance = await CreditService.grantCredits(
        email,
        updatedCoupon.credits,
        `Redeemed Coupon: ${updatedCoupon.code}`
      );

      logger.info(`🎟️ MongoDB: User ${email} redeemed coupon ${code} (+${updatedCoupon.credits} credits). New balance: ${newBalance}`);

      return {
        success: true,
        code: updatedCoupon.code,
        creditsAdded: updatedCoupon.credits,
        newBalance,
        message: `🎉 Success! Added ${updatedCoupon.credits} credits to your account.`,
      };
    }

    // Local JSON fallback
    const localCoupons = CouponService._readData();
    const couponIndex = localCoupons.findIndex((c) => c.code === code);

    if (couponIndex === -1) throw new Error('Invalid coupon code. Please check and try again.');
    const coupon = localCoupons[couponIndex];

    if (!coupon.isActive) throw new Error('This coupon is no longer active.');

    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      throw new Error('This coupon has expired.');
    }

    if (coupon.usedCount >= coupon.maxUses) {
      throw new Error('This coupon code usage limit has been reached.');
    }

    const alreadyRedeemed = (coupon.redeemedBy || []).some(
      (r) => normalizeEmail(r.userEmail) === email
    );
    if (alreadyRedeemed) {
      throw new Error('You have already redeemed this coupon code.');
    }

    coupon.usedCount = (coupon.usedCount || 0) + 1;
    if (!coupon.redeemedBy) coupon.redeemedBy = [];
    coupon.redeemedBy.push({ userEmail: email, redeemedAt: now.toISOString() });

    CouponService._saveData(localCoupons);

    const newBalance = await CreditService.grantCredits(
      email,
      coupon.credits,
      `Redeemed Coupon: ${coupon.code}`
    );

    logger.info(`🎟️ Local fallback: User ${email} redeemed coupon ${code} (+${coupon.credits} credits). New balance: ${newBalance}`);

    return {
      success: true,
      code: coupon.code,
      creditsAdded: coupon.credits,
      newBalance,
      message: `🎉 Success! Added ${coupon.credits} credits to your account.`,
    };
  }
}

module.exports = CouponService;
