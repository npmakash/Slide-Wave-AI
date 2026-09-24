/**
 * models/History.js
 * Mongoose schema for user slide generation history
 */

const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    outputName: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['sheet', 'json', 'gemini'],
      required: true,
    },
    presentationId: {
      type: String,
      trim: true,
    },
    presentationUrl: {
      type: String,
      trim: true,
    },
    slideCount: {
      type: Number,
      default: 0,
    },
    rowCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.History || mongoose.model('History', historySchema);
