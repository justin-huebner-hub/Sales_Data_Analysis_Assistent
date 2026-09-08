// =============================================================
// ColumnMapper — Automatic column detection with confidence scoring
// =============================================================

import { Helpers } from '../utils/Helpers.js';

/**
 * Maps uploaded file columns to business fields (date, product,
 * category, quantity, unitPrice, revenue, region) using synonym
 * lists and confidence scoring. Supports both English and German
 * column names.
 */
export class ColumnMapper {

  /**
   * Synonym lists for each business field.
   * Used to match uploaded column headers to internal field names.
   * @type {Object<string, string[]>}
   */
  static COLUMN_SYNONYMS = {
    date: [
      "date", "order_date", "sales_date", "sale_date", "transaction_date", "invoice_date",
      "created_at", "period", "time", "datum", "bestelldatum", "verkaufsdatum", "rechnungsdatum",
      "order date", "sale date", "transaction date", "invoice date", "created at"
    ],
    product: [
      "product", "product_name", "product_title", "item", "item_name", "article", "sku",
      "description", "name", "model", "produkt", "produktname", "artikel", "artikelname",
      "bezeichnung", "artikelbeschreibung", "ware", "product name", "item name"
    ],
    category: [
      "category", "product_category", "cat", "segment", "department", "type",
      "kategorie", "produktkategorie", "bereich", "warengruppe", "gruppe",
      "product category", "produktgruppe", "abteilung", "sparte"
    ],
    quantity: [
      "quantity", "qty", "units", "units_sold", "amount", "volume", "sold_quantity",
      "menge", "anzahl", "stueck", "stuck", "verkaufte_einheiten",
      "stueckzahl", "stuckzahl", "absatz", "units sold", "sold quantity", "bestellmenge"
    ],
    unitPrice: [
      "unit_price", "price", "selling_price", "sales_price", "item_price", "unit_cost",
      "einzelpreis", "preis", "verkaufspreis", "stueckpreis", "stuckpreis",
      "unit price", "selling price", "netto", "nettobetrag", "vk_preis", "vk preis", "ep"
    ],
    revenue: [
      "revenue", "sales", "total_sales", "turnover", "total", "amount_total", "net_sales",
      "gross_sales", "line_total", "sales_amount", "umsatz", "erloes", "erlos", "verkauf", "gesamtpreis",
      "total sales", "net sales", "gross sales", "betrag", "nettoumsatz", "bruttoumsatz", "brutto",
      "gesamtbetrag", "summe", "gesamt"
    ],
    region: [
      "region", "market", "area", "city", "country", "location", "store", "branch",
      "gebiet", "stadt", "land", "filiale", "standort", "markt",
      "ort", "plz", "bundesland", "vertriebsgebiet"
    ]
  };

  /**
   * Scores how well a normalized column name matches a list of synonyms.
   * @param {string} normalizedColumn
   * @param {string[]} synonyms
   * @returns {number} Score between 0 and 1
   */
  static scoreColumn(normalizedColumn, synonyms) {
    const normalizedSynonyms = synonyms.map(Helpers.normalizeHeader);

    if (normalizedSynonyms.includes(normalizedColumn)) return 1;

    for (const syn of normalizedSynonyms) {
      if (
        normalizedColumn.startsWith(syn + "_") ||
        normalizedColumn.endsWith("_" + syn) ||
        normalizedColumn.includes("_" + syn + "_")
      ) return .86;
    }

    for (const syn of normalizedSynonyms) {
      if (syn.length >= 5 && normalizedColumn.includes(syn)) return .72;
    }

    // Avoid reverse partial matching such as column "price" matching synonym "total_price".
    // This prevents unit price columns from being incorrectly mapped as revenue.
    return 0;
  }

  /**
   * Builds a mapping from business fields to uploaded column names.
   * @param {string[]} columns — Raw column headers from the file
   * @returns {{ mapping: Object, details: Object }}
   */
  static buildMapping(columns) {
    const normalizedColumns = columns.map(original => ({
      original,
      normalized: Helpers.normalizeHeader(original)
    }));

    const mapping = {};
    const details = {};

    for (const [field, synonyms] of Object.entries(ColumnMapper.COLUMN_SYNONYMS)) {
      let best = { original: null, score: 0 };

      for (const col of normalizedColumns) {
        const score = ColumnMapper.scoreColumn(col.normalized, synonyms);
        if (score > best.score) best = { original: col.original, score };
      }

      mapping[field] = best.score >= .58 ? best.original : null;
      details[field] = {
        column: mapping[field],
        confidence: mapping[field] ? best.score : 0
      };
    }

    return { mapping, details };
  }

  /**
   * Returns a human-readable confidence label and CSS class.
   * @param {number} score
   * @returns {[string, string]} [label, cssClass]
   */
  static confidenceLabel(score) {
    if (score >= .95) return ["High", "good"];
    if (score >= .72) return ["Medium", "warn"];
    if (score > 0) return ["Low", "warn"];
    return ["Missing", "bad"];
  }

  /**
   * Validates that all required columns are mapped.
   * @param {Object} mapping
   * @returns {Object} Validation result with missing fields list
   */
  static validateMapping(mapping) {
    const missing = [];
    if (!mapping.product) missing.push("product / product_name / item");
    if (!mapping.quantity) missing.push("quantity / qty / units");

    const hasRevenue = Boolean(mapping.revenue);
    const canCalculateRevenue = Boolean(mapping.quantity && mapping.unitPrice);
    if (!hasRevenue && !canCalculateRevenue) {
      missing.push("revenue OR unit_price for quantity × unit_price");
    }

    return {
      valid: missing.length === 0,
      missing,
      hasRevenue,
      canCalculateRevenue,
      hasDate: Boolean(mapping.date),
      hasCategory: Boolean(mapping.category),
      hasRegion: Boolean(mapping.region)
    };
  }
}
