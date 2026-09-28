/**
 * models/Coupon.js
 * Mongoose Schema for Promotional Credit Coupons
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
  },
  maxUses: {
    type: Number,
    default: 1,
    min: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: String,
    default: 'admin',
  },
  redeemedBy: [
    {
      userEmail: { type: String, required: true },
      redeemedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
