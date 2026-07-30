/**
 * routes/history.routes.js
 */

const express = require('express');
const HistoryController = require('../controllers/history.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/history', requireAuth, HistoryController.getHistory);
router.delete('/history/:id', requireAuth, HistoryController.deleteHistoryItem);
router.post('/history/bulk-delete', requireAuth, HistoryController.bulkDeleteHistory);

module.exports = router;
