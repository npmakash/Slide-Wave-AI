/**
 * routes/gemini.routes.js
 */

const express = require('express');
const GeminiController = require('../controllers/gemini.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/gemini/generate-questions', requireAuth, GeminiController.generateQuestions);
router.post('/gemini/parse-text', requireAuth, GeminiController.parseText);

module.exports = router;
