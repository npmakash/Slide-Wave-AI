/**
 * routes/template.routes.js
 * Slide Templates routes for User viewing and Admin management
 */

const express = require('express');
const router = express.Router();
const TemplateController = require('../controllers/template.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

// Public / Authenticated template fetching
router.get('/', TemplateController.getTemplates);

// Admin-only template management
router.post('/', requireAuth, requireAdmin, TemplateController.createTemplate);
router.put('/:id', requireAuth, requireAdmin, TemplateController.updateTemplate);
router.delete('/:id', requireAuth, requireAdmin, TemplateController.deleteTemplate);

module.exports = router;
