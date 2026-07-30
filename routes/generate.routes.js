/**
 * routes/generate.routes.js
 */

const express = require('express');
const GenerateController = require('../controllers/generate.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  validateBody,
  generateSheetSchema,
  generateJsonSchema,
  detectPlaceholderSchema,
} = require('../middleware/validate.middleware');
const { generateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/detect-placeholders',
  requireAuth,
  validateBody(detectPlaceholderSchema),
  GenerateController.detectPlaceholders
);

router.post(
  '/generate-sheet',
  requireAuth,
  generateLimiter,
  validateBody(generateSheetSchema),
  GenerateController.generateFromSheet
);

router.post(
  '/generate-json',
  requireAuth,
  generateLimiter,
  validateBody(generateJsonSchema),
  GenerateController.generateFromJson
);

router.get('/status/:jobId', requireAuth, GenerateController.getStatus);
router.post('/cancel/:jobId', requireAuth, GenerateController.cancelJob);
router.get('/logs/:jobId', requireAuth, GenerateController.getLogs);

module.exports = router;
