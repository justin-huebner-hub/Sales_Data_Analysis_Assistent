import test from 'node:test';
import assert from 'node:assert';
import { ColumnMapper } from '../../js/analysis/ColumnMapper.js';

test('ColumnMapper', async (t) => {

  await t.test('should detect English standard column names', () => {
    const columns = ['order_date', 'product_name', 'category', 'quantity', 'unit_price', 'revenue', 'region'];
    const { mapping } = ColumnMapper.buildMapping(columns);

    assert.strictEqual(mapping.date, 'order_date');
    assert.strictEqual(mapping.product, 'product_name');
    assert.strictEqual(mapping.category, 'category');
    assert.strictEqual(mapping.quantity, 'quantity');
    assert.strictEqual(mapping.unitPrice, 'unit_price');
    assert.strictEqual(mapping.revenue, 'revenue');
    assert.strictEqual(mapping.region, 'region');
  });

  await t.test('should detect German column names', () => {
    const columns = ['Datum', 'Artikelname', 'Kategorie', 'Menge', 'Einzelpreis', 'Umsatz', 'Stadt'];
    const { mapping } = ColumnMapper.buildMapping(columns);

    assert.strictEqual(mapping.date, 'Datum');
    assert.strictEqual(mapping.product, 'Artikelname');
    assert.strictEqual(mapping.category, 'Kategorie');
    assert.strictEqual(mapping.quantity, 'Menge');
    assert.strictEqual(mapping.unitPrice, 'Einzelpreis');
    assert.strictEqual(mapping.revenue, 'Umsatz');
    assert.strictEqual(mapping.region, 'Stadt');
  });

  await t.test('should assign high confidence to exact synonym matches', () => {
    // scoreColumn returns 1.0 for exact match; details.confidence stores the raw score (0-1)
    const columns = ['date', 'product', 'category', 'quantity', 'unit_price', 'revenue', 'region'];
    const { details } = ColumnMapper.buildMapping(columns);

    assert.ok(details.date.confidence >= 0.95, `Expected date confidence >= 0.95, got ${details.date.confidence}`);
    assert.ok(details.product.confidence >= 0.95, `Expected product confidence >= 0.95, got ${details.product.confidence}`);
    assert.ok(details.revenue.confidence >= 0.95, `Expected revenue confidence >= 0.95, got ${details.revenue.confidence}`);
  });

  await t.test('confidenceLabel should return correct labels for thresholds', () => {
    // Scores are 0-1; labels are High/Medium/Low/Missing
    const [labelHigh, clsHigh] = ColumnMapper.confidenceLabel(1.0);
    assert.strictEqual(labelHigh, 'High');
    assert.strictEqual(clsHigh, 'good');

    const [labelMid, clsMid] = ColumnMapper.confidenceLabel(0.72);
    assert.strictEqual(labelMid, 'Medium');
    assert.strictEqual(clsMid, 'warn');

    const [labelLow, clsLow] = ColumnMapper.confidenceLabel(0);
    assert.strictEqual(labelLow, 'Missing');
    assert.strictEqual(clsLow, 'bad');
  });

  await t.test('validateMapping should pass when product, quantity and revenue are all mapped', () => {
    // product, quantity AND revenue (or unit_price) are all required
    const mapping = { product: 'Produkt', quantity: 'Menge', revenue: 'Umsatz' };
    const result = ColumnMapper.validateMapping(mapping);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.missing, []);
  });

  await t.test('validateMapping should fail when required fields are missing', () => {
    const result = ColumnMapper.validateMapping({});
    assert.strictEqual(result.valid, false);
    // Missing: product, quantity, and revenue
    assert.ok(result.missing.length >= 2, `Expected at least 2 missing fields, got ${result.missing.length}`);
    const missingText = result.missing.join(' ');
    assert.ok(missingText.includes('product'), 'Missing list should mention product');
  });
});
