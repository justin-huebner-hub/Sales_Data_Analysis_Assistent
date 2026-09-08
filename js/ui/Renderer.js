// =============================================================
// Renderer — DOM rendering for data preview, mapping and results
// =============================================================

import { Helpers } from '../utils/Helpers.js';
import { Formatter } from '../utils/Formatter.js';
import { ColumnMapper } from '../analysis/ColumnMapper.js';

/**
 * Handles all DOM rendering: data preview table, column mapping
 * display, data quality cards, analysis results and metrics.
 */
export class Renderer {

  /**
   * @param {Object} elements — Map of DOM element references
   */
  constructor(elements) {
    this.el = elements;
  }

  /**
   * Sets a status message with type styling.
   * @param {HTMLElement} el
   * @param {string} message
   * @param {string} [type="info"]
   */
  setStatus(el, message, type = "info") {
    el.className = "status show " + type;
    el.textContent = message;
  }

  /**
   * Clears a status message element.
   * @param {HTMLElement} el
   */
  clearStatus(el) {
    el.className = "status";
    el.textContent = "";
  }

  /**
   * Shows or hides the loading spinner.
   * @param {boolean} value
   */
  showLoading(value) {
    this.el.loading.classList.toggle("show", value);
  }

  /**
   * Renders a preview table of the first rows.
   * @param {Array<Object>} rows
   */
  renderPreview(rows) {
    const previewRows = rows.slice(0, 12);
    const columns = Object.keys(previewRows[0] || {}).slice(0, 12);

    this.el.previewEmpty.style.display = "none";
    this.el.previewOutput.style.display = "block";
    this.el.previewSubtitle.textContent = `${Formatter.formatNumber(rows.length)} rows loaded. Showing first ${previewRows.length} rows.`;

    this.el.previewOutput.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>${columns.map(c => `<th>${Helpers.escapeHtml(c)}</th>`).join("")}</tr></thead>
          <tbody>
            ${previewRows.map(row => `
              <tr>${columns.map(c => `<td>${Helpers.escapeHtml(row[c])}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Renders the column mapping display with confidence chips.
   * @param {Object} mapping
   * @param {Object} details
   */
  renderMapping(mapping, details) {
    const labels = {
      date: "Date",
      product: "Product",
      category: "Category",
      quantity: "Quantity",
      unitPrice: "Unit price",
      revenue: "Revenue",
      region: "Region"
    };

    this.el.mappingEmpty.style.display = "none";
    this.el.mappingOutput.style.display = "block";

    this.el.mappingOutput.innerHTML = `
      <div class="mapping-list">
        ${Object.keys(labels).map(key => {
          const detail = details[key] || { confidence: 0 };
          const [label, cls] = ColumnMapper.confidenceLabel(detail.confidence);
          return `
            <div class="mapping-row">
              <div>
                <strong>${labels[key]}</strong>
                <small>${mapping[key] ? Helpers.escapeHtml(mapping[key]) : "No matching column detected"}</small>
              </div>
              <span class="chip ${cls}">${label}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  /**
   * Renders the data quality report card.
   * @param {Object} q — Data quality object
   */
  renderQuality(q) {
    this.el.qualityEmpty.style.display = "none";
    this.el.qualityOutput.style.display = "block";

    this.el.qualityOutput.innerHTML = `
      <div class="quality-grid">
        <div class="quality-item"><span>Uploaded rows</span><strong>${Formatter.formatNumber(q.totalRows)}</strong></div>
        <div class="quality-item"><span>Analyzed rows</span><strong>${Formatter.formatNumber(q.analyzedRows)}</strong></div>
        <div class="quality-item"><span>Skipped rows</span><strong>${Formatter.formatNumber(q.skippedRows)}</strong></div>
        <div class="quality-item"><span>Duplicate rows</span><strong>${Formatter.formatNumber(q.duplicateRows)}</strong></div>
        <div class="quality-item"><span>Invalid quantity</span><strong>${Formatter.formatNumber(q.invalidQuantity)}</strong></div>
        <div class="quality-item"><span>Invalid revenue</span><strong>${Formatter.formatNumber(q.invalidRevenue)}</strong></div>
        <div class="quality-item"><span>Invalid dates</span><strong>${Formatter.formatNumber(q.invalidDate)}</strong></div>
        <div class="quality-item"><span>Date range</span><strong>${q.dateRange ? `${Formatter.isoDate(q.dateRange.from)} \u2192 ${Formatter.isoDate(q.dateRange.to)}` : "Not available"}</strong></div>
      </div>
      <div class="status show info" style="display:block;margin-top:12px;">
        Revenue mode: ${Helpers.escapeHtml(q.revenueMode)}
      </div>
    `;
  }

  /**
   * Updates the region filter dropdown with available regions.
   * @param {Array} rows — Normalized rows
   */
  updateFilters(rows) {
    const regions = Array.from(new Set(rows.map(r => r.region).filter(Boolean))).sort();

    this.el.regionFilter.innerHTML = `<option value="">All regions</option>` +
      regions.map(r => `<option value="${Helpers.escapeHtml(r)}">${Helpers.escapeHtml(r)}</option>`).join("");

    this.el.regionFilter.disabled = false;
    this.el.granularityFilter.disabled = false;
  }

  /**
   * Generates the metrics HTML block.
   * @param {Object} summary
   * @returns {string}
   */
  /**
   * Renders a step-by-step upload progress bar.
   * @param {number} step — 0-based current step
   * @param {string[]} labels
   */
  renderProgress(step, labels) {
    const el = this.el.uploadStatus;
    el.className = "status show info";
    el.innerHTML = `
      <div class="upload-progress">
        ${labels.map((label, i) => `
          <div class="progress-step ${i < step ? 'done' : i === step ? 'active' : ''}"
               aria-label="Step ${i + 1}: ${label}">
            <div class="progress-dot">${i < step ? '✓' : i + 1}</div>
            <span>${label}</span>
          </div>
          ${i < labels.length - 1 ? '<div class="progress-line ' + (i < step ? 'done' : '') + '"></div>' : ''}
        `).join('')}
      </div>
    `;
  }

  renderMetrics(summary) {
    const animNum = (val, formatted) =>
      `<strong class="count-up" data-target="${val}">${formatted}</strong>`;
    return `
      <div class="metrics">
        <div class="metric"><span>Total revenue</span>${animNum(summary.totalRevenue, Formatter.formatCurrency(summary.totalRevenue))}<small>Code-calculated</small></div>
        <div class="metric"><span>Quantity sold</span>${animNum(summary.totalQuantity, Formatter.formatNumber(summary.totalQuantity))}<small>Analyzed units</small></div>
        <div class="metric"><span>Products</span>${animNum(summary.productCount, Formatter.formatNumber(summary.productCount))}<small>Unique product names</small></div>
        <div class="metric"><span>Rows analyzed</span>${animNum(summary.rowCount, Formatter.formatNumber(summary.rowCount))}<small>After validation</small></div>
      </div>
    `;
  }

  /**
   * Generates a mini data table HTML block.
   * @param {string} title
   * @param {Array} rows
   * @param {string} [mode="default"]
   * @returns {string}
   */
  renderMiniTable(title, rows, mode = "default") {
    return `
      <div class="mini-table-card">
        <h3>${Helpers.escapeHtml(title)}</h3>
        <div class="table-wrap" style="max-height:300px;border:0;border-radius:0;">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>${mode === "anomaly" ? "Drop" : "Revenue"}</th>
                <th>${mode === "anomaly" ? "Period" : "Qty"}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(row => `
                <tr>
                  <td>${Helpers.escapeHtml(row.name || row.period)}</td>
                  <td>${mode === "anomaly" ? Formatter.formatPercent(row.dropPercent) : Formatter.formatCurrency(row.revenue)}</td>
                  <td>${mode === "anomaly" ? Helpers.escapeHtml(row.previousPeriod + " \u2192 " + row.period) : Formatter.formatNumber(row.quantity)}</td>
                </tr>
              `).join("") : `<tr><td colspan="3">No data available</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Builds provenance information chips.
   * @param {Object} summary
   * @param {Object} state — AppState instance
   * @returns {string[]}
   */
  buildProvenance(summary, state) {
    const usedColumns = Object.entries(state.mapping)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`);

    const filters = [];
    if (summary.filters.region) filters.push(`Region: ${summary.filters.region}`);
    filters.push(`Granularity: ${summary.filters.granularity}`);

    return [
      `Calculated from ${Formatter.formatNumber(summary.rowCount)} rows`,
      `Columns used: ${usedColumns.join(", ")}`,
      `Revenue: ${state.dataQuality?.revenueMode || "unknown"}`,
      `Filters: ${filters.join(", ")}`
    ];
  }

  /**
   * Renders the full analysis results including answer card,
   * metrics, insights, tables and chart containers.
   * @param {Object} response
   * @param {Object} summary
   * @param {Object} state — AppState instance
   */
  renderResults(response, summary, state) {
    state.lastResponse = response;
    this.el.resultsEmpty.style.display = "none";
    this.el.resultsOutput.style.display = "grid";
    this.el.exportReportBtn.disabled = false;

    const provenance = this.buildProvenance(summary, state);

    this.el.resultsOutput.innerHTML = `
      <div class="answer-card">
        <h3>${Helpers.escapeHtml(response.title)}</h3>
        <p><strong>Direct answer:</strong> ${Helpers.escapeHtml(response.directAnswer)}</p>
        <p><strong>Business explanation:</strong> ${Helpers.escapeHtml(response.businessExplanation)}</p>
        <div class="provenance">
          ${provenance.map(item => `<span class="chip blue">${Helpers.escapeHtml(item)}</span>`).join("")}
          <span class="chip ${response.verification.valid ? "good" : "bad"}">
            ${response.verification.valid ? "Number claims verified" : "Unsupported number blocked"}
          </span>
        </div>
      </div>

      ${this.renderMetrics(summary)}

      <div class="ai-cards">
        <div class="ai-card"><span>Recommended action</span><p>${Helpers.escapeHtml(response.recommendedAction)}</p></div>
        <div class="ai-card"><span>Caveat</span><p>${Helpers.escapeHtml(response.caveat)}</p></div>
      </div>

      <div class="insight-card">
        <div class="insight-header">
          <h3>Key Insights</h3>
        </div>
        <ul class="insight-list" id="insightList">
          ${response.keyInsights.map(i => `<li>${Helpers.escapeHtml(i)}</li>`).join("")}
        </ul>
      </div>

      <div class="actions-grid">
        ${response.recommendedActions.map(a => `
          <div class="action-card">
            <span class="priority ${a.priority}">${a.priority}</span>
            <strong>${Helpers.escapeHtml(a.title)}</strong>
            <p>${Helpers.escapeHtml(a.reason)}</p>
          </div>
        `).join("")}
      </div>

      <div class="split-grid">
        ${this.renderMiniTable("Top 5 products by revenue", summary.topProducts)}
        ${this.renderMiniTable("Bottom 5 products by revenue", summary.bottomProducts)}
      </div>

      <div class="split-grid">
        ${this.renderMiniTable("Revenue by category", summary.categories.slice(0, 5))}
        ${this.renderMiniTable("Detected revenue drops", summary.anomalies, "anomaly")}
      </div>

      <div class="chart-grid">
        ${summary.topProducts.length ? `
        <div class="chart-card" id="chartCard-top">
          <div class="chart-card-header">
            <h3>Top 5 products by revenue</h3>
            <div class="chart-controls">
              <button class="chart-type-btn active" data-chart="top" data-type="bar">Bar</button>
              <button class="chart-type-btn" data-chart="top" data-type="line">Line</button>
            </div>
          </div>
          <div class="chart-body">
            <div class="chart-wrap"><canvas id="topProductsChart"></canvas></div>
          </div>
        </div>` : ''}
        ${summary.categories.length ? `
        <div class="chart-card" id="chartCard-category">
          <div class="chart-card-header">
            <h3>Revenue by category</h3>
            <div class="chart-controls">
              <button class="chart-type-btn active" data-chart="category" data-type="doughnut">Doughnut</button>
              <button class="chart-type-btn" data-chart="category" data-type="bar">Bar</button>
            </div>
          </div>
          <div class="chart-body">
            <div class="chart-wrap"><canvas id="categoryChart"></canvas></div>
          </div>
        </div>` : ''}
        ${summary.revenueOverTime.length >= 2 ? `
        <div class="chart-card wide" id="chartCard-trend">
          <div class="chart-card-header">
            <h3>Revenue trend with peak and anomaly markers</h3>
            <div class="chart-controls">
              <button class="chart-type-btn active" data-chart="trend" data-type="line">Line</button>
              <button class="chart-type-btn" data-chart="trend" data-type="bar">Bar</button>
            </div>
          </div>
          <div class="chart-body">
            <div class="chart-wrap tall"><canvas id="trendChart"></canvas></div>
          </div>
        </div>` : ''}
        ${summary.pareto.length >= 2 ? `
        <div class="chart-card wide" id="chartCard-pareto">
          <div class="chart-card-header">
            <h3>Pareto chart: product concentration</h3>
          </div>
          <div class="chart-body">
            <div class="chart-wrap tall"><canvas id="paretoChart"></canvas></div>
          </div>
        </div>` : ''}
      </div>
    `;
  }
}
