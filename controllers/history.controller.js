/**
 * controllers/history.controller.js
 * Persistent user-isolated slide generation history (MongoDB + JSON fallback)
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const History = require('../models/History');
const GoogleAuthService = require('../services/GoogleAuthService');
const DriveService = require('../services/DriveService');
const logger = require('../utils/logger');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

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
  /** Save history item helper used by generator */
  static async saveHistoryItem(item) {
    const email = item.userEmail ? item.userEmail.toLowerCase().trim() : 'anonymous';

    if (isMongoConnected()) {
      try {
        await History.create({
          userEmail: email,
          outputName: item.outputName,
          sourceType: item.sourceType,
          presentationId: item.presentationId,
          presentationUrl: item.presentationUrl,
          slideCount: item.slideCount || 0,
          rowCount: item.rowCount || 0,
        });
        logger.info(`🍃 MongoDB: Saved generation history for ${email}`);
        return;
      } catch (err) {
        logger.error(`MongoDB saveHistoryItem error: ${err.message}`);
      }
    }

    // Local JSON fallback
    try {
      let history = readHistory();
      history.unshift({
        ...item,
        userEmail: email,
        id: item.id || `hist_${Date.now()}`,
        createdAt: item.createdAt || new Date().toISOString(),
      });
      if (history.length > 500) history = history.slice(0, 500);
      writeHistory(history);
    } catch (err) {
      logger.error(`Failed to save local history item: ${err.message}`);
    }
  }

  /** GET /api/history — isolated by logged-in user email */
  static async getHistory(req, res) {
    try {
      const currentUserEmail = req.session?.user?.email ? req.session.user.email.toLowerCase().trim() : null;
      const { search = '', sourceType = '' } = req.query;

      let historyRecords = [];

      if (isMongoConnected()) {
        const query = {};
        if (currentUserEmail) query.userEmail = currentUserEmail;
        if (sourceType) query.sourceType = sourceType;
        if (search) {
          query.$or = [
            { outputName: { $regex: search, $options: 'i' } },
            { presentationId: { $regex: search, $options: 'i' } },
          ];
        }

        const mongoDocs = await History.find(query).sort({ createdAt: -1 }).limit(200);
        historyRecords = mongoDocs.map((doc) => ({
          id: doc._id.toString(),
          userEmail: doc.userEmail,
          outputName: doc.outputName,
          sourceType: doc.sourceType,
          presentationId: doc.presentationId,
          presentationUrl: doc.presentationUrl,
          slideCount: doc.slideCount,
          rowCount: doc.rowCount,
          createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        }));
      } else {
        const allHistory = readHistory();
        let filtered = currentUserEmail
          ? allHistory.filter((item) => !item.userEmail || item.userEmail.toLowerCase().trim() === currentUserEmail)
          : allHistory;

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

        historyRecords = filtered;
      }

      res.json({ success: true, count: historyRecords.length, history: historyRecords });
    } catch (err) {
      logger.error(`History getHistory error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** DELETE /api/history/:id */
  static async deleteHistoryItem(req, res) {
    try {
      const { id } = req.params;
      const { deleteDriveFile = false } = req.query;
      const currentUserEmail = req.session?.user?.email ? req.session.user.email.toLowerCase().trim() : null;

      if (isMongoConnected()) {
        const doc = await History.findById(id);
        if (!doc) {
          return res.status(404).json({ error: 'History record not found' });
        }

        if (currentUserEmail && doc.userEmail && doc.userEmail !== currentUserEmail) {
          return res.status(403).json({ error: 'Unauthorized to delete this history record' });
        }

        if (deleteDriveFile && doc.presentationId) {
          try {
            const auth = GoogleAuthService.getClientFromSession(req.session);
            const driveService = new DriveService(auth);
            await driveService.deleteFile(doc.presentationId);
          } catch (err) {
            logger.warn(`Could not delete Drive file: ${err.message}`);
          }
        }

        await History.findByIdAndDelete(id);
        return res.json({ success: true, message: 'History record deleted' });
      }

      // Local JSON fallback
      let history = readHistory();
      const item = history.find((h) => h.id === id);

      if (!item) {
        return res.status(404).json({ error: 'History record not found' });
      }

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
    } catch (err) {
      logger.error(`History deleteHistoryItem error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** POST /api/history/bulk-delete */
  static async bulkDeleteHistory(req, res) {
    try {
      const { ids = [], deleteDriveFiles = false } = req.body;
      const currentUserEmail = req.session?.user?.email ? req.session.user.email.toLowerCase().trim() : null;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      if (isMongoConnected()) {
        const docs = await History.find({ _id: { $in: ids } });
        const itemsToDelete = docs.filter(
          (h) => !currentUserEmail || !h.userEmail || h.userEmail === currentUserEmail
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

        const validIds = itemsToDelete.map((i) => i._id);
        await History.deleteMany({ _id: { $in: validIds } });

        return res.json({ success: true, count: validIds.length, message: `${validIds.length} records deleted` });
      }

      // Local JSON fallback
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
    } catch (err) {
      logger.error(`History bulkDeleteHistory error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = HistoryController;
