/**
 * controllers/auth.controller.js
 * OAuth login, callback, status, logout with real-time credit syncing
 */

const GoogleAuthService = require('../services/GoogleAuthService');
const CreditService = require('../services/CreditService');
const MobileAuthTicket = require('../models/MobileAuthTicket');
const { ADMIN_EMAIL } = require('../middleware/admin.middleware');
const logger = require('../utils/logger');
const crypto = require('crypto');
const mongoose = require('mongoose');

const MOBILE_TICKET_TTL_MS = 2 * 60 * 1000;

function saveSession(session) {
  return new Promise((resolve, reject) => {
    session.save((err) => (err ? reject(err) : resolve()));
  });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function getStoredSession(store, sessionId) {
  return new Promise((resolve, reject) => {
    store.get(sessionId, (err, session) => (err ? reject(err) : resolve(session)));
  });
}

function destroyStoredSession(store, sessionId) {
  return new Promise((resolve, reject) => {
    store.destroy(sessionId, (err) => (err ? reject(err) : resolve()));
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('base64url');
}

function mobileRedirect(error) {
  return `slidewave://auth?error=${encodeURIComponent(error)}`;
}

class AuthController {
  /** GET /auth/google */
  static async login(req, res) {
    try {
      const isMobile = req.query.client === 'android';
      const codeChallenge = req.query.code_challenge;
      if (isMobile && (
        typeof codeChallenge !== 'string'
        || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)
      )) {
        return res.status(400).json({ error: 'A valid mobile code challenge is required.' });
      }

      await regenerateSession(req);
      const state = crypto.randomBytes(32).toString('base64url');
      req.session.oauthState = state;
      req.session.mobileAuth = isMobile;
      if (isMobile) req.session.mobileCodeChallenge = codeChallenge;
      await saveSession(req.session);

      const authUrl = GoogleAuthService.getAuthorizationUrl(state);
      logger.info(`Generated OAuth Auth URL: ${authUrl}`);
      res.redirect(authUrl);
    } catch (err) {
      logger.error(`Login error: ${err.message}`);
      res.status(500).json({ error: 'Failed to initiate Google OAuth flow.' });
    }
  }

  /** GET /auth/google/callback */
  static async callback(req, res) {
    const { code, error, state } = req.query;
    logger.info(`OAuth Callback received. Query params: code=${code ? 'PRESENT' : 'MISSING'}, error=${error || 'NONE'}`);

    const isMobile = req.session?.mobileAuth === true;
    const codeChallenge = req.session?.mobileCodeChallenge;
    if (!req.session?.oauthState || typeof state !== 'string' || state !== req.session.oauthState) {
      return res.redirect(isMobile ? mobileRedirect('oauth_state_mismatch') : '/?error=oauth_state_mismatch');
    }

    delete req.session.oauthState;
    delete req.session.mobileAuth;
    delete req.session.mobileCodeChallenge;
    try {
      await saveSession(req.session);
    } catch (err) {
      logger.error(`OAuth state cleanup error: ${err.message}`);
      return res.redirect(isMobile ? mobileRedirect('oauth_failed') : '/?error=oauth_failed');
    }

    if (error) {
      logger.warn(`OAuth callback error: ${error}`);
      return res.redirect(isMobile ? mobileRedirect('oauth_denied') : '/?error=oauth_denied');
    }

    if (!code) {
      return res.redirect(isMobile ? mobileRedirect('missing_code') : '/?error=missing_code');
    }

    try {
      const tokens = await GoogleAuthService.exchangeCode(code);

      const auth = GoogleAuthService.getClientFromSession({ tokens });
      const googleUserInfo = await GoogleAuthService.getUserInfo(auth);

      // Sync user profile & credits with MongoDB
      const dbUser = await CreditService.syncUserWithDB(googleUserInfo);
      const isAdmin = Boolean(dbUser.email && dbUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      const user = {
        ...dbUser,
        isAdmin,
      };

      await regenerateSession(req);
      req.session.tokens = tokens;
      req.session.user = user;
      await saveSession(req.session);

      logger.info(`User logged in (Admin=${isAdmin}): ${dbUser.email}`);

      if (isMobile) {
        if (mongoose.connection.readyState !== 1) {
          logger.error('Cannot create mobile OAuth ticket without a MongoDB connection.');
          return res.redirect(mobileRedirect('mobile_auth_unavailable'));
        }

        const ticket = crypto.randomBytes(32).toString('base64url');
        await MobileAuthTicket.create({
          ticketHash: sha256(ticket),
          sessionId: req.sessionID,
          codeChallenge,
          expiresAt: new Date(Date.now() + MOBILE_TICKET_TTL_MS),
        });
        return res.redirect(`slidewave://auth?ticket=${encodeURIComponent(ticket)}`);
      }

      res.redirect('/?login=success');
    } catch (err) {
      logger.error(`OAuth callback exchange error: ${err.message}`);
      res.redirect(isMobile ? mobileRedirect('oauth_failed') : '/?error=oauth_failed');
    }
  }

  /** POST /auth/mobile/exchange */
  static async exchangeMobile(req, res) {
    const { ticket, codeVerifier } = req.body || {};
    if (
      typeof ticket !== 'string'
      || !/^[A-Za-z0-9_-]{43}$/.test(ticket)
      || typeof codeVerifier !== 'string'
      || !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)
    ) {
      return res.status(400).json({ error: 'A valid mobile ticket and verifier are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Mobile sign-in is temporarily unavailable.' });
    }

    try {
      const ticketHash = sha256(ticket);
      const pendingTicket = await MobileAuthTicket.findOne({
        ticketHash,
        expiresAt: { $gt: new Date() },
      });
      if (!pendingTicket) {
        return res.status(401).json({ error: 'The mobile sign-in ticket is invalid or expired.' });
      }

      const verifierChallenge = sha256(codeVerifier);
      const expectedChallenge = Buffer.from(pendingTicket.codeChallenge);
      const actualChallenge = Buffer.from(verifierChallenge);
      if (
        expectedChallenge.length !== actualChallenge.length
        || !crypto.timingSafeEqual(expectedChallenge, actualChallenge)
      ) {
        return res.status(401).json({ error: 'The mobile sign-in ticket is invalid or expired.' });
      }

      const claimedTicket = await MobileAuthTicket.findOneAndDelete({
        _id: pendingTicket._id,
        expiresAt: { $gt: new Date() },
      });
      if (!claimedTicket) {
        return res.status(401).json({ error: 'The mobile sign-in ticket is invalid or expired.' });
      }

      const browserSession = await getStoredSession(req.sessionStore, claimedTicket.sessionId);
      if (!browserSession?.tokens || !browserSession?.user) {
        return res.status(401).json({ error: 'The mobile sign-in session has expired.' });
      }

      await regenerateSession(req);
      req.session.tokens = browserSession.tokens;
      req.session.user = browserSession.user;
      await saveSession(req.session);
      await destroyStoredSession(req.sessionStore, claimedTicket.sessionId);

      return res.json({
        authenticated: true,
        user: browserSession.user,
      });
    } catch (err) {
      logger.error(`Mobile OAuth exchange error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to complete mobile sign-in.' });
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
