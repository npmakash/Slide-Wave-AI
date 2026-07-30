/**
 * middleware/auth.middleware.js
 * Protect routes that require an authenticated Google session
 */

/**
 * requireAuth — middleware that checks session for valid tokens
 * Automatically refreshes the access token if expired
 */
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.tokens) {
    return res.status(401).json({
      error: 'Not authenticated. Please sign in with Google.',
      code: 'UNAUTHENTICATED',
    });
  }

  // Check if access token is expired (with 60s buffer)
  const { tokens } = req.session;
  const now = Date.now();
  const expiryDate = tokens.expiry_date || 0;

  if (expiryDate - now < 60_000) {
    // Token is expired or about to expire — attempt refresh
    if (!tokens.refresh_token) {
      return res.status(401).json({
        error: 'Session expired. Please sign in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    try {
      const { createOAuth2Client } = require('../config/google.config');
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(tokens);
      const { credentials } = await oauth2Client.refreshAccessToken();
      req.session.tokens = { ...tokens, ...credentials };
      await new Promise((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );
    } catch (err) {
      return res.status(401).json({
        error: 'Failed to refresh session. Please sign in again.',
        code: 'TOKEN_REFRESH_FAILED',
      });
    }
  }

  next();
}

module.exports = { requireAuth };
