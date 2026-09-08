// =============================================================
// SalesAnalyzer — Deterministic sales data analysis engine
// =============================================================

import { Helpers } from '../utils/Helpers.js';
import { Formatter } from '../utils/Formatter.js';

/**
 * Performs deterministic analysis on normalized sales rows.
 * Includes aggregation, anomaly detection, Pareto calculation
 * and insight/recommendation generation.
 */
export class SalesAnalyzer {

  /**
   * Runs the full analysis on normalized rows with optional filters.
   * @param {Array} rows — Normalized sales rows
   * @param {Object} [options]
   * @param {string} [options.region] — Filter by region
   * @param {string} [options.granularity] — Time grouping: "month", "week" or "day"
   * @returns {Object} Complete analysis summary
   */
  static analyze(rows, options = {}) {
    const region = options.region || "";
    const granularity = options.granularity || "month";
    const filtered = region ? rows.filter(r => r.region === region) : rows;

    const totalRevenue = Helpers.sum(filtered, r => r.revenue);
    const totalQuantity = Helpers.sum(filtered, r => r.quantity);
    const products = Helpers.aggregateRevenue(filtered, r => r.product);
    const categories = Helpers.aggregateRevenue(filtered, r => r.category);
    const regions = Helpers.aggregateRevenue(filtered, r => r.region);

    const datedRows = filtered.filter(r => r.date);
    const revenueOverTime = Helpers.aggregateRevenue(datedRows, r => Helpers.periodKey(r.date, granularity))
      .sort((a, b) => a.name.localeCompare(b.name));

    const peakPeriod = revenueOverTime.length
      ? [...revenueOverTime].sort((a, b) => b.revenue - a.revenue)[0]
      : null;

    const anomalies = SalesAnalyzer.detectAnomalies(revenueOverTime);
    const topProducts = products.slice(0, 5);
    const bottomProducts = [...products].sort((a, b) => a.revenue - b.revenue).slice(0, 5);
    const pareto = SalesAnalyzer.calculatePareto(products, totalRevenue);

    const topCategory = categories[0] || null;
    const topProduct = topProducts[0] || null;

    return {
      totalRevenue,
      totalQuantity,
      rowCount: filtered.length,
      productCount: products.length,
      categoryCount: categories.length,
      regionCount: regions.length,
      products,
      categories,
      regions,
      revenueOverTime,
      peakPeriod,
      anomalies,
      topProducts,
      bottomProducts,
      pareto,
      topCategory,
      topProduct,
      filters: { region, granularity }
    };
  }

  /**
   * Detects unusual revenue drops in a time series using
   * threshold-based and z-score-based rules.
   * @param {Array} timeSeries
   * @returns {Array}
   */
  static detectAnomalies(timeSeries) {
    if (timeSeries.length < 3) return [];

    const changes = [];
    for (let i = 1; i < timeSeries.length; i++) {
      const prev = timeSeries[i - 1];
      const curr = timeSeries[i];
      if (prev.revenue > 0) {
        changes.push({
          index: i,
          period: curr.name,
          previousPeriod: prev.name,
          revenue: curr.revenue,
          previousRevenue: prev.revenue,
          change: (curr.revenue - prev.revenue) / prev.revenue
        });
      }
    }

    if (!changes.length) return [];

    const mean = changes.reduce((a, b) => a + b.change, 0) / changes.length;
    const variance = changes.reduce((a, b) => a + Math.pow(b.change - mean, 2), 0) / changes.length;
    const std = Math.sqrt(variance);

    return changes
      .filter(item => {
        const z = std > 0 ? (item.change - mean) / std : 0;
        return item.change <= -0.25 || z <= -1.6;
      })
      .map(item => ({
        ...item,
        dropPercent: Math.abs(item.change) * 100,
        zScore: std > 0 ? (item.change - mean) / std : 0
      }))
      .sort((a, b) => b.dropPercent - a.dropPercent);
  }

  /**
   * Calculates cumulative revenue share (Pareto analysis).
   * @param {Array} products — Sorted by revenue descending
   * @param {number} totalRevenue
   * @returns {Array}
   */
  static calculatePareto(products, totalRevenue) {
    let cumulative = 0;
    return products.map((product, index) => {
      cumulative += product.revenue;
      return {
        name: product.name,
        revenue: product.revenue,
        cumulativeShare: totalRevenue > 0 ? cumulative / totalRevenue * 100 : 0,
        rank: index + 1
      };
    });
  }

  /**
   * Generates a list of key business insights from the analysis.
   * @param {Object} summary
   * @returns {string[]}
   */
  static buildKeyInsights(summary) {
    const insights = [];

    insights.push(`Total revenue is ${Formatter.formatCurrency(summary.totalRevenue)} from ${Formatter.formatNumber(summary.totalQuantity)} sold units.`);

    if (summary.topProduct) {
      insights.push(`The strongest product is "${summary.topProduct.name}" with ${Formatter.formatCurrency(summary.topProduct.revenue)} revenue.`);
    }

    if (summary.topCategory) {
      insights.push(`The strongest category is "${summary.topCategory.name}" with ${Formatter.formatCurrency(summary.topCategory.revenue)} revenue.`);
    }

    if (summary.peakPeriod) {
      insights.push(`Revenue peaked in ${summary.peakPeriod.name} with ${Formatter.formatCurrency(summary.peakPeriod.revenue)}.`);
    } else {
      insights.push(`No usable date column is available for trend analysis.`);
    }

    if (summary.anomalies.length) {
      const a = summary.anomalies[0];
      insights.push(`The strongest anomaly is a ${Formatter.formatPercent(a.dropPercent)} drop in ${a.period} compared with ${a.previousPeriod}.`);
    } else if (summary.revenueOverTime.length >= 3) {
      insights.push(`No unusual revenue drop was detected using the current anomaly rule.`);
    }

    if (summary.pareto.length) {
      const top20Count = Math.max(1, Math.ceil(summary.pareto.length * .2));
      const top20 = summary.pareto[top20Count - 1];
      insights.push(`The top ${top20Count} product(s) generate ${Formatter.formatPercent(top20.cumulativeShare)} of revenue.`);
    }

    return insights;
  }

  /**
   * Generates prioritized action recommendations.
   * @param {Object} summary
   * @returns {Array<Object>}
   */
  static buildRecommendedActions(summary) {
    const actions = [];

    if (summary.topProduct) {
      actions.push({
        priority: "high",
        title: "Protect top revenue driver",
        reason: `Keep "${summary.topProduct.name}" available and visible because it generated ${Formatter.formatCurrency(summary.topProduct.revenue)}.`,
      });
    }

    if (summary.bottomProducts.length) {
      const bottom = summary.bottomProducts[0];
      actions.push({
        priority: "medium",
        title: "Review weak product performance",
        reason: `"${bottom.name}" is among the lowest revenue products with ${Formatter.formatCurrency(bottom.revenue)}.`,
      });
    }

    if (summary.anomalies.length) {
      const anomaly = summary.anomalies[0];
      actions.push({
        priority: "high",
        title: "Investigate revenue drop",
        reason: `${anomaly.period} shows a ${Formatter.formatPercent(anomaly.dropPercent)} drop compared with ${anomaly.previousPeriod}.`,
      });
    }

    if (summary.topCategory) {
      actions.push({
        priority: "low",
        title: "Use category strength",
        reason: `"${summary.topCategory.name}" is the strongest category with ${Formatter.formatCurrency(summary.topCategory.revenue)}.`,
      });
    }

    return actions.slice(0, 3);
  }
}
