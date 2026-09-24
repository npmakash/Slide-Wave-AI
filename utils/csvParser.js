/**
 * utils/csvParser.js
 * Robust CSV string parser handling quoted values, commas, quotes, and line breaks
 */

function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return { headers: [], records: [] };
  }

  const lines = [];
  let currentRow = [];
  let currentToken = '';
  let inQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted text
        currentToken += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentToken.trim());
      currentToken = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentToken.trim());
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || currentRow.length > 0) {
    currentRow.push(currentToken.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], records: [] };
  }

  // First row is headers
  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h, idx) => (h ? h.trim() : `column_${idx + 1}`));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const recordObj = {};
    headers.forEach((header, colIdx) => {
      recordObj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
    });
    records.push(recordObj);
  }

  return { headers, records };
}

module.exports = { parseCSV };
