/**
 * Short-lived, single-use ticket used to transfer an OAuth browser session to Android.
 */

const mongoose = require('mongoose');

const mobileAuthTicketSchema = new mongoose.Schema({
  ticketHash: {
    type: String,
    required: true,
    unique: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  codeChallenge: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
});

module.exports = mongoose.models.MobileAuthTicket
  || mongoose.model('MobileAuthTicket', mobileAuthTicketSchema);
