/**
 * controllers/generate.controller.js
 * In-memory job manager and background generator for Sheets and JSON workflows
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const GoogleAuthService = require('../services/GoogleAuthService');
const DriveService = require('../services/DriveService');
const SlidesService = require('../services/SlidesService');
const SheetsService = require('../services/SheetsService');
const ExportService = require('../services/ExportService');
const ZipService = require('../services/ZipService');
const CreditService = require('../services/CreditService');
const { extractGoogleFileId } = require('../middleware/validate.middleware');
const logger = require('../utils/logger');


// In-memory active jobs map
const jobs = new Map();
const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

/** Save history item to data/history.json with user isolation */
function saveHistoryItem(item) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
    history.unshift(item); // Prepend newest
    if (history.length > 500) history = history.slice(0, 500); // Max 500 records
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`Failed to save history item: ${err.message}`);
  }
}

class GenerateController {
  /** POST /api/detect-placeholders */
  static async detectPlaceholders(req, res) {
    try {
      const { templateUrl } = req.body;
      const templateId = extractGoogleFileId(templateUrl);
      const auth = GoogleAuthService.getClientFromSession(req.session);

      const slidesService = new SlidesService(auth);
      const driveService = new DriveService(auth);

      const [placeholders, metadata] = await Promise.all([
        slidesService.detectPlaceholders(templateId),
        driveService.getFileMetadata(templateId),
      ]);

      res.json({
        success: true,
        templateName: metadata.name,
        placeholders,
      });
    } catch (err) {
      logger.error(`Placeholder detection error: ${err.message}`);
      res.status(400).json({
        error: err.message || 'Failed to detect placeholders from template.',
        code: 'PLACEHOLDER_DETECTION_FAILED',
      });
    }
  }

