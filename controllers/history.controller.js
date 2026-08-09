/**
 * controllers/history.controller.js
 * User-isolated generation history management (list, delete single, bulk delete)
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
  /** GET /api/history — isolated by logged-in user email */
  static async getHistory(req, res) {
    const allHistory = readHistory();
    const currentUserEmail = req.session?.user?.email;

    // Filter by logged in user email if user is authenticated
    let userHistory = allHistory;
    if (currentUserEmail) {
      userHistory = allHistory.filter(
        (item) => !item.userEmail || item.userEmail === currentUserEmail
      );
    }

    const { search = '', sourceType = '' } = req.query;
    let filtered = userHistory;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.outputName.toLowerCase().includes(q) ||
          (item.presentationId && item.presentationId.toLowerCase().includes(q))
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
    const currentUserEmail = req.session?.user?.email;

    let history = readHistory();
    const item = history.find((h) => h.id === id);

    if (!item) {
      return res.status(404).json({ error: 'History record not found' });
    }

    // Verify ownership
    if (currentUserEmail && item.userEmail && item.userEmail !== currentUserEmail) {
      return res.status(403).json({ error: 'Unauthorized to delete this history record' });
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
    const currentUserEmail = req.session?.user?.email;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    let history = readHistory();
    const itemsToDelete = history.filter(
      (h) => ids.includes(h.id) && (!currentUserEmail || !h.userEmail || h.userEmail === currentUserEmail)
    );

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

    const idsToDeleteSet = new Set(itemsToDelete.map((i) => i.id));
    history = history.filter((h) => !idsToDeleteSet.has(h.id));
    writeHistory(history);

    res.json({ success: true, count: itemsToDelete.length, message: `${itemsToDelete.length} records deleted` });
  }
}

module.exports = HistoryController;
