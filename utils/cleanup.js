/**
 * utils/cleanup.js
 * Automatic cleanup of temporary files (PDFs, ZIPs, PNGs) older than TTL
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const TTL_MS = parseInt(process.env.TEMP_FILE_TTL_MS) || 2 * 60 * 60 * 1000; // 2 hours default

/**
 * Delete files in a directory older than TTL
 * @param {string} dir
 */
function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const now = Date.now();
  let deleted = 0;

  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(entryPath);
        const age = now - stat.mtimeMs;

        if (age > TTL_MS) {
          if (stat.isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(entryPath);
          }
          deleted++;
        }
      } catch (err) {
        logger.warn(`Cleanup: Could not process ${entryPath}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.warn(`Cleanup: Could not read directory ${dir}: ${err.message}`);
  }

  if (deleted > 0) {
    logger.info(`Cleanup: Deleted ${deleted} old entries from ${dir}`);
  }
}

/**
 * Run cleanup for all temp directories
 */
function runCleanup() {
  logger.debug('Running scheduled temp file cleanup...');
  cleanDirectory(TEMP_DIR);
  cleanDirectory(UPLOADS_DIR);
}

/**
 * Schedule periodic cleanup (runs every hour)
 */
function scheduleCleanup() {
  // Run once on startup
  runCleanup();
  // Then every hour
  setInterval(runCleanup, 60 * 60 * 1000);
  logger.info('Scheduled temp file cleanup every 60 minutes');
}

/**
 * Synchronously delete a specific file or directory (for post-download cleanup)
 * @param {string} filePath
 */
function deleteFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    logger.debug(`Deleted temp file: ${filePath}`);
  } catch (err) {
    logger.warn(`Could not delete ${filePath}: ${err.message}`);
  }
}

module.exports = { scheduleCleanup, runCleanup, deleteFile };
