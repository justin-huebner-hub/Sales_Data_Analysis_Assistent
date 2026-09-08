// =============================================================
// Parser — File parsing for CSV and Excel formats
// =============================================================

/**
 * Handles parsing of uploaded sales data files.
 * Supports CSV (via PapaParse or built-in fallback) and
 * Excel formats (via SheetJS / XLSX).
 */
export class Parser {

  /**
   * Parses an uploaded File object and returns an array of row objects.
   * @param {File} file
   * @returns {Promise<Array<Object>>}
   * @throws {Error} if the file type is unsupported or parsing fails
   */
  static async parseFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(extension)) {
      throw new Error("Unsupported file type. Please upload a CSV or Excel file.");
    }

    if (extension === "csv") {
      return Parser._parseCsv(file);
    }

    return Parser._parseExcel(file);
  }

  /**
   * Parses a CSV file using PapaParse (if available) or the built-in fallback.
   * @param {File} file
   * @returns {Promise<Array<Object>>}
   * @private
   */
  static async _parseCsv(file) {
    const text = await file.text();

    if (window.Papa) {
      // Use synchronous PapaParse — worker:true breaks with CDN-loaded scripts
      const parsed = window.Papa.parse(text, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        transformHeader: h => String(h).trim()
      });

      if (parsed.errors?.length) {
        const serious = parsed.errors.find(e => e.type === "Quotes" || e.type === "Delimiter");
        if (serious) throw new Error("CSV could not be parsed reliably. Please check delimiter and quotes.");
      }

      return parsed.data;
    }

    console.warn("PapaParse not found, falling back to basicCsvParse.");
    return Parser.basicCsvParse(text);
  }

  /**
   * Parses an Excel file using SheetJS (XLSX library).
   * @param {File} file
   * @returns {Promise<Array<Object>>}
   * @private
   */
  static async _parseExcel(file) {
    if (typeof XLSX === "undefined") {
      throw new Error("Excel support could not be loaded. Use CSV or check the internet connection.");
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("The Excel file does not contain a readable sheet.");
    }

    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
      raw: true
    });
  }

  /**
   * Built-in CSV parser as fallback when PapaParse is not available.
   * Auto-detects delimiter (semicolon, tab or comma).
   * @param {string} text
   * @returns {Array<Object>}
   */
  static basicCsvParse(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // Auto-detect delimiter: try semicolon, tab, then comma
    let delimiter = ",";
    const firstLine = lines[0];
    if (firstLine.includes(";") && firstLine.split(";").length > firstLine.split(",").length) {
      delimiter = ";";
    } else if (firstLine.includes("\t") && firstLine.split("\t").length > firstLine.split(",").length) {
      delimiter = "\t";
    }

    const rows = lines.map(line => line.split(delimiter));
    const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ""));
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = (row[i] ?? "").trim().replace(/^"|"$/g, ""));
      return obj;
    });
  }
}
