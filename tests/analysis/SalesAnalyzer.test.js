import test from 'node:test';
import assert from 'node:assert';
import { SalesAnalyzer } from '../../js/analysis/SalesAnalyzer.js';

test('SalesAnalyzer', async (t) => {
  const mockRows = [
    { product: 'A', category: 'Cat1', region: 'R1', quantity: 10, revenue: 100, date: new Date('2025-01-01') },
    { product: 'B', category: 'Cat1', region: 'R1', quantity: 20, revenue: 200, date: new Date('2025-01-02') },
    { product: 'A', category: 'Cat1', region: 'R2', quantity: 5, revenue: 50, date: new Date('2025-02-01') },
    { product: 'C', category: 'Cat2', region: 'R2', quantity: 50, revenue: 500, date: new Date('2025-02-02') }
  ];

  await t.test('should compute total metrics correctly', () => {
    const summary = SalesAnalyzer.analyze(mockRows);
    assert.strictEqual(summary.totalRevenue, 850);
    assert.strictEqual(summary.totalQuantity, 85);
    assert.strictEqual(summary.productCount, 3);
    assert.strictEqual(summary.categoryCount, 2);
  });

  await t.test('should aggregate products and identify top/bottom', () => {
    const summary = SalesAnalyzer.analyze(mockRows);
    assert.strictEqual(summary.topProduct.name, 'C');
    assert.strictEqual(summary.topProduct.revenue, 500);
    
    assert.strictEqual(summary.bottomProducts[0].name, 'A');
    assert.strictEqual(summary.bottomProducts[0].revenue, 150); // 100 + 50
  });

  await t.test('should filter by region if provided', () => {
    const summary = SalesAnalyzer.analyze(mockRows, { region: 'R1' });
    assert.strictEqual(summary.totalRevenue, 300); // Only R1: A (100) + B (200)
    assert.strictEqual(summary.productCount, 2);
  });
});
