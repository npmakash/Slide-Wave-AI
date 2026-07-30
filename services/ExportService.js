/**
 * services/ExportService.js
 * Export presentation to PDF or fetch slide PNG images
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const DriveService = require('./DriveService');
const SlidesService = require('./SlidesService');
const logger = require('../utils/logger');

const TEMP_DIR = path.join(__dirname, '..', 'temp');

class ExportService {
  /**
   * @param {import('googleapis').Auth.OAuth2Client} auth
   */
  constructor(auth) {
    this.auth = auth;
    this.driveService = new DriveService(auth);
    this.slidesService = new SlidesService(auth);
  }

  /**
   * Export presentation as PDF file saved to local temp directory
   * @param {string} presentationId
   * @param {string} outputName
   * @returns {Promise<string>} Path to local PDF file
   */
  async exportToPdf(presentationId, outputName = 'presentation') {
    logger.info(`Exporting presentation ${presentationId} to PDF...`);

    const pdfBuffer = await this.driveService.exportFile(
      presentationId,
      'application/pdf'
    );

    const safeName = outputName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_${Date.now()}.pdf`;
    const filePath = path.join(TEMP_DIR, filename);

    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfBuffer);
    logger.info(`PDF generated: ${filePath}`);
    return filePath;
  }

  /**
   * Export presentation slides as array of image buffers
   * @param {string} presentationId
   * @param {object} options
   * @returns {Promise<{ pageNumber: number, filename: string, buffer: Buffer }[]>}
   */
  async exportSlideImages(presentationId, options = {}) {
    const { onProgress = () => {} } = options;
    logger.info(`Exporting slide images for presentation ${presentationId}...`);

    const slideImages = await this.slidesService.getSlideImages(presentationId);
    const results = [];

    for (let i = 0; i < slideImages.length; i++) {
      const slide = slideImages[i];
      onProgress({
        step: 'exporting_images',
        current: i + 1,
        total: slideImages.length,
        message: `Exporting Slide ${i + 1} of ${slideImages.length}...`,
      });

      // Fetch PNG image from contentUrl
      const response = await axios.get(slide.contentUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      results.push({
        pageNumber: slide.pageNumber,
        filename: `Slide-${slide.pageNumber}.png`,
        buffer: Buffer.from(response.data),
      });
    }

    return results;
  }
}

module.exports = ExportService;
