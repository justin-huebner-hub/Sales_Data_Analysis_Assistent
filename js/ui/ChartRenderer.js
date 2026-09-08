// =============================================================
// ChartRenderer — Chart.js diagram management
// =============================================================

import { Formatter } from '../utils/Formatter.js';

/**
 * Creates and manages Chart.js chart instances for the
 * analysis results view.
 */
export class ChartRenderer {

  constructor() {
    /** @type {Object<string, Chart>} Active chart instances */
    this.charts = {};
  }

  /**
   * Destroys all active chart instances to prevent memory leaks.
   */
  destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === "function") chart.destroy();
    });
    this.charts = {};
  }

  /**
   * Renders all four analysis charts.
   * @param {Object} summary — Analysis summary from SalesAnalyzer
   */
  renderCharts(summary) {
    if (typeof Chart === "undefined") return;
    this.destroyCharts();

    const topProducts = summary.topProducts;
    const categories = summary.categories.slice(0, 8);
    const trend = summary.revenueOverTime;
    const pareto = summary.pareto.slice(0, 12);

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === "Cumulative share") return Formatter.formatPercent(ctx.raw);
              return Formatter.formatCurrency(ctx.raw);
            }
          }
        }
      }
    };

    if (topProducts.length)    this._renderTopProductsChart(topProducts, commonOptions);
    if (categories.length)     this._renderCategoryChart(categories, commonOptions);
    if (trend.length >= 2)     this._renderTrendChart(trend, summary, commonOptions);
    if (pareto.length >= 2)    this._renderParetoChart(pareto);
  }

  /**
   * Switches an existing chart to a new type by destroying and recreating it.
   * Chart.js v4 does not support mutating chart.config.type reliably.
   * @param {string} key — "top", "category" or "trend"
   * @param {string} newType — Chart.js type string
   * @param {Object} summary — Full analysis summary for rebuilding data
   */
  switchChartType(key, newType, summary) {
    if (!summary) return;
    const chart = this.charts[key];
    if (chart && typeof chart.destroy === "function") chart.destroy();
    delete this.charts[key];

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === "Cumulative share") return Formatter.formatPercent(ctx.raw);
              return Formatter.formatCurrency(ctx.raw);
            }
          }
        }
      }
    };

    if (key === "top") {
      const topProducts = summary.topProducts;
      if (!topProducts.length) return;
      const isHorizontal = newType === "bar";
      this.charts.top = new Chart(document.getElementById("topProductsChart"), {
        type: newType,
        data: {
          labels: topProducts.map(x => x.name),
          datasets: [{ label: "Revenue", data: topProducts.map(x => x.revenue), borderWidth: 2, tension: 0.35 }]
        },
        options: {
          ...commonOptions,
          ...(isHorizontal ? { indexAxis: "y" } : {}),
          scales: {
            [isHorizontal ? "x" : "y"]: { ticks: { callback: value => Formatter.formatCurrency(value) } }
          }
        }
      });
    } else if (key === "category") {
      const categories = summary.categories.slice(0, 8);
      if (!categories.length) return;
      this.charts.category = new Chart(document.getElementById("categoryChart"), {
        type: newType,
        data: {
          labels: categories.map(x => x.name),
          datasets: [{ label: "Revenue", data: categories.map(x => x.revenue), borderWidth: 1, tension: 0.35 }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: { display: newType === "doughnut", position: "bottom" }
          },
          ...(newType !== "doughnut" ? { scales: { y: { ticks: { callback: v => Formatter.formatCurrency(v) } } } } : {})
        }
      });
    } else if (key === "trend") {
      this._renderTrendChart(summary.revenueOverTime, summary, commonOptions);
    }
  }

  /**
   * Renders the horizontal bar chart for top products.
   * @private
   */
  _renderTopProductsChart(topProducts, commonOptions) {
    this.charts.top = new Chart(document.getElementById("topProductsChart"), {
      type: "bar",
      data: {
        labels: topProducts.map(x => x.name),
        datasets: [{ label: "Revenue", data: topProducts.map(x => x.revenue), borderWidth: 1 }]
      },
      options: {
        ...commonOptions,
        indexAxis: "y",
        scales: { x: { ticks: { callback: value => Formatter.formatCurrency(value) } } }
      }
    });
  }

  /**
   * Renders the doughnut chart for category distribution.
   * @private
   */
  _renderCategoryChart(categories, commonOptions) {
    this.charts.category = new Chart(document.getElementById("categoryChart"), {
      type: "doughnut",
      data: {
        labels: categories.map(x => x.name),
        datasets: [{ label: "Revenue", data: categories.map(x => x.revenue), borderWidth: 1 }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          legend: { display: true, position: "bottom" }
        }
      }
    });
  }

  /**
   * Renders the line chart for revenue trend with peak/anomaly markers.
   * @private
   */
  _renderTrendChart(trend, summary, commonOptions) {
    const peakName = summary.peakPeriod?.name;
    const anomalyPeriods = new Set(summary.anomalies.map(a => a.period));

    this.charts.trend = new Chart(document.getElementById("trendChart"), {
      type: "line",
      data: {
        labels: trend.map(x => x.name),
        datasets: [
          {
            label: "Revenue",
            data: trend.map(x => x.revenue),
            tension: .32,
            borderWidth: 3,
            pointRadius: trend.map(x => x.name === peakName || anomalyPeriods.has(x.name) ? 7 : 4),
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: { y: { ticks: { callback: value => Formatter.formatCurrency(value) } } },
        plugins: {
          ...commonOptions.plugins,
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: ctx => {
                const label = ctx.label;
                const tags = [];
                if (label === peakName) tags.push("Peak");
                if (anomalyPeriods.has(label)) tags.push("Anomaly");
                return `${Formatter.formatCurrency(ctx.raw)}${tags.length ? " \u00b7 " + tags.join(", ") : ""}`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Renders the combined bar/line Pareto chart.
   * @private
   */
  _renderParetoChart(pareto) {
    this.charts.pareto = new Chart(document.getElementById("paretoChart"), {
      data: {
        labels: pareto.map(x => x.name),
        datasets: [
          {
            type: "bar",
            label: "Revenue",
            data: pareto.map(x => x.revenue),
            yAxisID: "y",
            borderWidth: 1
          },
          {
            type: "line",
            label: "Cumulative share",
            data: pareto.map(x => x.cumulativeShare),
            yAxisID: "y1",
            borderWidth: 3,
            tension: .25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
          y: { position: "left", ticks: { callback: value => Formatter.formatCurrency(value) } },
          y1: {
            position: "right",
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: { callback: value => value + "%" }
          }
        }
      }
    });
  }
}
