/**
 * services/SlidesService.js
 * Google Slides API operations: read presentation, detect placeholders,
 * batch update replacement, slide duplication, QR code generation & image handling.
 */

const { google } = require('googleapis');
const QRCode = require('qrcode');
const { retryWithBackoff } = require('../utils/retryWithBackoff');
const { extractPlaceholdersFromPresentation, buildReplacementMap } = require('../utils/placeholderParser');
const DriveService = require('./DriveService');
const logger = require('../utils/logger');

class SlidesService {
  /**
   * @param {import('googleapis').Auth.OAuth2Client} auth
   */
  constructor(auth) {
    this.auth = auth;
    this.slides = google.slides({ version: 'v1', auth });
    this.driveService = new DriveService(auth);
  }

  /**
   * Get full presentation details
   * @param {string} presentationId
   * @returns {Promise<object>}
   */
  async getPresentation(presentationId) {
    const response = await retryWithBackoff(() =>
      this.slides.presentations.get({ presentationId })
    );
    return response.data;
  }

  /**
   * Detect placeholders in a presentation template
   * @param {string} presentationId
   * @returns {Promise<{ key: string, raw: string, type: string }[]>}
   */
  async detectPlaceholders(presentationId) {
    const presentation = await this.getPresentation(presentationId);
    return extractPlaceholdersFromPresentation(presentation);
  }

