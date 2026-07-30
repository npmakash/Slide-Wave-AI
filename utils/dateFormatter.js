/**
 * utils/dateFormatter.js
 * Date value formatting for template placeholders
 */

/**
 * Format a date string or Date object to a specified format
 * @param {string|Date} value
 * @param {string} format - 'dd/mm/yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd'
 * @returns {string}
 */
function formatDate(value, format = 'dd/mm/yyyy') {
  if (!value) return '';

  let date;

  // Try to parse the value
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    // Handle common spreadsheet serial numbers (Excel/Google Sheets numeric dates)
    if (/^\d+$/.test(value.trim())) {
      const serial = parseInt(value.trim(), 10);
      // Excel serial date: days since 1900-01-01 (with leap year bug)
      if (serial > 40000 && serial < 60000) {
        const excelEpoch = new Date(1899, 11, 30);
        date = new Date(excelEpoch.getTime() + serial * 86400000);
      } else {
        return value; // Not a date serial, return as-is
      }
    } else {
      date = new Date(value);
    }
  }

  if (!date || isNaN(date.getTime())) return String(value);

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  switch (format.toLowerCase()) {
    case 'dd/mm/yyyy': return `${dd}/${mm}/${yyyy}`;
    case 'mm-dd-yyyy': return `${mm}-${dd}-${yyyy}`;
    case 'yyyy-mm-dd': return `${yyyy}-${mm}-${dd}`;
    case 'dd-mm-yyyy': return `${dd}-${mm}-${yyyy}`;
    case 'mm/dd/yyyy': return `${mm}/${dd}/${yyyy}`;
    default:           return `${dd}/${mm}/${yyyy}`;
  }
}

/**
 * Get today's date in specified format
 * @param {string} format
 * @returns {string}
 */
function today(format = 'dd/mm/yyyy') {
  return formatDate(new Date(), format);
}

module.exports = { formatDate, today };
