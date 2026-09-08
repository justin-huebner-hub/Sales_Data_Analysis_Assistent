// =============================================================
// EventHandler — UI event binding and workflow orchestration
// =============================================================

import { Helpers } from '../utils/Helpers.js';
import { Formatter } from '../utils/Formatter.js';
import { Parser } from '../utils/Parser.js';
import { ColumnMapper } from '../analysis/ColumnMapper.js';
import { DataNormalizer } from '../analysis/DataNormalizer.js';
import { SalesAnalyzer } from '../analysis/SalesAnalyzer.js';
import { QuestionRouter } from '../analysis/QuestionRouter.js';

/**
 * Manages all user interactions: file upload, drag-and-drop,
 * question input, suggestion buttons, demo story, theme toggle,
 * history management and report export.
 */
export class EventHandler {

  /**
   * @param {AppState} state
   * @param {Renderer} renderer
   * @param {ChartRenderer} chartRenderer
   * @param {Object} el — DOM element references
   */
  constructor(state, renderer, chartRenderer, el) {
    this.state = state;
    this.renderer = renderer;
    this.chartRenderer = chartRenderer;
    this.el = el;
  }

  /**
   * Binds all event listeners. Call once after construction.
   */
  init() {
    const { el } = this;

    // File upload
    el.fileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Drag and drop
    el.uploadBox.addEventListener("dragover", e => {
      e.preventDefault();
      el.uploadBox.classList.add("dragover");
    });

    el.uploadBox.addEventListener("dragleave", () => {
      el.uploadBox.classList.remove("dragover");
    });

    el.uploadBox.addEventListener("drop", e => {
      e.preventDefault();
      el.uploadBox.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });

    // Analysis
    el.analyzeBtn.addEventListener("click", () => this.runAnalysis());
    el.questionInput.addEventListener("keydown", e => {
      if (e.key === "Enter") this.runAnalysis();
    });

    // Suggestion buttons
    el.allSuggestionBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        if (!this.state.hasData()) {
          el.uploadBox.scrollIntoView({ behavior: "smooth", block: "center" });
          el.uploadBox.classList.add("pulse");
          setTimeout(() => el.uploadBox.classList.remove("pulse"), 4000);
          this.renderer.setStatus(el.analysisStatus, "Please upload a sales dataset first, then click a question.", "warn");
          return;
        }
        el.questionInput.value = btn.textContent.trim();
        this.runAnalysis();
      });
    });

    // Filters
    el.regionFilter.addEventListener("change", () => this.runAnalysis());
    el.granularityFilter.addEventListener("change", () => this.runAnalysis());

    // Action buttons
    el.exportReportBtn.addEventListener("click", () => this.exportReport());
    el.newFileBtn.addEventListener("click", () => this.resetState());

    // Theme toggle
    el.themeBtn.addEventListener("click", () => {
      const html = document.documentElement;
      const dark = html.getAttribute("data-theme") === "dark";
      html.setAttribute("data-theme", dark ? "light" : "dark");
      el.themeBtn.textContent = dark ? "Dark Mode" : "Light Mode";
      if (this.state.summary) {
        setTimeout(() => this.chartRenderer.renderCharts(this.state.summary), 20);
      }
    });

    // History toggle
    el.historyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      el.historyDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!el.historyDropdown.contains(e.target) && e.target !== el.historyBtn) {
        el.historyDropdown.classList.remove("show");
      }
    });

    // Chart type toggle (delegated to document)
    document.addEventListener("click", (e) => {
      // Chart type switch
      const typeBtn = e.target.closest(".chart-type-btn");
      if (typeBtn) {
        const chartKey = typeBtn.dataset.chart;
        const newType = typeBtn.dataset.type;
        typeBtn.closest(".chart-controls").querySelectorAll(".chart-type-btn").forEach(b => b.classList.remove("active"));
        typeBtn.classList.add("active");
        this.chartRenderer.switchChartType(chartKey, newType, this.state.summary);
        return;
      }
    });

    // Start with suggestions disabled
    this._setSuggestionsDisabled(true);
  }

  /**
   * Processes raw parsed rows through the full analysis pipeline.
   * @param {Array<Object>} rawRows
   * @param {string} [fileName="sample-sales-data.csv"]
   */
  async handleRows(rawRows, fileName = "sample-sales-data.csv") {
    this.renderer.clearStatus(this.el.uploadStatus);
    this.renderer.clearStatus(this.el.analysisStatus);
    this.renderer.showLoading(true);
    this.el.analyzeBtn.disabled = true;
    this.el.exportReportBtn.disabled = true;

    try {
      if (!rawRows.length) throw new Error("The file contains no readable data rows.");

      const columns = Object.keys(rawRows[0] || {});
      if (!columns.length) throw new Error("No column headers were detected.");

      const PROGRESS_LABELS = ["Parsing", "Column mapping", "Quality check", "Ready"];
      this.renderer.renderProgress(0, PROGRESS_LABELS);
      await new Promise(r => setTimeout(r, 30));

      const { mapping, details } = ColumnMapper.buildMapping(columns);
      const validation = ColumnMapper.validateMapping(mapping);

      this.renderer.renderProgress(1, PROGRESS_LABELS);
      await new Promise(r => setTimeout(r, 30));

      this.renderer.renderPreview(rawRows);
      this.renderer.renderMapping(mapping, details);

      if (!validation.valid) {
        this.state.rawRows = rawRows;
        this.state.columns = columns;
        this.state.mapping = mapping;
        this.state.mappingDetails = details;

        this.renderer.setStatus(this.el.uploadStatus, "File loaded, but analysis cannot start. Missing: " + validation.missing.join(", ") + ".", "error");
        this.renderer.showLoading(false);
        return;
      }

      const normalizedResult = DataNormalizer.normalizeRows(rawRows, mapping);
      if (!normalizedResult.rows.length) {
        throw new Error("No usable sales rows were found after validation.");
      }

      this.renderer.renderProgress(2, PROGRESS_LABELS);
      await new Promise(r => setTimeout(r, 30));

      const quality = DataNormalizer.buildDataQuality(rawRows, normalizedResult.rows, normalizedResult.issues, mapping, details);

      this.state.fileName = fileName;
      this.state.rawRows = rawRows;
      this.state.normalizedRows = normalizedResult.rows;
      this.state.columns = columns;
      this.state.mapping = mapping;
      this.state.mappingDetails = details;
      this.state.dataQuality = quality;

      this.renderer.renderQuality(quality);
      this.renderer.updateFilters(normalizedResult.rows);

      this.renderer.renderProgress(3, PROGRESS_LABELS);

      this.el.analyzeBtn.disabled = false;
      this.el.newFileBtn.classList.add("show");
      this._setSuggestionsDisabled(false);

      const statusType = quality.skippedRows > 0 ? "warn" : "success";
      this.renderer.setStatus(
        this.el.uploadStatus,
        `Success: ${Formatter.formatNumber(quality.analyzedRows)} usable rows loaded from "${fileName}". ${quality.skippedRows ? `${Formatter.formatNumber(quality.skippedRows)} row(s) skipped.` : "No rows skipped."}`,
        statusType
      );

      this.el.questionInput.value = "What are the most important trends in the data?";
      this.runAnalysis();
    } catch (error) {
      this.renderer.setStatus(this.el.uploadStatus, error.message || "The file could not be processed.", "error");
      this.el.previewEmpty.style.display = "grid";
      this.el.previewOutput.style.display = "none";
      this.el.resultsEmpty.style.display = "grid";
      this.el.resultsOutput.style.display = "none";
    } finally {
      this.renderer.showLoading(false);
    }
  }

  /**
   * Handles a file upload by parsing and processing.
   * @param {File} file
   */
  async handleFile(file) {
    // Validate file type before doing anything
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      this.el.uploadBox.classList.add("error");
      this.renderer.setStatus(this.el.uploadStatus, `Unsupported file type ".${ext}". Please upload a CSV or Excel file (.csv, .xlsx, .xls).`, "error");
      setTimeout(() => this.el.uploadBox.classList.remove("error"), 2500);
      return;
    }

    this.renderer.showLoading(true);
    // Yield to the browser so the spinner can be painted before heavy tasks block the thread
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const rows = await Parser.parseFile(file);
      await this.handleRows(rows, file.name);
    } catch (error) {
      this.renderer.setStatus(this.el.uploadStatus, error.message || "The file could not be processed.", "error");
    } finally {
      this.renderer.showLoading(false);
    }
  }

  /**
   * Runs the analysis for the current question and filters.
   */
  runAnalysis() {
    this.renderer.clearStatus(this.el.analysisStatus);

    if (!this.state.hasData()) {
      this.renderer.setStatus(this.el.analysisStatus, "Upload a valid sales dataset before asking a question.", "error");
      return;
    }

    const question = this.el.questionInput.value.trim();
    if (!question) {
      this.renderer.setStatus(this.el.analysisStatus, "Enter a business question or click a suggested question.", "error");
      return;
    }

    const summary = SalesAnalyzer.analyze(this.state.normalizedRows, {
      region: this.el.regionFilter.value,
      granularity: this.el.granularityFilter.value
    });
    this.state.summary = summary;

    const response = QuestionRouter.answerQuestion(question, summary);
    this.renderer.renderResults(response, summary, this.state);
    this.chartRenderer.renderCharts(summary);
    this._animateCountUp();

    // Track in history
    this.state.history.push({
      question,
      intent: response.intent,
      timestamp: new Date()
    });
    this._renderHistory();

    this.renderer.setStatus(this.el.analysisStatus, "Analysis complete. All metrics are deterministic and number claims were checked.", "success");
  }

  /**
   * Exports the current analysis as a structured multi-sheet Excel file (.xlsx).
   * Requires the SheetJS (XLSX) library loaded via CDN.
   */
  exportReport() {
    if (!this.state.summary || !this.state.lastResponse) return;
    if (typeof XLSX === "undefined") {
      this.renderer.setStatus(this.el.analysisStatus, "Excel export requires an internet connection (SheetJS library).", "error");
      return;
    }

    const s = this.state.summary;
    const r = this.state.lastResponse;
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ────────────────────────────────────────
    const summaryData = [
      ["Sales Data Analysis Report"],
      [],
      ["Generated",       new Date().toLocaleString("de-DE")],
      ["Source file",     this.state.fileName],
      ["Question asked",  this.el.questionInput.value.trim()],
      [],
      ["KEY METRICS"],
      ["Metric",          "Value"],
      ["Total Revenue (€)",   s.totalRevenue],
      ["Total Quantity",      s.totalQuantity],
      ["Products",            s.productCount],
      ["Categories",          s.categoryCount],
      ["Regions",             s.regionCount],
      ["Rows analyzed",       s.rowCount],
      [],
      ["ANALYSIS RESULT"],
      ["Direct answer",       r.directAnswer],
      ["Business explanation",r.businessExplanation],
      ["Recommended action",  r.recommendedAction],
      ["Caveat",              r.caveat],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // ── Sheet 2: All Products ────────────────────────────────────
    const productRows = [["Rank", "Product", "Revenue (€)", "Quantity", "% of Total Revenue"]];
    s.products.forEach((p, i) => productRows.push([
      i + 1, p.name,
      parseFloat(p.revenue.toFixed(2)),
      p.quantity,
      parseFloat((s.totalRevenue > 0 ? (p.revenue / s.totalRevenue * 100) : 0).toFixed(1))
    ]));
    const wsProducts = XLSX.utils.aoa_to_sheet(productRows);
    wsProducts["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

    // ── Sheet 3: Categories ──────────────────────────────────────
    const catRows = [["Rank", "Category", "Revenue (€)", "Quantity", "% of Total Revenue"]];
    s.categories.forEach((c, i) => catRows.push([
      i + 1, c.name,
      parseFloat(c.revenue.toFixed(2)),
      c.quantity,
      parseFloat((s.totalRevenue > 0 ? (c.revenue / s.totalRevenue * 100) : 0).toFixed(1))
    ]));
    const wsCategories = XLSX.utils.aoa_to_sheet(catRows);
    wsCategories["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsCategories, "Categories");

    // ── Sheet 4: Revenue Over Time ───────────────────────────────
    if (s.revenueOverTime.length) {
      const trendRows = [["Period", "Revenue (€)", "Quantity", "Is Peak", "Is Anomaly"]];
      const peakName = s.peakPeriod?.name;
      const anomalyPeriods = new Set(s.anomalies.map(a => a.period));
      s.revenueOverTime.forEach(t => trendRows.push([
        t.name,
        parseFloat(t.revenue.toFixed(2)),
        t.quantity,
        t.name === peakName ? "Yes" : "",
        anomalyPeriods.has(t.name) ? "Yes" : ""
      ]));
      const wsTrend = XLSX.utils.aoa_to_sheet(trendRows);
      wsTrend["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsTrend, "Revenue Over Time");
    }

    // ── Sheet 5: Anomalies ───────────────────────────────────────
    if (s.anomalies.length) {
      const anomalyRows = [["Period", "Previous Period", "Revenue (€)", "Previous Revenue (€)", "Drop %", "Z-Score"]];
      s.anomalies.forEach(a => anomalyRows.push([
        a.period, a.previousPeriod,
        parseFloat(a.revenue.toFixed(2)),
        parseFloat(a.previousRevenue.toFixed(2)),
        parseFloat(a.dropPercent.toFixed(1)),
        parseFloat((a.zScore || 0).toFixed(2))
      ]));
      const wsAnomalies = XLSX.utils.aoa_to_sheet(anomalyRows);
      wsAnomalies["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsAnomalies, "Anomalies");
    }

    // ── Sheet 6: Pareto ──────────────────────────────────────────
    if (s.pareto.length) {
      const paretoRows = [["Rank", "Product", "Revenue (€)", "Cumulative Share %"]];
      s.pareto.forEach(p => paretoRows.push([
        p.rank, p.name,
        parseFloat(p.revenue.toFixed(2)),
        parseFloat(p.cumulativeShare.toFixed(1))
      ]));
      const wsPareto = XLSX.utils.aoa_to_sheet(paretoRows);
      wsPareto["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsPareto, "Pareto");
    }

    // ── Download ─────────────────────────────────────────────────
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `sales-analysis-${date}.xlsx`);
  }

  /**
   * Resets the application to its initial state.
   */
  resetState() {
    this.state.reset();
    this.chartRenderer.destroyCharts();

    // Reset UI
    this.renderer.clearStatus(this.el.uploadStatus);
    this.renderer.clearStatus(this.el.analysisStatus);
    this.el.previewEmpty.style.display = "grid";
    this.el.previewOutput.style.display = "none";
    this.el.previewSubtitle.textContent = "Upload a file to preview the first rows.";
    this.el.mappingEmpty.style.display = "grid";
    this.el.mappingOutput.style.display = "none";
    this.el.qualityEmpty.style.display = "grid";
    this.el.qualityOutput.style.display = "none";
    this.el.resultsEmpty.style.display = "grid";
    this.el.resultsOutput.style.display = "none";

    this.el.questionInput.value = "";
    this.el.analyzeBtn.disabled = true;
    this.el.exportReportBtn.disabled = true;
    this.el.regionFilter.disabled = true;
    this.el.granularityFilter.disabled = true;
    this.el.regionFilter.innerHTML = '<option value="">All regions</option>';
    this.el.fileInput.value = "";

    this.el.newFileBtn.classList.remove("show");
    this._setSuggestionsDisabled(true);

    this.el.uploadBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /**
   * Renders the question history dropdown.
   * @private
   */
  _renderHistory() {
    if (!this.state.history.length) {
      this.el.historyList.innerHTML = '<p class="history-empty">No questions asked yet.</p>';
      return;
    }

    this.el.historyList.innerHTML = this.state.history
      .slice()
      .reverse()
      .map((entry, i) => {
        const time = entry.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        return `
          <div class="history-item" data-index="${this.state.history.length - 1 - i}">
            <span class="hist-question">${Helpers.escapeHtml(entry.question)}</span>
            <span class="hist-time">${time}</span>
          </div>
        `;
      })
      .join("");

    this.el.historyList.querySelectorAll(".history-item").forEach(item => {
      item.addEventListener("click", () => {
        const idx = Number(item.dataset.index);
        const entry = this.state.history[idx];
        if (entry) {
          this.el.questionInput.value = entry.question;
          this.el.historyDropdown.classList.remove("show");
          this.runAnalysis();
        }
      });
    });
  }

  /**
   * Enables or disables all suggestion buttons.
   * @param {boolean} disabled
   * @private
   */
  _setSuggestionsDisabled(disabled) {
    this.el.allSuggestionBtns.forEach(btn => {
      btn.classList.toggle("disabled", disabled);
    });
  }

  /**
   * Animates metric numbers counting up from 0 to their target value.
   * @private
   */
  _animateCountUp() {
    document.querySelectorAll(".count-up").forEach(el => {
      const target = parseFloat(el.dataset.target);
      if (isNaN(target) || target <= 0) return;
      const isLarge = target > 100;
      const duration = 800;
      const steps = 40;
      const interval = duration / steps;
      let step = 0;
      const original = el.textContent;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(target * eased);
        // Format same as Intl but approximate
        el.textContent = isLarge
          ? current.toLocaleString("de-DE")
          : current.toString();
        if (step >= steps) {
          el.textContent = original; // restore exact formatted value
          clearInterval(timer);
        }
      }, interval);
    });
  }
}
