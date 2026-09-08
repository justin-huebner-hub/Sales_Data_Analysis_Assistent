// =============================================================
// AppState — Central application state container
// =============================================================

/**
 * Manages the central application state including loaded data,
 * column mappings, analysis results and question history.
 */
export class AppState {

  constructor() {
    /** @type {string} Name of the currently loaded file */
    this.fileName = "";

    /** @type {Array<Object>} Raw parsed rows from the uploaded file */
    this.rawRows = [];

    /** @type {Array<Object>} Normalized and validated rows */
    this.normalizedRows = [];

    /** @type {Array<string>} Column headers from the uploaded file */
    this.columns = [];

    /** @type {Object} Business field to column name mapping */
    this.mapping = {};

    /** @type {Object} Mapping details with confidence scores */
    this.mappingDetails = {};

    /** @type {Object|null} Data quality report */
    this.dataQuality = null;

    /** @type {Object|null} Latest analysis summary */
    this.summary = null;

    /** @type {Object} Active Chart.js instances */
    this.charts = {};

    /** @type {Object|null} Last generated response */
    this.lastResponse = null;

    /** @type {Array<Object>} History of asked questions */
    this.history = [];
  }

  /**
   * Checks whether usable data has been loaded.
   * @returns {boolean}
   */
  hasData() {
    return this.normalizedRows.length > 0;
  }

  /**
   * Resets all state except question history.
   * History is preserved across file reloads.
   */
  reset() {
    this.fileName = "";
    this.rawRows = [];
    this.normalizedRows = [];
    this.columns = [];
    this.mapping = {};
    this.mappingDetails = {};
    this.dataQuality = null;
    this.summary = null;
    this.lastResponse = null;
    // Keep history across resets
  }
}
