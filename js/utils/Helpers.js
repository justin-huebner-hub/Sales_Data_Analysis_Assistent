// =============================================================
// Helpers — General-purpose utility functions
// =============================================================

/**
 * Collection of stateless helper functions for HTML escaping,
 * header normalization, value conversion, date parsing and
 * data aggregation.
 */
export class Helpers {

  /**
   * Escapes HTML special characters to prevent XSS.
   * @param {*} value
   * @returns {string}
   */
  static escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * Normalizes a column header for matching: lowercases, strips
   * diacritics, replaces German umlauts and special characters.
   * @param {*} value
   * @returns {string}
   */
  static normalizeHeader(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  /**
   * Converts a raw value to a number, handling European and
   * US number formats, currency symbols and whitespace.
   * @param {*} value
   * @returns {number|null}
   */
  static toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    let raw = String(value).trim();
    if (!raw) return null;

    raw = raw
      .replace(/[€$£\s]/g, "")
      .replace(/%/g, "");

    let isEuropean = false;
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");

    if (lastComma > lastDot) {
      isEuropean = true; // e.g. 1.234,56 or 1,56
    } else if (lastDot !== -1 && lastComma === -1 && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
      isEuropean = true; // e.g. 1.000 (German grouping)
    }

    if (isEuropean) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else {
      raw = raw.replace(/,/g, "");
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Parses a raw value into a Date object. Supports ISO strings,
   * European date formats (DD.MM.YYYY) and Excel serial numbers.
   * @param {*} value
   * @returns {Date|null}
   */
  static parseDate(value) {
    if (value === null || value === undefined || value === "") return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    if (typeof value === "number" && value > 25000 && value < 80000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const european = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (european) {
      let [, d, m, y] = european;
      if (y.length === 2) y = "20" + y;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * Generates a time-period key for grouping rows by date.
   * @param {Date} date
   * @param {string} granularity — "day", "week" or "month"
   * @returns {string}
   */
  static periodKey(date, granularity) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    if (granularity === "day") return `${y}-${m}-${d}`;

    if (granularity === "week") {
      const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
      return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    }

    return `${y}-${m}`;
  }

  /**
   * Sums a numeric property across an array of rows.
   * @param {Array} rows
   * @param {Function} selector
   * @returns {number}
   */
  static sum(rows, selector) {
    return rows.reduce((total, row) => total + (selector(row) || 0), 0);
  }

  /**
   * Groups rows by a key function into a Map.
   * @param {Array} rows
   * @param {Function} fn
   * @returns {Map}
   */
  static groupBy(rows, fn) {
    const map = new Map();
    rows.forEach(row => {
      const key = fn(row) || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return map;
  }

  /**
   * Aggregates revenue and quantity by a grouping function,
   * sorted descending by revenue.
   * @param {Array} rows
   * @param {Function} fn
   * @returns {Array}
   */
  static aggregateRevenue(rows, fn) {
    return Array.from(Helpers.groupBy(rows, fn).entries())
      .map(([name, items]) => ({
        name,
        revenue: Helpers.sum(items, r => r.revenue),
        quantity: Helpers.sum(items, r => r.quantity),
        count: items.length
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }
}
