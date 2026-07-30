/**
 * middleware/rateLimiter.js
 * Express rate limiter to protect API endpoints
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min default
  max: parseInt(process.env.RATE_LIMIT_MAX) || 2000, // Increased limit for heavy usage
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: (req) => {
    // Skip rate limiting for status polling & file downloads
    const url = req.originalUrl || req.url;
    return (
      url.includes('/status/') ||
      url.includes('/download/') ||
      url.includes('/history') ||
      url.includes('/logs/')
    );
  },
});

// Stricter limiter for generation endpoints
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many generation requests. Please wait before generating again.',
    code: 'GENERATE_RATE_LIMIT_EXCEEDED',
  },
});

module.exports = { rateLimiter, generateLimiter };
