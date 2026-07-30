/**
 * services/GoogleAuthService.js
 * Manages OAuth2 client lifecycle and token persistence in session
 */

const { google } = require('googleapis');
const { createOAuth2Client, getAuthUrl } = require('../config/google.config');
const logger = require('../utils/logger');

class GoogleAuthService {
  /**
   * Get the OAuth2 authorization URL
   * @returns {string}
   */
  static getAuthorizationUrl() {
    return getAuthUrl();
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<object>} Token credentials
   */
  static async exchangeCode(code) {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    logger.info('OAuth tokens obtained successfully');
    return tokens;
  }

  /**
   * Get an authenticated OAuth2 client from session tokens
   * @param {object} session - Express session object
   * @returns {import('googleapis').Auth.OAuth2Client}
   */
  static getClientFromSession(session) {
    if (!session?.tokens) {
      throw Object.assign(new Error('Not authenticated'), { status: 401, code: 'UNAUTHENTICATED' });
    }
    const client = createOAuth2Client();
    client.setCredentials(session.tokens);
    return client;
  }

  /**
   * Fetch the authenticated user's profile information
   * @param {import('googleapis').Auth.OAuth2Client} auth
   * @returns {Promise<object>} User info (name, email, picture)
   */
  static async getUserInfo(auth) {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const { data } = await oauth2.userinfo.get();
    return {
      name: data.name,
      email: data.email,
      picture: data.picture,
    };
  }

  /**
   * Revoke the access token and clear session
   * @param {object} session
   */
  static async revokeToken(session) {
    if (session?.tokens?.access_token) {
      try {
        const client = createOAuth2Client();
        await client.revokeToken(session.tokens.access_token);
        logger.info('OAuth token revoked');
      } catch (err) {
        logger.warn(`Token revocation failed (continuing): ${err.message}`);
      }
    }
  }
}

module.exports = GoogleAuthService;
