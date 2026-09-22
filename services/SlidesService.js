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
   * @param {string} presentationId - File ID of the COPIED presentation
   * @param {object[]} records - Data records
   * @param {object} options - Options (skipEmpty, dateFormat, onProgress, checkCancelled)
   * @returns {Promise<{ slideCount: number }>}
   */
  async generateBulkSlides(presentationId, records, options = {}) {
    const { onProgress = () => {}, checkCancelled = () => {}, dateFormat = 'DD/MM/YYYY' } = options;

    // Check if multi-item per slide mode (Beta) is enabled
    if (options.isMultiItem || options.mode === 'multiItem') {
      return this.generateBatchMultiItemSlides(presentationId, records, options);
    }

    const presentation = await this.getPresentation(presentationId);
    const originalSlides = presentation.slides || [];

    if (originalSlides.length === 0) {
      throw new Error('Template presentation has no slides.');
    }

    const detectedPlaceholders = extractPlaceholdersFromPresentation(presentation);
    const placeholderKeys = detectedPlaceholders.map((p) => p.key);
    const qrPlaceholders = detectedPlaceholders.filter((p) => p.type === 'qrcode');

    const originalPageIds = originalSlides.map((s) => s.objectId);
    const totalRecords = records.length;
    let generatedSlideCount = 0;

    // Process in batches (25 rows per batch call for high throughput & fewer HTTP roundtrips)
    const BATCH_SIZE = 25;

    // Process rows in reverse so duplicated objects maintain ascending order
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

        // 2. Build text replacements for this record
        const replacementMap = buildReplacementMap(record, placeholderKeys, { dateFormat });

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

        // 3. Parallelized processing for QR code placeholders & image replacements
        if (qrPlaceholders.length > 0) {
          const qrTasks = qrPlaceholders.map(async (p) => {
            let qrText = p.key.substring(3).trim();
            if (record[qrText]) {
              qrText = record[qrText];
            }
            if (!qrText) return null;

            try {
              const qrDataUrl = await QRCode.toDataURL(qrText, { width: 300, margin: 1 });
              const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');

              const tempFileId = await this.driveService.uploadFile(
                `qr_${Date.now()}.png`,
                'image/png',
                buffer
              );
              await this.driveService.makePublic(tempFileId);
              return { tempFileId, placeholderRaw: p.raw, newSlideIds: Array.from(newSlideIdsMap.values()) };
            } catch (err) {
              logger.warn(`QR code generation failed for ${qrText}: ${err.message}`);
              return null;
            }
          });

          const qrResults = await Promise.all(qrTasks);

          for (const res of qrResults) {
            if (!res) continue;
            tempDriveFilesToDelete.push(res.tempFileId);
            const publicUrl = `https://drive.google.com/uc?export=download&id=${res.tempFileId}`;

            for (const slideId of res.newSlideIds) {
              batchRequests.push({
                replaceAllShapesWithImage: {
                  containsText: { text: res.placeholderRaw, matchCase: true },
                  imageUrl: publicUrl,
                  imageReplaceMethod: 'CENTER_INSIDE',
                  pageObjectIds: [slideId],
                },
              });
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

      // Cleanup temporary Drive files used for images/QRs in background
      Promise.all(tempDriveFilesToDelete.map((tempId) => this.driveService.deleteFile(tempId).catch(() => {})));
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
   * Bulk generate multi-item / grid batch slides (Beta Feature)
   * Populates indexed placeholders (e.g. {{question_1}} .. {{question_12}}) on a single slide page.
   *
   * @param {string} presentationId
   * @param {object[]} records
   * @param {object} options
   * @returns {Promise<{ slideCount: number, pageCount: number }>}
   */
  async generateBatchMultiItemSlides(presentationId, records, options = {}) {
    const { onProgress = () => {}, checkCancelled = () => {} } = options;

    const presentation = await this.getPresentation(presentationId);
    const originalSlides = presentation.slides || [];

    if (originalSlides.length === 0) {
      throw new Error('Template presentation has no slides.');
    }

    const detectedPlaceholders = extractPlaceholdersFromPresentation(presentation);
    const originalPageIds = originalSlides.map((s) => s.objectId);

    // Determine items per page
    let maxDetectedIndex = 0;
    for (const p of detectedPlaceholders) {
      const match = p.key.match(/_(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx > maxDetectedIndex) maxDetectedIndex = idx;
      }
    }

    const itemsPerPage = Math.max(
      1,
      options.itemsPerPage ? parseInt(options.itemsPerPage, 10) : (maxDetectedIndex > 0 ? maxDetectedIndex : 12)
    );

    const totalRecords = records.length;
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    let generatedSlideCount = 0;

    // Process pages in reverse order so inserted slides land in ascending sequence
    for (let page = totalPages - 1; page >= 0; page--) {
      checkCancelled();

      const startIndex = page * itemsPerPage;
      const pageQuestions = records.slice(startIndex, startIndex + itemsPerPage);

      onProgress({
        step: 'generating',
        current: page + 1,
        total: totalPages,
        message: `Generating multi-item slide ${page + 1} of ${totalPages} (items ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, totalRecords)})...`,
      });

      const batchRequests = [];
      const newSlideIdsMap = new Map();

      // Duplicate template slide for this page
      for (const origId of originalPageIds) {
        const newId = `gen_multi_slide_${page}_${origId.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}`;
        newSlideIdsMap.set(origId, newId);

        batchRequests.push({
          duplicateObject: {
            objectId: origId,
            objectIds: { [origId]: newId },
          },
        });
      }

      // Populate slots 1..itemsPerPage
      for (let slot = 1; slot <= itemsPerPage; slot++) {
        const item = pageQuestions[slot - 1]; // 0-indexed item for this slot

        if (item) {
          // Replace item attributes for {{key_slot}}
          for (const [key, rawValue] of Object.entries(item)) {
            const replaceVal = String(rawValue ?? '');
            const possiblePlaceholders = [
              `{{${key}_${slot}}}`,
              `{{${key.toLowerCase()}_${slot}}}`,
              `{{${key.toUpperCase()}_${slot}}}`,
            ];

            for (const rawText of new Set(possiblePlaceholders)) {
              for (const newSlideId of newSlideIdsMap.values()) {
                batchRequests.push({
                  replaceAllText: {
                    containsText: { text: rawText, matchCase: false },
                    replaceText: replaceVal,
                    pageObjectIds: [newSlideId],
                  },
                });
              }
            }
          }

          // Auto-fill {{number_slot}} if number column is not explicitly in item
          if (item.number === undefined && item.num === undefined && item.no === undefined) {
            const autoNum = startIndex + slot;
            const numPlaceholder = `{{number_${slot}}}`;
            for (const newSlideId of newSlideIdsMap.values()) {
              batchRequests.push({
                replaceAllText: {
                  containsText: { text: numPlaceholder, matchCase: false },
                  replaceText: String(autoNum),
                  pageObjectIds: [newSlideId],
                },
              });
            }
          }
        } else {
          // Empty/unused slot on last slide -> replace placeholders with ""
          for (const p of detectedPlaceholders) {
            if (p.raw.includes(`_${slot}}`) || p.raw.includes(`_${slot}}}`)) {
              for (const newSlideId of newSlideIdsMap.values()) {
                batchRequests.push({
                  replaceAllText: {
                    containsText: { text: p.raw, matchCase: false },
                    replaceText: '',
                    pageObjectIds: [newSlideId],
                  },
                });
              }
            }
          }

          const commonFields = [
            'number', 'num', 'question', 'q', 'optiona', 'optionb', 'optionc', 'optiond',
            'answer', 'explanation', 'title', 'desc', 'text', 'name', 'code', 'score'
          ];
          for (const field of commonFields) {
            const clearPlaceholder = `{{${field}_${slot}}}`;
            for (const newSlideId of newSlideIdsMap.values()) {
              batchRequests.push({
                replaceAllText: {
                  containsText: { text: clearPlaceholder, matchCase: false },
                  replaceText: '',
                  pageObjectIds: [newSlideId],
                },
              });
            }
          }
        }
      }

      if (batchRequests.length > 0) {
        await retryWithBackoff(() =>
          this.slides.presentations.batchUpdate({
            presentationId,
            requestBody: { requests: batchRequests },
          })
        );
      }

      generatedSlideCount += originalPageIds.length;
    }

    // Delete original template slide(s)
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

    return { slideCount: generatedSlideCount, pageCount: totalPages };
  }
  }

  /**
   * Get individual slide thumbnail/image URLs in parallel
   * @param {string} presentationId
   * @returns {Promise<{ slideId: string, pageNumber: number, contentUrl: string }[]>}
   */
  async getSlideImages(presentationId) {
    const presentation = await this.getPresentation(presentationId);
    const slides = presentation.slides || [];

    const tasks = slides.map(async (slide, i) => {
      const res = await retryWithBackoff(() =>
        this.slides.presentations.pages.getThumbnail({
          presentationId,
          pageObjectId: slide.objectId,
          'thumbnailProperties.thumbnailSize': 'LARGE',
          'thumbnailProperties.mimeType': 'PNG',
        })
      );
      return {
        slideId: slide.objectId,
        pageNumber: i + 1,
        contentUrl: res.data.contentUrl,
      };
    });

    return Promise.all(tasks);
  }
}

module.exports = SlidesService;
