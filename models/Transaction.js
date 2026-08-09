/**
 * models/Transaction.js
 * Mongoose Schema for Credit Purchases and Slide Generation Usage Logs
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'usage', 'bonus'],
      required: true,
    },
    packageId: {
      type: String,
    },
    amountInRs: {
      type: Number,
      default: 0,
    },
    credits: {
      type: Number,
      required: true,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
