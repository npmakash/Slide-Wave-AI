/**
 * config/google.config.js
 * Google OAuth2 client configuration and scope definitions
 */

const { google } = require('googleapis');

/**
 * Required OAuth 2.0 scopes for full functionality
 */
const SCOPES = [
  'https://www.googleapis.com/auth/drive',              // Full Drive access (copy, delete, export)
  'https://www.googleapis.com/auth/presentations',      // Read/write Slides
  'https://www.googleapis.com/auth/spreadsheets.readonly', // Read Sheets
  'https://www.googleapis.com/auth/userinfo.email',     // User email for display
  'https://www.googleapis.com/auth/userinfo.profile',   // User profile
];

/**
 * Create a fresh OAuth2 client instance
 * @returns {import('googleapis').Auth.OAuth2Client}
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  );
}

/**
 * Get the Google OAuth2 authorization URL
 * @returns {string} Authorization URL to redirect user to
 */
function getAuthUrl() {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',       // Get refresh token
    prompt: 'consent',            // Always show consent screen (ensures refresh token)
    scope: SCOPES,
  });
}

module.exports = { createOAuth2Client, getAuthUrl, SCOPES };
