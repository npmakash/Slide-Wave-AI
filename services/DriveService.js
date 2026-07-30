/**
 * services/DriveService.js
 * Google Drive operations: copy, rename, delete, permissions
 */

const { google } = require('googleapis');
const { retryWithBackoff } = require('../utils/retryWithBackoff');
const logger = require('../utils/logger');

class DriveService {
  /**
   * @param {import('googleapis').Auth.OAuth2Client} auth
   */
  constructor(auth) {
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Copy a file in Google Drive
   * @param {string} fileId - Source file ID
   * @param {string} name - Name for the copy
   * @returns {Promise<string>} New file ID
   */
  async copyFile(fileId, name) {
    logger.info(`Copying Drive file ${fileId} as "${name}"`);
    const response = await retryWithBackoff(() =>
      this.drive.files.copy({
        fileId,
        requestBody: { name },
        fields: 'id, name',
      })
    );
    const newId = response.data.id;
    logger.info(`File copied: ${newId}`);
    return newId;
  }

  /**
   * Rename a Drive file
   * @param {string} fileId
   * @param {string} name
   */
  async renameFile(fileId, name) {
    await retryWithBackoff(() =>
      this.drive.files.update({
        fileId,
        requestBody: { name },
        fields: 'id, name',
      })
    );
    logger.info(`File ${fileId} renamed to "${name}"`);
  }

  /**
   * Delete a Drive file permanently
   * @param {string} fileId
   */
  async deleteFile(fileId) {
    try {
      await retryWithBackoff(() => this.drive.files.delete({ fileId }));
      logger.info(`Drive file ${fileId} deleted`);
    } catch (err) {
      // Don't throw — deletion failure is non-critical
      logger.warn(`Could not delete Drive file ${fileId}: ${err.message}`);
    }
  }

  /**
   * Export a Google file to a different MIME type (e.g., PDF)
   * @param {string} fileId
   * @param {string} mimeType - e.g., 'application/pdf' or 'image/png'
   * @returns {Promise<Buffer>} File content as buffer
   */
  async exportFile(fileId, mimeType) {
    logger.info(`Exporting Drive file ${fileId} as ${mimeType}`);
    const response = await retryWithBackoff(() =>
      this.drive.files.export(
        { fileId, mimeType },
        { responseType: 'arraybuffer' }
      )
    );
    return Buffer.from(response.data);
  }

  /**
   * Get metadata of a Drive file
   * @param {string} fileId
   * @returns {Promise<object>}
   */
  async getFileMetadata(fileId) {
    const response = await retryWithBackoff(() =>
      this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, webViewLink',
      })
    );
    return response.data;
  }

  /**
   * Make a file publicly readable (for image insertion from URLs)
   * @param {string} fileId
   */
  async makePublic(fileId) {
    await retryWithBackoff(() =>
      this.drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      })
    );
  }

  /**
   * Upload a file buffer to Drive
   * @param {string} name
   * @param {string} mimeType
   * @param {Buffer} buffer
   * @returns {Promise<string>} New file ID
   */
  async uploadFile(name, mimeType, buffer) {
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);
    const response = await retryWithBackoff(() =>
      this.drive.files.create({
        requestBody: { name, mimeType },
        media: { mimeType, body: stream },
        fields: 'id',
      })
    );
    return response.data.id;
  }
}

module.exports = DriveService;
