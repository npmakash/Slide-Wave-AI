/**
 * services/SheetsService.js
 * Read data from Google Sheets via the Sheets API
 */

const { google } = require('googleapis');
const { retryWithBackoff } = require('../utils/retryWithBackoff');
const logger = require('../utils/logger');

class SheetsService {
  /**
   * @param {import('googleapis').Auth.OAuth2Client} auth
   */
  constructor(auth) {
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Read all rows from a sheet and return them as an array of objects
   * The first row is treated as headers (keys).
   *
   * @param {string} spreadsheetId
   * @param {string} [sheetName] - Optional: specific sheet/tab name
   * @param {boolean} [skipEmpty=true] - Skip rows where all values are empty
   * @returns {Promise<{ records: object[], headers: string[], rawRows: string[][] }>}
   */
  async readRows(spreadsheetId, sheetName = '', skipEmpty = true) {
    // Build the range — if no sheet name specified, use Sheet1 default
    const range = sheetName ? `'${sheetName}'!A:ZZ` : 'A:ZZ';

    logger.info(`Reading sheet ${spreadsheetId}, range: ${range}`);

    const response = await retryWithBackoff(() =>
      this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      })
    );

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return { records: [], headers: [], rawRows: [] };
    }

    // First row = headers
    const headers = rows[0].map((h) => String(h || '').trim()).filter(Boolean);

    if (headers.length === 0) {
      throw new Error('The sheet appears to have no headers in the first row.');
    }

    const records = [];
    const rawRows = rows.slice(1);

    for (const row of rawRows) {
      const record = {};
      let hasValue = false;

      for (let i = 0; i < headers.length; i++) {
        const val = String(row[i] !== undefined ? row[i] : '').trim();
        record[headers[i]] = val;
        if (val) hasValue = true;
      }

      if (skipEmpty && !hasValue) continue;
      records.push(record);
    }

    logger.info(`Sheet read: ${headers.length} columns, ${records.length} data rows`);
    return { records, headers, rawRows };
  }

  /**
   * Get the list of sheet names in a spreadsheet
   * @param {string} spreadsheetId
   * @returns {Promise<string[]>}
   */
  async getSheetNames(spreadsheetId) {
    const response = await retryWithBackoff(() =>
      this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      })
    );
    return (response.data.sheets || []).map((s) => s.properties.title);
  }
}

module.exports = SheetsService;
