/**
 * routes/download.routes.js
 */

const express = require('express');
const DownloadController = require('../controllers/download.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/download/pdf/:id', requireAuth, DownloadController.downloadPdf);
router.get('/download/images/:id', requireAuth, DownloadController.downloadImages);

module.exports = router;
