// =============================================================
// ClaimVerifier — Numeric claim verification for AI-style answers
// =============================================================

/**
 * Verifies that numeric values mentioned in generated answer texts
 * actually exist in the computed analysis data. This ensures the
 * explanation layer never shows invented numbers.
 */
export class ClaimVerifier {

  /**
   * Collects all legitimate numeric values from the analysis summary.
   * @param {Object} summary
   * @returns {number[]}
   */
  static collectAllowedNumbers(summary) {
    const values = [
      summary.totalRevenue,
      summary.totalQuantity,
      summary.rowCount,
      summary.productCount,
      summary.categoryCount,
      summary.regionCount
    ];

    const collections = [
      summary.topProducts,
      summary.bottomProducts,
      summary.categories,
      summary.regions,
      summary.revenueOverTime,
      summary.anomalies,
      summary.pareto
    ];

    collections.forEach(list => {
      (list || []).forEach(item => {
        Object.values(item).forEach(value => {
          if (typeof value === "number" && Number.isFinite(value)) values.push(value);
        });
      });
    });

    return values.map(n => Math.round(n * 100) / 100);
  }

  /**
   * Extracts numeric patterns from a text string.
   * @param {string} text
   * @returns {string[]}
   */
  static extractNumbers(text) {
    return String(text).match(/\d+([.,]\d+)?%?|\d+([.,]\d+)?\s?\u20ac|\u20ac\s?\d+([.,]\d+)?/g) || [];
  }

  /**
   * Verifies that all numbers in the AI response text are
   * backed by computed data.
   * @param {Object} aiJson — Object with text fields to check
   * @param {number[]} allowedNumbers — Legitimate values from analysis
   * @returns {{ valid: boolean, suspiciousNumbers: string[] }}
   */
  static verify(aiJson, allowedNumbers) {
    const text = Object.values(aiJson).join(" ");
    const extracted = ClaimVerifier.extractNumbers(text);

    const suspicious = extracted.filter(raw => {
      const cleaned = raw
        .replace(/[\u20ac%\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

      const numeric = Number(cleaned);
      if (!Number.isFinite(numeric)) return false;

      return !allowedNumbers.some(allowed => {
        return Math.abs(allowed - numeric) < .11 || Math.abs(Math.abs(allowed) - Math.abs(numeric)) < .11;
      });
    });

    return {
      valid: suspicious.length === 0,
      suspiciousNumbers: suspicious
    };
  }
}
