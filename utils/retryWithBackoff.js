/**
 * utils/retryWithBackoff.js
 * Exponential backoff retry wrapper for transient API errors
 */

const logger = require('./logger');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {object} opts - Options
 * @param {number} opts.maxRetries - Maximum number of retries (default: 4)
 * @param {number} opts.baseDelayMs - Initial delay in ms (default: 500)
 * @param {number} opts.maxDelayMs - Max delay cap in ms (default: 16000)
 * @param {number[]} opts.retryOnStatus - HTTP status codes to retry on
 * @returns {Promise<any>}
 */
async function retryWithBackoff(fn, opts = {}) {
  const {
    maxRetries = 4,
    baseDelayMs = 500,
    maxDelayMs = 16000,
    retryOnStatus = [429, 500, 502, 503, 504],
  } = opts;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const statusCode =
        err?.response?.status ||
        err?.code ||
        (err?.errors?.[0]?.domain === 'usageLimits' ? 429 : null);

      const isRetryable =
        retryOnStatus.includes(statusCode) ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('quotaExceeded') ||
        err?.message?.includes('userRateLimitExceeded') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('ETIMEDOUT');

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        maxDelayMs
      );

      logger.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms. Error: ${err.message}`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { retryWithBackoff, sleep };
