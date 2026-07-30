/**
 * controllers/gemini.controller.js
 * API controller for Gemini AI question generation & text parsing
 */

const GeminiService = require('../services/GeminiService');
const logger = require('../utils/logger');

class GeminiController {
  /** POST /api/gemini/generate-questions */
  static async generateQuestions(req, res) {
    try {
      const { topic, count = 5, difficulty = 'medium', apiKey } = req.body;

      if (!topic || typeof topic !== 'string' || !topic.trim()) {
        return res.status(400).json({ error: 'Topic is required.' });
      }

      const questions = await GeminiService.generateQuestions({
        topic: topic.trim(),
        count: parseInt(count, 10) || 5,
        difficulty,
        userApiKey: apiKey ? apiKey.trim() : undefined,
      });

      res.json({
        success: true,
        count: questions.length,
        data: questions,
      });
    } catch (err) {
      logger.error(`Gemini Controller error: ${err.message}`);
      res.status(400).json({
        error: err.message || 'Failed to generate questions via Gemini AI.',
      });
    }
  }

  /** POST /api/gemini/parse-text */
  static async parseText(req, res) {
    try {
      const { rawText, apiKey } = req.body;

      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        return res.status(400).json({ error: 'Raw text is required.' });
      }

      const questions = await GeminiService.parseRawText({
        rawText: rawText.trim(),
        userApiKey: apiKey ? apiKey.trim() : undefined,
      });

      res.json({
        success: true,
        count: questions.length,
        data: questions,
      });
    } catch (err) {
      logger.error(`Gemini Controller parse error: ${err.message}`);
      res.status(400).json({
        error: err.message || 'Failed to parse raw text into questions.',
      });
    }
  }
}

module.exports = GeminiController;
