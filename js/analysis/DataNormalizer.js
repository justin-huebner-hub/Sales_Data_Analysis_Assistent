// =============================================================
// DataNormalizer — Row normalization and data quality assessment
// =============================================================

import { Helpers } from '../utils/Helpers.js';

/**
 * Normalizes raw parsed rows into a consistent internal format
 * and generates a data quality report.
 */
export class DataNormalizer {

  /**
   * Normalizes raw rows by extracting mapped fields, converting
   * values to proper types and tracking data quality issues.
   * @param {Array<Object>} rawRows
   * @param {Object} mapping — Column mapping from ColumnMapper
   * @returns {{ rows: Array<Object>, issues: Object }}
   */
  static normalizeRows(rawRows, mapping) {
    const normalized = [];
    const issues = {
      missingProduct: 0,
      invalidQuantity: 0,
      invalidRevenue: 0,
      invalidDate: 0,
      duplicateRows: 0,
      skippedRows: 0
    };

    const seen = new Set();

    rawRows.forEach((row, index) => {
      // Fast fingerprinting instead of JSON.stringify to prevent massive slowdowns
      const fingerprint = Object.values(row).join("|");
      if (seen.has(fingerprint)) issues.duplicateRows++;
      seen.add(fingerprint);

      const product = mapping.product ? String(row[mapping.product] ?? "").trim() : "";
      const category = mapping.category ? String(row[mapping.category] ?? "").trim() : "Uncategorized";
      const region = mapping.region ? String(row[mapping.region] ?? "").trim() : "Unknown";
      const quantity = mapping.quantity ? Helpers.toNumber(row[mapping.quantity]) : null;
      const unitPrice = mapping.unitPrice ? Helpers.toNumber(row[mapping.unitPrice]) : null;
      const revenueFromColumn = mapping.revenue ? Helpers.toNumber(row[mapping.revenue]) : null;
      const revenue = revenueFromColumn !== null
        ? revenueFromColumn
        : (quantity !== null && unitPrice !== null ? quantity * unitPrice : null);
      const date = mapping.date ? Helpers.parseDate(row[mapping.date]) : null;

      let invalid = false;

      if (!product) {
        issues.missingProduct++;
        invalid = true;
      }

      if (quantity === null || quantity < 0) {
        issues.invalidQuantity++;
        invalid = true;
      }

      if (revenue === null || revenue < 0) {
        issues.invalidRevenue++;
        invalid = true;
      }

      if (mapping.date && !date) {
        issues.invalidDate++;
      }

      if (invalid) {
        issues.skippedRows++;
        return;
      }

      normalized.push({
        product,
        category: category || "Uncategorized",
        region: region || "Unknown",
        quantity,
        unitPrice,
        revenue,
        date,
        original: row
      });
    });

    return { rows: normalized, issues };
  }

  /**
   * Builds a data quality report from raw and normalized data.
   * @param {Array} rawRows
   * @param {Array} normalizedRows
   * @param {Object} issues
   * @param {Object} mapping
   * @param {Object} mappingDetails
   * @returns {Object}
   */
  static buildDataQuality(rawRows, normalizedRows, issues, mapping, mappingDetails) {
    const dated = normalizedRows.filter(r => r.date);
    const dates = dated.map(r => r.date).sort((a, b) => a - b);

    const revenueMode = mapping.revenue
      ? `Read from column "${mapping.revenue}"`
      : `Calculated from "${mapping.quantity}" × "${mapping.unitPrice}"`;

    const confidence = Object.fromEntries(
      Object.entries(mappingDetails).map(([key, detail]) => [key, detail.confidence])
    );

    return {
      totalRows: rawRows.length,
      analyzedRows: normalizedRows.length,
      skippedRows: issues.skippedRows,
      duplicateRows: issues.duplicateRows,
      missingProduct: issues.missingProduct,
      invalidQuantity: issues.invalidQuantity,
      invalidRevenue: issues.invalidRevenue,
      invalidDate: issues.invalidDate,
      dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
      revenueMode,
      mappingConfidence: confidence
    };
  }
}
