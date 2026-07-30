/**
 * services/ZipService.js
 * Package slide PNG images into a downloadable ZIP archive
 */

const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TEMP_DIR = path.join(__dirname, '..', 'temp');

class ZipService {
  /**
   * Create a ZIP file containing slide images
   * @param {{ filename: string, buffer: Buffer }[]} slideImages
   * @param {string} outputName
   * @returns {Promise<string>} Path to generated ZIP file
   */
  static async createZipArchive(slideImages, outputName = 'presentation_slides') {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const safeName = outputName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFilename = `${safeName}_images_${Date.now()}.zip`;
    const zipPath = path.join(TEMP_DIR, zipFilename);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`ZIP archive created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        logger.error(`Archiver error: ${err.message}`);
        reject(err);
      });

      archive.pipe(output);

      for (const item of slideImages) {
        archive.append(item.buffer, { name: item.filename });
      }

      archive.finalize();
    });
  }
}

module.exports = ZipService;