  /** POST /api/generate-sheet */
  static async generateFromSheet(req, res) {
    try {
      const { templateUrl, sheetUrl, outputName, skipEmptyRows, sheetName, dateFormat } = req.body;

      const templateId = extractGoogleFileId(templateUrl);
      const sheetId = extractGoogleFileId(sheetUrl);
      const auth = GoogleAuthService.getClientFromSession(req.session);

      const jobId = uuidv4();
      const job = {
        jobId,
        sourceType: 'sheet',
        outputName,
        status: 'pending', // pending | running | done | error | cancelled
        progress: { step: 'initializing', current: 0, total: 0, message: 'Initializing job...' },
        logs: [`[${new Date().toISOString()}] Job created for Sheet generation`],
        isCancelled: false,
        result: null,
        error: null,
      };

      const userEmail = req.session?.user?.email || 'anonymous';
      const userId = userEmail;

      jobs.set(jobId, job);

      // Start async background execution
      GenerateController.runSheetJob(job, auth, {
        userId,
        userEmail,
        templateId,
        sheetId,
        outputName,
        skipEmptyRows,
        sheetName,
        dateFormat,
      }).catch((err) => logger.error(`Job ${jobId} failed: ${err.message}`));

      res.json({ success: true, jobId, message: 'Generation started in background' });
    } catch (err) {
      logger.error(`Sheet generate init error: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  }

  /** Background execution for Sheet job */
  static async runSheetJob(job, auth, params) {
    const { userId, userEmail, templateId, sheetId, outputName, skipEmptyRows, sheetName, dateFormat } = params;

    const log = (msg) => {
      const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
      job.logs.push(entry);
      logger.info(`[Job ${job.jobId}] ${msg}`);
    };

    const updateProgress = (step, current, total, message) => {
      job.progress = { step, current, total, message };
      log(message);
    };

    const checkCancelled = () => {
      if (job.isCancelled) {
        throw new Error('JOB_CANCELLED');
      }
    };

    try {
      job.status = 'running';
      updateProgress('reading_sheet', 0, 0, 'Reading Google Sheet data...');

      const sheetsService = new SheetsService(auth);
      const slidesService = new SlidesService(auth);
      const driveService = new DriveService(auth);
      const exportService = new ExportService(auth);

      const { records, headers } = await sheetsService.readRows(sheetId, sheetName, skipEmptyRows);

      if (records.length === 0) {
        throw new Error('Google Sheet contained no data rows to generate slides from.');
      }

      // Deduct credits for Sheet rows
      await CreditService.deductCredits(userId, records.length, `Sheet Slide Generation (${records.length} slides)`);
      log(`Deducted ${records.length} credits for slide generation`);


      checkCancelled();
      log(`Read ${records.length} data rows and ${headers.length} columns`);
      updateProgress('copying_template', 0, records.length, 'Copying template presentation...');


      // Copy template to new presentation file
      const presentationId = await driveService.copyFile(templateId, outputName);

      checkCancelled();
      log(`Copied template presentation. New presentation ID: ${presentationId}`);

      // Generate slides bulk
      const { slideCount } = await slidesService.generateBulkSlides(presentationId, records, {
        dateFormat,
        checkCancelled,
        onProgress: ({ step, current, total, message }) => {
          updateProgress(step, current, total, message);
        },
      });

      checkCancelled();
      updateProgress('creating_pdf', slideCount, slideCount, 'Creating PDF download package...');

      const pdfPath = await exportService.exportToPdf(presentationId, outputName);

      const metadata = await driveService.getFileMetadata(presentationId);

      job.status = 'done';
      job.progress = { step: 'finished', current: records.length, total: records.length, message: 'Finished successfully!' };
      job.result = {
        presentationId,
        presentationUrl: metadata.webViewLink,
        outputName,
        slideCount,
        rowCount: records.length,
        pdfPath,
        zipPath: null,
      };

      log(`Job completed successfully! ${slideCount} slides generated.`);

      saveHistoryItem({
        id: job.jobId,
        userEmail: userEmail || 'anonymous',
        outputName,
        sourceType: 'sheet',
        presentationId,
        presentationUrl: metadata.webViewLink,
        slideCount,
        rowCount: records.length,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.message === 'JOB_CANCELLED') {
        job.status = 'cancelled';
        job.progress.message = 'Generation was cancelled by user.';
        log('Job was cancelled.');
      } else {
        job.status = 'error';
        job.error = err.message;
        job.progress.message = `Error: ${err.message}`;
        log(`Job failed: ${err.message}`);
      }
    }
  }

  /** POST /api/generate-json */
  static async generateFromJson(req, res) {
    try {
      const { templateUrl, outputName, data, dateFormat } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Data array cannot be empty.' });
      }

      const userEmail = req.session?.user?.email || 'anonymous';
      const userId = userEmail;
      const requiredCredits = data.length;

      // Deduct credits upfront for JSON generation
      await CreditService.deductCredits(userId, requiredCredits, `JSON Slide Generation (${requiredCredits} slides)`);


      const templateId = extractGoogleFileId(templateUrl);
      const auth = GoogleAuthService.getClientFromSession(req.session);

      const jobId = uuidv4();
      const job = {
        jobId,
        sourceType: 'json',
        outputName,
        status: 'pending',
        progress: { step: 'initializing', current: 0, total: data.length, message: 'Initializing JSON job...' },
        logs: [`[${new Date().toISOString()}] Job created for JSON generation (${data.length} records)`],
        isCancelled: false,
        result: null,
        error: null,
      };

      jobs.set(jobId, job);

      GenerateController.runJsonJob(job, auth, {
        userEmail,
        templateId,
        outputName,
        data,
        dateFormat,
      }).catch((err) => logger.error(`JSON Job ${jobId} failed: ${err.message}`));

      res.json({ success: true, jobId, message: 'JSON generation started' });
    } catch (err) {
      logger.error(`JSON generate init error: ${err.message}`);
      res.status(err.message?.includes('Insufficient credits') ? 402 : 400).json({ error: err.message, code: err.message?.includes('Insufficient credits') ? 'INSUFFICIENT_CREDITS' : 'BAD_REQUEST' });
    }
  }


  /** Background execution for JSON job */
  static async runJsonJob(job, auth, params) {
    const { userEmail, templateId, outputName, data, dateFormat } = params;

    const log = (msg) => {
      job.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      logger.info(`[Job ${job.jobId}] ${msg}`);
    };

    const updateProgress = (step, current, total, message) => {
      job.progress = { step, current, total, message };
      log(message);
    };

    const checkCancelled = () => {
      if (job.isCancelled) throw new Error('JOB_CANCELLED');
    };

    try {
      job.status = 'running';
      updateProgress('copying_template', 0, data.length, 'Copying template presentation...');

      const slidesService = new SlidesService(auth);
      const driveService = new DriveService(auth);
      const exportService = new ExportService(auth);

      const presentationId = await driveService.copyFile(templateId, outputName);

      checkCancelled();
      log(`Copied template presentation. ID: ${presentationId}`);

      const { slideCount } = await slidesService.generateBulkSlides(presentationId, data, {
        dateFormat,
        checkCancelled,
        onProgress: ({ step, current, total, message }) => {
          updateProgress(step, current, total, message);
        },
      });

      checkCancelled();
      updateProgress('creating_pdf', slideCount, slideCount, 'Creating PDF package...');
      const pdfPath = await exportService.exportToPdf(presentationId, outputName);

      const metadata = await driveService.getFileMetadata(presentationId);

      job.status = 'done';
      job.progress = { step: 'finished', current: data.length, total: data.length, message: 'Finished successfully!' };
      job.result = {
        presentationId,
        presentationUrl: metadata.webViewLink,
        outputName,
        slideCount,
        rowCount: data.length,
        pdfPath,
        zipPath: null,
      };

      log(`JSON generation complete. ${slideCount} slides created.`);

      saveHistoryItem({
        id: job.jobId,
        userEmail: userEmail || 'anonymous',
        outputName,
        sourceType: 'json',
        presentationId,
        presentationUrl: metadata.webViewLink,
        slideCount,
        rowCount: data.length,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.message === 'JOB_CANCELLED') {
        job.status = 'cancelled';
        job.progress.message = 'Generation cancelled.';
      } else {
        job.status = 'error';
        job.error = err.message;
        job.progress.message = `Error: ${err.message}`;
      }
    }
  }

  /** GET /api/status/:jobId */
  static async getStatus(req, res) {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND' });
    }

    res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      result: job.result ? {
        presentationId: job.result.presentationId,
        presentationUrl: job.result.presentationUrl,
        outputName: job.result.outputName,
        slideCount: job.result.slideCount,
        rowCount: job.result.rowCount,
        pdfReady: Boolean(job.result.pdfPath && fs.existsSync(job.result.pdfPath)),
        imagesReady: Boolean(job.result.zipPath && fs.existsSync(job.result.zipPath)),
      } : null,
      error: job.error,
    });
  }

  /** POST /api/cancel/:jobId */
  static async cancelJob(req, res) {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (['done', 'error', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ error: `Job is already ${job.status}` });
    }

    job.isCancelled = true;
    res.json({ success: true, message: 'Cancel requested' });
  }

  /** GET /api/logs/:jobId */
  static async getLogs(req, res) {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).send('Job not found');
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="job_${jobId}_log.txt"`);
    res.send(job.logs.join('\n'));
  }
}

module.exports = GenerateController;
