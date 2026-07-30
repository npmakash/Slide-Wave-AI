/**
 * controllers/history.controller.js
 * Generation history management (list, delete single, bulk delete)
 */

const path = require('path');
const fs = require('fs');
const GoogleAuthService = require('../services/GoogleAuthService');
const DriveService = require('../services/DriveService');
const logger = require('../utils/logger');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function writeHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

class HistoryController {
  /** GET /api/history */
  static async getHistory(req, res) {
    const history = readHistory();
    const { search = '', sourceType = '' } = req.query;

    let filtered = history;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.outputName.toLowerCase().includes(q) ||
          item.presentationId.toLowerCase().includes(q)
      );
    }

    if (sourceType) {
      filtered = filtered.filter((item) => item.sourceType === sourceType);
    }

    res.json({ success: true, count: filtered.length, history: filtered });
  }

  /** DELETE /api/history/:id */
  static async deleteHistoryItem(req, res) {
    const { id } = req.params;
    const { deleteDriveFile = false } = req.query;

    let history = readHistory();
    const item = history.find((h) => h.id === id);

    if (!item) {
      return res.status(404).json({ error: 'History record not found' });
    }

    if (deleteDriveFile && item.presentationId) {
      try {
        const auth = GoogleAuthService.getClientFromSession(req.session);
        const driveService = new DriveService(auth);
        await driveService.deleteFile(item.presentationId);
      } catch (err) {
        logger.warn(`Could not delete Drive file during history cleanup: ${err.message}`);
      }
    }

    history = history.filter((h) => h.id !== id);
    writeHistory(history);

    res.json({ success: true, message: 'History record deleted' });
  }

  /** POST /api/history/bulk-delete */
  static async bulkDeleteHistory(req, res) {
    const { ids = [], deleteDriveFiles = false } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    let history = readHistory();
    const itemsToDelete = history.filter((h) => ids.includes(h.id));

    if (deleteDriveFiles) {
      try {
        const auth = GoogleAuthService.getClientFromSession(req.session);
        const driveService = new DriveService(auth);

        for (const item of itemsToDelete) {
          if (item.presentationId) {
            await driveService.deleteFile(item.presentationId).catch(() => {});
          }
        }
      } catch (err) {
        logger.warn(`Bulk Drive delete warning: ${err.message}`);
      }
    }

    history = history.filter((h) => !ids.includes(h.id));
    writeHistory(history);

    res.json({ success: true, count: itemsToDelete.length, message: `${itemsToDelete.length} records deleted` });
  }
}

module.exports = HistoryController;
