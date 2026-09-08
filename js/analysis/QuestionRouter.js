// =============================================================
// QuestionRouter — Question classification and answer generation
// =============================================================

import { Formatter } from '../utils/Formatter.js';
import { ClaimVerifier } from './ClaimVerifier.js';
import { SalesAnalyzer } from './SalesAnalyzer.js';

/**
 * Classifies user questions by intent and generates structured
 * business answers based on the deterministic analysis results.
 */
export class QuestionRouter {

  /**
   * Classifies a question string into a business intent.
   * @param {string} question
   * @returns {string} Intent identifier
   */
  static classifyQuestion(question) {
    const q = question.toLowerCase();

    if (/bottom|poor|weak|underperform|review|bad|low|perform poorly|schwach|pr\u00fcfen|review/.test(q)) return "bottom_products";
    if (/category|categories|segment|kategorie/.test(q)) return "category";
    if (/peak|highest period|best period|when|period|month|week|spitze|h\u00f6chsten|zeitraum/.test(q)) return "peak";
    if (/drop|anomal|unusual|decline|fall|decrease|einbruch|auff\u00e4llig/.test(q)) return "anomaly";
    if (/region|country|market|location|standort|gebiet/.test(q)) return "region";
    if (/trend|summary|insight|important|overview|entwicklung|wichtigsten/.test(q)) return "trend";
    if (/top|best|highest|product|products|generated|produkt|umsatzst\u00e4rk/.test(q)) return "top_products";

    return "overview";
  }

