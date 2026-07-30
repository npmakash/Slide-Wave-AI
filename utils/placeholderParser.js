/**
 * utils/placeholderParser.js
 * Detect and parse {{placeholder}} patterns from Google Slides content
 */

/** Matches {{placeholder}}, {{placeholder|format}}, {{qr:value}} */
const PLACEHOLDER_REGEX = /\{\{([^}]+?)\}\}/g;

/**
 * Extract all unique placeholder names from a string
 * @param {string} text
 * @returns {string[]} Array of placeholder keys (without {{ }})
 */
function extractPlaceholders(text) {
  const found = new Set();
  let match;
  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    found.add(match[1].trim());
  }
  return Array.from(found);
}

/**
 * Extract all placeholders from a Google Slides presentation object
 * @param {object} presentation - Raw presentation resource from Slides API
 * @returns {{ key: string, raw: string, type: string }[]}
 */
function extractPlaceholdersFromPresentation(presentation) {
  const found = new Map();

  const processTextRun = (text) => {
    const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[0];
      const inner = match[1].trim();

      // Determine placeholder type
      let type = 'text';
      if (inner.startsWith('qr:')) type = 'qrcode';
      else if (inner.includes('|')) {
        const format = inner.split('|')[1].trim().toLowerCase();
        if (['dd/mm/yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd', 'date'].includes(format)) type = 'date';
        else if (['currency', 'percentage', 'percent', 'decimal'].includes(format)) type = 'number';
        else type = 'formatted';
      }

      if (!found.has(inner)) {
        found.set(inner, { key: inner, raw, type });
      }
    }
  };

  // Traverse all slides → elements → text content
  for (const slide of presentation.slides || []) {
    for (const element of slide.pageElements || []) {
      if (element.shape?.text) {
        for (const textEl of element.shape.text.textElements || []) {
          if (textEl.textRun?.content) {
            processTextRun(textEl.textRun.content);
          }
        }
      }
      if (element.table) {
        for (const row of element.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            for (const textEl of cell.text?.textElements || []) {
              if (textEl.textRun?.content) {
                processTextRun(textEl.textRun.content);
              }
            }
          }
        }
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Build a replacement map from a data record applying format rules
 * @param {object} record - { key: value } data row
 * @param {string[]} placeholderKeys - Keys found in the template
 * @param {object} opts - { dateFormat, fallback }
 * @returns {Map<string, string>} raw placeholder → replacement value
 */
function buildReplacementMap(record, placeholderKeys, opts = {}) {
  const { dateFormat = 'DD/MM/YYYY' } = opts;
  const { formatDate } = require('./dateFormatter');
  const { formatNumber } = require('./numberFormatter');

  const map = new Map();

  for (const key of placeholderKeys) {
    const raw = `{{${key}}}`;
    let baseKey = key;
    let format = null;
    let fallback = '';

    // Parse {{key|format}} or {{key|fallback}}
    if (key.includes('|')) {
      const parts = key.split('|');
      baseKey = parts[0].trim();
      const modifier = parts[1].trim();
      const knownFormats = ['dd/mm/yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd', 'currency', 'percentage', 'decimal'];
      if (knownFormats.includes(modifier.toLowerCase())) {
        format = modifier.toLowerCase();
      } else {
        fallback = modifier;
      }
    }

    // QR code placeholders — handled separately (image replacement)
    if (key.startsWith('qr:')) {
      map.set(raw, ''); // Will be replaced by image, set empty string for text
      continue;
    }

    let value = record[baseKey];

    if (value === undefined || value === null || value === '') {
      value = fallback;
    } else {
      value = String(value);
      if (format) {
        if (['dd/mm/yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd'].includes(format)) {
          value = formatDate(value, format);
        } else if (['currency', 'percentage', 'decimal'].includes(format)) {
          value = formatNumber(value, format);
        }
      }
    }

    map.set(raw, value || fallback);
  }

  return map;
}

module.exports = {
  extractPlaceholders,
  extractPlaceholdersFromPresentation,
  buildReplacementMap,
  PLACEHOLDER_REGEX,
};
