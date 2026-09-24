/**
 * controllers/auth.controller.js
 * OAuth login, callback, status, logout with real-time credit syncing
 */

const GoogleAuthService = require('../services/GoogleAuthService');
const CreditService = require('../services/CreditService');
const { ADMIN_EMAIL } = require('../middleware/admin.middleware');
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
      const googleUserInfo = await GoogleAuthService.getUserInfo(auth);

      // Sync user profile & credits with MongoDB
      const dbUser = await CreditService.syncUserWithDB(googleUserInfo);
      const isAdmin = Boolean(dbUser.email && dbUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      req.session.user = {
        ...dbUser,
        isAdmin,
      };

      await new Promise((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );

      logger.info(`User logged in (Admin=${isAdmin}): ${dbUser.email}`);

      res.redirect('/?login=success');
    } catch (err) {
      logger.error(`OAuth callback exchange error: ${err.message}`);
      res.redirect('/?error=oauth_failed');
    }
  }

  /** GET /auth/status */
  static async status(req, res) {
    if (req.session?.tokens && req.session?.user) {
      const isAdmin = Boolean(req.session.user.email && req.session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      // Always fetch fresh real-time credit balance from CreditService / DB
      let currentCredits = req.session.user.credits || 0;
      try {
        currentCredits = await CreditService.getBalance(req.session.user.email);
        req.session.user.credits = currentCredits;
      } catch (err) {
        logger.warn(`Failed to fetch live balance for ${req.session.user.email}: ${err.message}`);
      }

      return res.json({
        authenticated: true,
        user: {
          ...req.session.user,
          credits: currentCredits,
          isAdmin,
        },
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
