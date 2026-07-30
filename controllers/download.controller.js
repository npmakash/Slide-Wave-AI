/**
 * controllers/download.controller.js
 * Serve PDF and ZIP image downloads
 */

const path = require('path');
const fs = require('fs');
const GoogleAuthService = require('../services/GoogleAuthService');
const ExportService = require('../services/ExportService');
const ZipService = require('../services/ZipService');
const logger = require('../utils/logger');

const TEMP_DIR = path.join(__dirname, '..', 'temp');

class DownloadController {
  /** GET /api/download/pdf/:id */
  static async downloadPdf(req, res) {
    try {
      const { id } = req.params; // Presentation ID or Job ID

      // Check if file already exists in temp directory
      const existingFiles = fs.readdirSync(TEMP_DIR).filter((f) => f.endsWith('.pdf'));
      const matchingFile = existingFiles.find((f) => f.includes(id));

      if (matchingFile) {
        const filePath = path.join(TEMP_DIR, matchingFile);
        return res.download(filePath, matchingFile);
      }

      // If not pre-generated, export directly using Google API
      const auth = GoogleAuthService.getClientFromSession(req.session);
      const exportService = new ExportService(auth);

      const pdfPath = await exportService.exportToPdf(id, 'presentation');
      const filename = path.basename(pdfPath);

      res.download(pdfPath, filename, (err) => {
        if (err) logger.error(`Download PDF response error: ${err.message}`);
      });
    } catch (err) {
      logger.error(`PDF download error: ${err.message}`);
      res.status(500).json({ error: 'Failed to download PDF presentation.', details: err.message });
    }
  }

  /** GET /api/download/images/:id */
  static async downloadImages(req, res) {
    try {
      const { id } = req.params;

      const existingFiles = fs.readdirSync(TEMP_DIR).filter((f) => f.endsWith('.zip'));
      const matchingFile = existingFiles.find((f) => f.includes(id));

      if (matchingFile) {
        const filePath = path.join(TEMP_DIR, matchingFile);
        return res.download(filePath, matchingFile);
      }

      // If not pre-generated, generate ZIP now
      const auth = GoogleAuthService.getClientFromSession(req.session);
      const exportService = new ExportService(auth);

      const slideImages = await exportService.exportSlideImages(id);
      const zipPath = await ZipService.createZipArchive(slideImages, 'presentation');
      const filename = path.basename(zipPath);

      res.download(zipPath, filename, (err) => {
        if (err) logger.error(`Download ZIP response error: ${err.message}`);
      });
    } catch (err) {
      logger.error(`Images ZIP download error: ${err.message}`);
      res.status(500).json({ error: 'Failed to download slide images ZIP.', details: err.message });
    }
  }
}

module.exports = DownloadController;
