/**
 * routes/support.routes.js
 * Developer Support & Admin Inbox API Endpoints
 */

const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/support.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

// User route — send support message (authenticated users only)
router.post('/', requireAuth, SupportController.sendMessage);

// Admin routes — inbox viewing and database cleanup/reset
router.get('/admin', requireAuth, requireAdmin, SupportController.getAdminMessages);
router.delete('/admin', requireAuth, requireAdmin, SupportController.clearAllMessages);
router.delete('/admin/:id', requireAuth, requireAdmin, SupportController.deleteSingleMessage);

module.exports = router;
