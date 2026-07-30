/**
 * utils/numberFormatter.js
 * Number value formatting for template placeholders
 */

/**
 * Format a numeric value
 * @param {string|number} value
 * @param {string} format - 'currency' | 'percentage' | 'decimal'
 * @returns {string}
 */
function formatNumber(value, format = 'decimal') {
  if (value === '' || value === null || value === undefined) return '';

  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return String(value);

  switch (format.toLowerCase()) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(num);

    case 'percentage':
    case 'percent':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num / 100);

    case 'decimal':
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
  }
}

module.exports = { formatNumber };
