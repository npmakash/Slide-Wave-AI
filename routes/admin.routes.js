/**
 * routes/admin.routes.js
 * Admin Endpoints for User Management & Credit Allocation
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', AdminController.getAllUsers);
router.get('/stats', AdminController.getAdminStats);
router.post('/credits/add', AdminController.addCreditsToUser);

module.exports = router;
