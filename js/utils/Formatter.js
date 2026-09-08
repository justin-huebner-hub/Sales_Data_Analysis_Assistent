// =============================================================
// Formatter — Number, currency and date formatting utilities
// =============================================================

/**
 * Provides static formatting methods for numbers, currency,
 * percentages and dates used throughout the application.
 */
export class Formatter {

  /**
   * Formats a numeric value as EUR currency (German locale).
   * @param {number} value
   * @returns {string}
   */
  static formatCurrency(value) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  /**
   * Formats a numeric value with German locale grouping.
   * @param {number} value
   * @returns {string}
   */
  static formatNumber(value) {
    return new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  /**
   * Formats a numeric value as a percentage string.
   * @param {number} value
   * @returns {string}
   */
  static formatPercent(value) {
    return new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 1
    }).format(value || 0) + "%";
  }

  /**
   * Converts a Date object to an ISO date string (YYYY-MM-DD).
   * @param {Date|null} date
   * @returns {string}
   */
  static isoDate(date) {
    return date ? date.toISOString().slice(0, 10) : "";
  }
}
