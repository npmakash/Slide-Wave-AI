/**
 * services/GeminiService.js
 * Generates and parses structured JSON questions & options using Gemini AI / Local TSV parser
 */

const axios = require('axios');
const logger = require('../utils/logger');

class GeminiService {
  /**
   * Fast local TSV/tabular text parser for copy-pasted tab-separated questions
   * @param {string} rawText
   * @returns {object[] | null} Array of parsed objects or null if not standard TSV
   */
  static parseLocalTsv(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return null;

    const firstLine = lines[0].toLowerCase();
    // Check if headers contain question / option
    if (firstLine.includes('question') || firstLine.includes('\t')) {
      const results = [];
      const hasHeaders = firstLine.includes('question') || firstLine.includes('option');
      const startIdx = hasHeaders ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split('\t').map((p) => p.trim());
        if (parts.length >= 5) {
          let number, question, optionA, optionB, optionC, optionD;

          if (parts.length >= 6) {
            number = parts[0] || String(results.length + 1);
            question = parts[1] || '';
            optionA = parts[2] || '';
            optionB = parts[3] || '';
            optionC = parts[4] || '';
            optionD = parts[5] || '';
          } else {
            number = String(results.length + 1);
            question = parts[0] || '';
            optionA = parts[1] || '';
            optionB = parts[2] || '';
            optionC = parts[3] || '';
            optionD = parts[4] || '';
          }

          results.push({ number, question, optionA, optionB, optionC, optionD });
        }
      }

      if (results.length > 0) return results;
    }

    return null;
  }

  /**
   * Parse raw pasted text (formatted or informal) into JSON array using Gemini AI
   * @param {object} params
   * @param {string} params.rawText - Raw text containing questions and options
   * @param {string} [params.userApiKey] - Optional Gemini API key
   * @returns {Promise<{ number: string, question: string, optionA: string, optionB: string, optionC: string, optionD: string }[]>}
   */
  static async parseRawText(params) {
    const { rawText, userApiKey } = params;

    if (!rawText || !rawText.trim()) {
      throw new Error('Please paste your questions text.');
    }

    // Try fast local TSV parser first
    const localParsed = GeminiService.parseLocalTsv(rawText);
    if (localParsed) {
      logger.info(`Parsed ${localParsed.length} questions instantly via local TSV parser`);
      return localParsed;
    }

    // Fallback to Gemini AI for informal or unstructured text
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please enter your API Key or set GEMINI_API_KEY in .env.');
    }

    const systemPrompt = `You are an expert data extraction assistant. Convert the following text into a clean JSON array of multiple-choice questions.

Text to parse:
"""
${rawText}
"""

IMPORTANT INSTRUCTION:
Return ONLY a raw JSON array of objects without markdown formatting (no \`\`\`json or \`\`\` wrappers).
Each object MUST have EXACTLY these 6 keys:
- "number": string (e.g. "1", "2", "3")
- "question": string (the question text)
- "optionA": string (option A text)
- "optionB": string (option B text)
- "optionC": string (option C text)
- "optionD": string (option D text)

Example format:
[
  {
    "number": "1",
    "question": "What is the capital of France?",
    "optionA": "Paris",
    "optionB": "London",
    "optionC": "Berlin",
    "optionD": "Madrid"
  }
]`;

    logger.info(`Parsing raw text via Gemini AI...`);

    const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
          },
          { timeout: 30000 }
        );

        const candidates = response.data?.candidates;
        if (!candidates || candidates.length === 0) throw new Error('Empty response from Gemini');

        let textRes = candidates[0]?.content?.parts?.[0]?.text || '';
        textRes = textRes.replace(/```json/gi, '').replace(/```/g, '').trim();

        const questions = JSON.parse(textRes);
        if (!Array.isArray(questions)) throw new Error('Response is not a JSON array');

        return questions.map((q, idx) => ({
          number: String(q.number || idx + 1),
          question: String(q.question || ''),
          optionA: String(q.optionA || q.option_a || ''),
          optionB: String(q.optionB || q.option_b || ''),
          optionC: String(q.optionC || q.option_c || ''),
          optionD: String(q.optionD || q.option_d || ''),
        }));
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(`Failed to parse text via Gemini AI: ${lastError?.response?.data?.error?.message || lastError?.message}`);
  }

  /**
   * Generate quiz questions array from prompt topic using Gemini API
   */
  static async generateQuestions(params) {
    const { topic, count = 5, difficulty = 'medium', userApiKey } = params;
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please enter your API Key or set GEMINI_API_KEY in .env.');
    }

    const systemPrompt = `You are an expert quiz creator. Generate ${count} multiple choice questions about "${topic}" at a ${difficulty} difficulty level.

IMPORTANT INSTRUCTION:
Return ONLY a raw JSON array of objects without any markdown formatting.
Each object MUST have EXACTLY these 6 keys:
- "number": string
- "question": string
- "optionA": string
- "optionB": string
- "optionC": string
- "optionD": string`;

    logger.info(`Generating ${count} questions via Gemini for topic: "${topic}"`);

    const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(
          url,
          {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
          },
          { timeout: 30000 }
        );

        const candidates = response.data?.candidates;
        if (!candidates || candidates.length === 0) throw new Error('Empty response');

        let rawText = candidates[0]?.content?.parts?.[0]?.text || '';
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const questions = JSON.parse(rawText);
        if (!Array.isArray(questions)) throw new Error('Invalid JSON array');

        return questions.map((q, index) => ({
          number: String(q.number || index + 1),
          question: String(q.question || ''),
          optionA: String(q.optionA || q.option_a || ''),
          optionB: String(q.optionB || q.option_b || ''),
          optionC: String(q.optionC || q.option_c || ''),
          optionD: String(q.optionD || q.option_d || ''),
        }));
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(`Gemini generation failed: ${lastError?.response?.data?.error?.message || lastError?.message}`);
  }
}

module.exports = GeminiService;
