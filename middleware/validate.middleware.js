/**
 * middleware/validate.middleware.js
 * Input validation helpers using Joi
 */

const Joi = require('joi');

/**
 * Validate a Google Drive/Slides URL and extract the file ID
 * @param {string} url
 * @returns {string} file ID
 */
function extractGoogleFileId(url) {
  if (!url || typeof url !== 'string') throw new Error('Invalid URL provided');

  // Match /d/<id>/ or id=<id> patterns
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]{25,})/,
    /id=([a-zA-Z0-9_-]{25,})/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]{25,})/,
    /\/presentation\/d\/([a-zA-Z0-9_-]{25,})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  throw new Error(
    'Could not extract a valid Google file ID from the provided URL. ' +
    'Please use a valid Google Slides or Google Sheets URL.'
  );
}

// ─── Joi Schemas ──────────────────────────────────────────────────────────────

const generateSheetSchema = Joi.object({
  templateUrl: Joi.string().uri().required().messages({
    'string.uri': 'templateUrl must be a valid URL',
    'any.required': 'templateUrl is required',
  }),
  sheetUrl: Joi.string().uri().required().messages({
    'string.uri': 'sheetUrl must be a valid URL',
    'any.required': 'sheetUrl is required',
  }),
  outputName: Joi.string().min(1).max(200).required(),
  skipEmptyRows: Joi.boolean().default(true),
  sheetName: Joi.string().optional().allow(''),
  dateFormat: Joi.string().optional().allow(''),
  isMultiItem: Joi.boolean().optional(),
  itemsPerPage: Joi.number().integer().min(1).max(50).optional(),
  options: Joi.object().optional(),
});

const generateJsonSchema = Joi.object({
  templateUrl: Joi.string().uri().required(),
  outputName: Joi.string().min(1).max(200).required(),
  data: Joi.array()
    .items(Joi.object())
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.min': 'JSON data must have at least 1 object',
      'array.max': 'JSON data must not exceed 1000 objects',
    }),
  skipEmptyRows: Joi.boolean().default(true),
  dateFormat: Joi.string().optional().allow(''),
  isMultiItem: Joi.boolean().optional(),
  itemsPerPage: Joi.number().integer().min(1).max(50).optional(),
  options: Joi.object().optional(),
});

const detectPlaceholderSchema = Joi.object({
  templateUrl: Joi.string().uri().required(),
});

/**
 * Generic request body validator middleware factory
 * @param {Joi.Schema} schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value; // Use the sanitized+defaulted values
    next();
  };
}

module.exports = {
  extractGoogleFileId,
  validateBody,
  generateSheetSchema,
  generateJsonSchema,
  detectPlaceholderSchema,
};
