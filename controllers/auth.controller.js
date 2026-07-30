/**
 * controllers/auth.controller.js
 * OAuth login, callback, status, logout
 */

const GoogleAuthService = require('../services/GoogleAuthService');
const logger = require('../utils/logger');

class AuthController {
  /** GET /auth/google */
  static async login(req, res) {
    try {
      const authUrl = GoogleAuthService.getAuthorizationUrl();
      logger.info(`Generated OAuth Auth URL: ${authUrl}`);
      res.redirect(authUrl);
    } catch (err) {
      logger.error(`Login error: ${err.message}`);
      res.status(500).json({ error: 'Failed to initiate Google OAuth flow.' });
    }
  }

  /** GET /auth/google/callback */
  static async callback(req, res) {
    const { code, error } = req.query;
    logger.info(`OAuth Callback received. Query params: code=${code ? 'PRESENT' : 'MISSING'}, error=${error || 'NONE'}`);

    if (error) {
      logger.warn(`OAuth callback error: ${error}`);
      return res.redirect('/?error=oauth_denied');
    }

    if (!code) {
      return res.redirect('/?error=missing_code');
    }

    try {
      const tokens = await GoogleAuthService.exchangeCode(code);
      req.session.tokens = tokens;

      const auth = GoogleAuthService.getClientFromSession(req.session);
      const userInfo = await GoogleAuthService.getUserInfo(auth);
      req.session.user = userInfo;

      await new Promise((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );

      logger.info(`User logged in: ${userInfo.email}`);
      res.redirect('/?login=success');
    } catch (err) {
      logger.error(`OAuth callback exchange error: ${err.message}`);
      res.redirect('/?error=oauth_failed');
    }
  }

  /** GET /auth/status */
  static async status(req, res) {
    if (req.session?.tokens && req.session?.user) {
      return res.json({
        authenticated: true,
        user: req.session.user,
      });
    }
    return res.json({ authenticated: false });
  }

  /** POST /auth/logout */
  static async logout(req, res) {
    try {
      await GoogleAuthService.revokeToken(req.session);
    } catch (err) {
      // ignore
    }
    req.session.destroy((err) => {
      if (err) logger.error(`Session destroy error: ${err.message}`);
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  }
}

module.exports = AuthController;
