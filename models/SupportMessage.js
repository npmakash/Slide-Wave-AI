/**
 * models/SupportMessage.js
 * Mongoose Schema for Developer Support Messages sent by users to Admin
 */

const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userPicture: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.SupportMessage || mongoose.model('SupportMessage', supportMessageSchema);
