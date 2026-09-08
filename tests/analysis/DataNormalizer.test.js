import test from 'node:test';
import assert from 'node:assert';
import { DataNormalizer } from '../../js/analysis/DataNormalizer.js';

test('DataNormalizer', async (t) => {
  const mapping = {
    product: 'Artikel',
    category: 'Kategorie',
    region: 'Ort',
    quantity: 'Menge',
    unitPrice: 'Preis',
    date: 'Datum'
  };

  await t.test('should normalize valid rows correctly', () => {
    const rawRows = [
      { Artikel: 'Kaffee', Kategorie: 'Getränke', Ort: 'Hamburg', Menge: '10', Preis: '5,50', Datum: '01.01.2025' }
    ];

    const result = DataNormalizer.normalizeRows(rawRows, mapping);
    
    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.rows[0].product, 'Kaffee');
    assert.strictEqual(result.rows[0].category, 'Getränke');
    assert.strictEqual(result.rows[0].region, 'Hamburg');
    assert.strictEqual(result.rows[0].quantity, 10);
    assert.strictEqual(result.rows[0].unitPrice, 5.5);
    assert.strictEqual(result.rows[0].revenue, 55); // 10 * 5.5
    assert.ok(result.rows[0].date instanceof Date);
    
    assert.strictEqual(result.issues.skippedRows, 0);
  });

  await t.test('should skip invalid rows and count issues', () => {
    const rawRows = [
      { Artikel: '', Menge: '10', Preis: '5' }, // missing product
      { Artikel: 'Tee', Menge: '-5', Preis: '5' }, // invalid quantity
      { Artikel: 'Brot', Menge: '1', Preis: 'invalid' }, // invalid revenue calculation
    ];

    const result = DataNormalizer.normalizeRows(rawRows, mapping);
    
    assert.strictEqual(result.rows.length, 0);
    assert.strictEqual(result.issues.skippedRows, 3);
    assert.strictEqual(result.issues.missingProduct, 1);
    assert.strictEqual(result.issues.invalidQuantity, 1);
    assert.strictEqual(result.issues.invalidRevenue, 2); // The second row also has invalid revenue due to quantity * price < 0
  });

  await t.test('should count exact duplicate rows', () => {
    const rawRows = [
      { Artikel: 'Kaffee', Menge: '10', Preis: '5' },
      { Artikel: 'Kaffee', Menge: '10', Preis: '5' }
    ];

    const result = DataNormalizer.normalizeRows(rawRows, mapping);
    assert.strictEqual(result.issues.duplicateRows, 1);
  });
});