  /**
   * Bulk generate slides from records (array of key-value objects)
   *
   * Algorithm:
   * 1. Get template presentation structure
   * 2. For each data record:
   *    a. Duplicate original template slide(s)
   *    b. Apply replaceAllText for all placeholders in duplicated slide(s)
   *    c. Handle image / QR code replacements
   * 3. Delete the initial template slide(s)
   * 4. Save and return updated presentation ID
   *
   * @param {string} presentationId - File ID of the COPIED presentation
   * @param {object[]} records - Data records
   * @param {object} options - Options (skipEmpty, dateFormat, onProgress, checkCancelled)
   * @returns {Promise<{ slideCount: number }>}
   */
  async generateBulkSlides(presentationId, records, options = {}) {
    const { onProgress = () => {}, checkCancelled = () => {}, dateFormat = 'DD/MM/YYYY' } = options;

    const presentation = await this.getPresentation(presentationId);
    const originalSlides = presentation.slides || [];

    if (originalSlides.length === 0) {
      throw new Error('Template presentation has no slides.');
    }

    const detectedPlaceholders = extractPlaceholdersFromPresentation(presentation);
    const placeholderKeys = detectedPlaceholders.map((p) => p.key);

    const originalPageIds = originalSlides.map((s) => s.objectId);
    const totalRecords = records.length;
    let generatedSlideCount = 0;

    // Process in batches to optimize Slides API batchUpdate size (max 500 requests per call)
    const BATCH_SIZE = 10; // 10 rows per batch call

    // Process rows in reverse so that duplicateObject (which inserts immediately after the template)
    // results in perfect ascending order [Row 0, Row 1, Row 2, ...] in the final presentation.
    for (let i = totalRecords - 1; i >= 0; i -= BATCH_SIZE) {
      checkCancelled();

      const batchStartIndex = Math.max(0, i - BATCH_SIZE + 1);
      const batchRecords = records.slice(batchStartIndex, i + 1);
      const batchRequests = [];
      const tempDriveFilesToDelete = [];

      // Iterate backwards within the batch as well
      for (let j = batchRecords.length - 1; j >= 0; j--) {
        const recordIndex = batchStartIndex + j;
        const record = batchRecords[j];

        onProgress({
          step: 'generating',
          current: recordIndex + 1,
          total: totalRecords,
          message: `Generating slide ${recordIndex + 1} of ${totalRecords}...`,
        });

        // 1. Duplicate each slide in the original template for this row
        const newSlideIdsMap = new Map(); // originalId -> newId

        for (const origId of originalPageIds) {
          const newId = `gen_slide_${recordIndex}_${origId.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}`;
          newSlideIdsMap.set(origId, newId);

          batchRequests.push({
            duplicateObject: {
              objectId: origId,
              objectIds: { [origId]: newId },
            },
          });
        }

        // 2. Build replacements for this record
        const replacementMap = buildReplacementMap(record, placeholderKeys, { dateFormat });

        // Apply text replacements filtered by the duplicated page IDs
        for (const [rawText, replaceValue] of replacementMap.entries()) {
          for (const [_, newSlideId] of newSlideIdsMap.entries()) {
            batchRequests.push({
              replaceAllText: {
                containsText: { text: rawText, matchCase: true },
                replaceText: String(replaceValue ?? ''),
                pageObjectIds: [newSlideId],
              },
            });
          }
        }

        // 3. Process QR code placeholders & image replacements
        for (const p of detectedPlaceholders) {
          if (p.type === 'qrcode') {
            const rawKey = p.key; // e.g. "qr:url" or "qr:https://example.com"
            let qrText = rawKey.substring(3).trim();

            // If qrText matches a record key, use record value, otherwise treat as literal
            if (record[qrText]) {
              qrText = record[qrText];
            }

            if (qrText) {
              try {
                const qrDataUrl = await QRCode.toDataURL(qrText, { width: 300, margin: 1 });
                const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');

                // Upload temp image to Drive to get public URL for Slides replaceAllShapesWithImage API
                const tempFileId = await this.driveService.uploadFile(
                  `qr_${Date.now()}.png`,
                  'image/png',
                  buffer
                );
                await this.driveService.makePublic(tempFileId);
                tempDriveFilesToDelete.push(tempFileId);

                const publicUrl = `https://drive.google.com/uc?export=download&id=${tempFileId}`;

                for (const [_, newSlideId] of newSlideIdsMap.entries()) {
                  batchRequests.push({
                    replaceAllShapesWithImage: {
                      containsText: { text: p.raw, matchCase: true },
                      imageUrl: publicUrl,
                      imageReplaceMethod: 'CENTER_INSIDE',
                      pageObjectIds: [newSlideId],
                    },
                  });
                }
              } catch (err) {
                logger.warn(`QR code generation failed for ${qrText}: ${err.message}`);
              }
            }
          }
        }

        generatedSlideCount += originalPageIds.length;
      }

      // Execute batchUpdate request
      if (batchRequests.length > 0) {
        await retryWithBackoff(() =>
          this.slides.presentations.batchUpdate({
            presentationId,
            requestBody: { requests: batchRequests },
          })
        );
      }

      // Cleanup temporary Drive files used for images/QRs
      for (const tempId of tempDriveFilesToDelete) {
        this.driveService.deleteFile(tempId).catch(() => {});
      }
    }

    // 4. Delete original template slide(s) leaving only generated slides
    checkCancelled();
    onProgress({
      step: 'cleaning',
      current: totalRecords,
      total: totalRecords,
      message: 'Finalizing presentation and removing template slides...',
    });

    const deleteRequests = originalPageIds.map((origId) => ({
      deleteObject: { objectId: origId },
    }));

    await retryWithBackoff(() =>
      this.slides.presentations.batchUpdate({
        presentationId,
        requestBody: { requests: deleteRequests },
      })
    );

    return { slideCount: generatedSlideCount };
  }

  /**
   * Get individual slide thumbnail/image URLs
   * @param {string} presentationId
   * @returns {Promise<{ slideId: string, pageNumber: number, contentUrl: string }[]>}
   */
  async getSlideImages(presentationId) {
    const presentation = await this.getPresentation(presentationId);
    const slides = presentation.slides || [];
    const images = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const res = await retryWithBackoff(() =>
        this.slides.presentations.pages.getThumbnail({
          presentationId,
          pageObjectId: slide.objectId,
          'thumbnailProperties.thumbnailSize': 'LARGE',
          'thumbnailProperties.mimeType': 'PNG',
        })
      );
      images.push({
        slideId: slide.objectId,
        pageNumber: i + 1,
        contentUrl: res.data.contentUrl,
      });
    }

    return images;
  }
}

module.exports = SlidesService;
