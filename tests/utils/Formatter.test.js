import test from 'node:test';
import assert from 'node:assert';
import { Formatter } from '../../js/utils/Formatter.js';

test('Formatter', async (t) => {
  await t.test('formatCurrency should format numbers to EUR correctly', () => {
    assert.match(Formatter.formatCurrency(1234.56), /1\.?235\s?€/); // e.g. "1.235 €" depending on locale engine
    assert.match(Formatter.formatCurrency(0), /0\s?€/);
    assert.match(Formatter.formatCurrency(null), /0\s?€/);
  });

  await t.test('formatNumber should format with German grouping', () => {
    assert.strictEqual(Formatter.formatNumber(1000000).replace(/\u202F/g, '.'), '1.000.000');
    assert.strictEqual(Formatter.formatNumber(0), '0');
  });

  await t.test('formatPercent should format numbers as percentages', () => {
    assert.strictEqual(Formatter.formatPercent(12.34), '12,3%');
    assert.strictEqual(Formatter.formatPercent(0), '0%');
  });

  await t.test('isoDate should return YYYY-MM-DD from Date objects', () => {
    const d = new Date(Date.UTC(2025, 5, 15)); // June 15, 2025
    assert.strictEqual(Formatter.isoDate(d), '2025-06-15');
    assert.strictEqual(Formatter.isoDate(null), '');
  });
});