  /**
   * Generates a structured business answer for a given question
   * and analysis summary.
   * @param {string} question
   * @param {Object} summary — Analysis summary from SalesAnalyzer
   * @returns {Object} Structured response with title, answer, insights, etc.
   */
  static answerQuestion(question, summary) {
    const intent = QuestionRouter.classifyQuestion(question);
    let title = "Sales overview";
    let directAnswer = `The analyzed dataset contains ${Formatter.formatNumber(summary.rowCount)} usable sales rows with total revenue of ${Formatter.formatCurrency(summary.totalRevenue)}.`;
    let businessExplanation = "This gives a clear high-level view of the uploaded sales performance.";
    let recommendedAction = "Use the product, category and trend cards to decide where to focus next.";
    let caveat = "The result is based only on the uploaded dataset and detected columns.";

    if (intent === "top_products" && summary.topProduct) {
      title = "Top products by revenue";
      directAnswer = `"${summary.topProduct.name}" generated the highest revenue with ${Formatter.formatCurrency(summary.topProduct.revenue)}.`;
      businessExplanation = `The top 5 product chart shows which products drive the most sales value. These products are commercially important because they contribute most to revenue.`;
      recommendedAction = `Protect stock availability and visibility for "${summary.topProduct.name}".`;
    }

    if (intent === "bottom_products" && summary.bottomProducts.length) {
      const bottom = summary.bottomProducts[0];
      title = "Products to review";
      directAnswer = `"${bottom.name}" generated the lowest revenue among detected products with ${Formatter.formatCurrency(bottom.revenue)}.`;
      businessExplanation = `Low revenue products can indicate weak demand, low visibility, pricing issues or limited stock. They should be reviewed before removing or replacing them.`;
      recommendedAction = `Review "${bottom.name}" and compare price, placement, stock and promotion history.`;
    }

    if (intent === "category") {
      title = "Category performance";
      if (summary.topCategory) {
        directAnswer = `"${summary.topCategory.name}" is the best-performing category with ${Formatter.formatCurrency(summary.topCategory.revenue)}.`;
        businessExplanation = `Category performance helps identify which business area contributes most to total revenue.`;
        recommendedAction = `Use the strongest category as a focus area for campaigns or stock planning.`;
      } else {
        directAnswer = "No category column was detected, so category performance cannot be calculated.";
        businessExplanation = "The uploaded dataset needs a category or product_category column for this analysis.";
        recommendedAction = "Add a category column to future sales exports.";
      }
    }

    if (intent === "peak") {
      title = "Highest revenue period";
      if (summary.peakPeriod) {
        directAnswer = `Revenue was highest in ${summary.peakPeriod.name}, reaching ${Formatter.formatCurrency(summary.peakPeriod.revenue)}.`;
        businessExplanation = `Peak periods can point to seasonal demand, successful campaigns or operational strengths.`;
        recommendedAction = `Compare ${summary.peakPeriod.name} with weaker periods to understand what changed.`;
      } else {
        directAnswer = "No usable date column was detected, so the highest revenue period cannot be calculated.";
        businessExplanation = "Trend analysis requires a valid date, order_date or sales_date column.";
        recommendedAction = "Add a valid date column to enable time-based analysis.";
      }
    }

    if (intent === "anomaly") {
      title = "Revenue drops and anomalies";
      if (!summary.revenueOverTime.length) {
        directAnswer = "No usable date column was detected, so anomalies over time cannot be calculated.";
        businessExplanation = "Anomaly detection needs revenue grouped by time period.";
        recommendedAction = "Add a valid date column to detect unusual revenue changes.";
      } else if (!summary.anomalies.length) {
        directAnswer = "No unusual revenue drop was detected using the current anomaly rule.";
        businessExplanation = "The time series does not show a major negative deviation or period-over-period drop above the threshold.";
        recommendedAction = "Continue monitoring future periods for sudden changes.";
      } else {
        const a = summary.anomalies[0];
        directAnswer = `An unusual drop was detected in ${a.period}: revenue fell by ${Formatter.formatPercent(a.dropPercent)} compared with ${a.previousPeriod}.`;
        businessExplanation = `This could indicate lower demand, stock problems, campaign changes, pricing changes or a data quality issue.`;
        recommendedAction = `Investigate sales conditions around ${a.period}.`;
      }
    }

    if (intent === "region") {
      title = "Regional performance";
      if (summary.regions.length) {
        const topRegion = summary.regions[0];
        directAnswer = `"${topRegion.name}" is the strongest region with ${Formatter.formatCurrency(topRegion.revenue)}.`;
        businessExplanation = `Regional comparison helps identify where sales are concentrated and where performance may need support.`;
        recommendedAction = `Compare top and bottom regions before changing sales or marketing priorities.`;
      } else {
        directAnswer = "No region column was detected, so regional performance cannot be calculated.";
        businessExplanation = "The uploaded dataset needs a region, market, country or location column for this analysis.";
        recommendedAction = "Add a region column to future sales exports.";
      }
    }

    if (intent === "trend") {
      title = "Most important trends";
      if (summary.revenueOverTime.length >= 2) {
        const first = summary.revenueOverTime[0];
        const last = summary.revenueOverTime[summary.revenueOverTime.length - 1];
        const change = first.revenue > 0 ? (last.revenue - first.revenue) / first.revenue * 100 : null;
        directAnswer = change === null
          ? `The trend can be shown, but percentage change cannot be calculated because ${first.name} has zero revenue.`
          : `From ${first.name} to ${last.name}, revenue changed by ${Formatter.formatPercent(change)}.`;
        businessExplanation = `Trend analysis shows whether sales momentum is improving, weakening or stable over time.`;
        recommendedAction = summary.anomalies.length
          ? `Investigate the detected anomaly period before making strategic decisions.`
          : `Use peak and low periods to plan stock, campaigns and staffing.`;
      } else {
        directAnswer = "There is not enough usable date information for reliable trend analysis.";
        businessExplanation = "At least two valid time periods are needed for trend comparison.";
        recommendedAction = "Add a valid date column and more periods of sales data.";
      }
    }

    const aiJson = {
      directAnswer,
      businessExplanation,
      recommendedAction,
      caveat
    };

    const verification = ClaimVerifier.verify(aiJson, ClaimVerifier.collectAllowedNumbers(summary));

    if (!verification.valid) {
      caveat += " Numeric claim verification detected unsupported numbers, so the deterministic fallback is shown.";
    }

    return {
      intent,
      title,
      ...aiJson,
      caveat,
      keyInsights: SalesAnalyzer.buildKeyInsights(summary),
      recommendedActions: SalesAnalyzer.buildRecommendedActions(summary),
      verification
    };
  }
}
