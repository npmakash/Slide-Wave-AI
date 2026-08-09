/**
 * models/User.js
 * Mongoose Schema for User Accounts and Credits
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    googleId: {
      type: String,
    },
    name: {
      type: String,
      default: 'Slide Wave User',
    },
    picture: {
      type: String,
    },
    credits: {
      type: Number,
      default: 0, // Default 0 credits for new users
      min: 0,
    },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
