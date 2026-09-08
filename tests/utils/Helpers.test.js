import test from 'node:test';
import assert from 'node:assert';
import { Helpers } from '../../js/utils/Helpers.js';

test('Helpers', async (t) => {
  await t.test('escapeHtml should replace malicious characters', () => {
    assert.strictEqual(Helpers.escapeHtml('<script>alert("1")</script>'), '&lt;script&gt;alert(&quot;1&quot;)&lt;/script&gt;');
  });

  await t.test('normalizeHeader should lowercase and remove diacritics', () => {
    assert.strictEqual(Helpers.normalizeHeader(' Brutto-Umsatz (€) '), 'brutto_umsatz');
    assert.strictEqual(Helpers.normalizeHeader('Menge / Stück'), 'menge_stueck');
    assert.strictEqual(Helpers.normalizeHeader('Äpfel & Birnen'), 'aepfel_birnen');
  });

  await t.test('toNumber should parse various number formats correctly', () => {
    assert.strictEqual(Helpers.toNumber(10), 10);
    assert.strictEqual(Helpers.toNumber('1.234,56 €'), 1234.56);
    assert.strictEqual(Helpers.toNumber('1,234.56 $'), 1234.56);
    assert.strictEqual(Helpers.toNumber('1000'), 1000);
    assert.strictEqual(Helpers.toNumber('invalid'), null);
    assert.strictEqual(Helpers.toNumber(null), null);
  });

  await t.test('parseDate should handle ISO, European, and Excel formats', () => {
    // European
    const d1 = Helpers.parseDate('15.06.2025');
    assert.strictEqual(d1.getFullYear(), 2025);
    assert.strictEqual(d1.getMonth(), 5); // 0-indexed
    assert.strictEqual(d1.getDate(), 15);

    // ISO
    const d2 = Helpers.parseDate('2025-06-15');
    assert.strictEqual(d2.getFullYear(), 2025);

    // Excel Serial Date (e.g. 45000)
    const d3 = Helpers.parseDate(45000);
    assert.ok(d3 instanceof Date);
    
    assert.strictEqual(Helpers.parseDate('invalid'), null);
  });

  await t.test('sum should aggregate numeric properties', () => {
    const rows = [{ val: 10 }, { val: 20 }, { val: null }, {}];
    assert.strictEqual(Helpers.sum(rows, r => r.val), 30);
  });

  await t.test('periodKey should generate keys for grouping', () => {
    const d = new Date(Date.UTC(2025, 0, 15)); // Jan 15, 2025
    assert.strictEqual(Helpers.periodKey(d, 'month'), '2025-01');
    assert.strictEqual(Helpers.periodKey(d, 'day'), '2025-01-15');
    assert.strictEqual(Helpers.periodKey(d, 'week'), '2025-W03');
  });
});
