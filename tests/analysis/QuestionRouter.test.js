import test from 'node:test';
import assert from 'node:assert';
import { QuestionRouter } from '../../js/analysis/QuestionRouter.js';

// A minimal but realistic summary object for routing tests
const mockSummary = {
  rowCount: 500,
  totalRevenue: 85000,
  totalQuantity: 3000,
  productCount: 8,
  categoryCount: 3,
  regionCount: 2,
  topProduct: { name: 'Espresso Beans', revenue: 25000 },
  bottomProducts: [{ name: 'Reusable Straw', revenue: 800 }],
  topCategory: { name: 'Coffee', revenue: 50000 },
  peakPeriod: { name: '2025-03', revenue: 18000 },
  anomalies: [{ period: '2025-06', previousPeriod: '2025-05', dropPercent: 38, zScore: -2.1 }],
  revenueOverTime: [{ name: '2025-01', revenue: 10000 }, { name: '2025-02', revenue: 14000 }],
  products: [{ name: 'A', revenue: 10000, quantity: 100 }],
  categories: [{ name: 'Coffee', revenue: 50000, quantity: 2000 }],
  filters: { region: '', granularity: 'month' },
  pareto: [],
  regions: [],
  topProducts: [{ name: 'Espresso Beans', revenue: 25000, quantity: 500 }],
};

test('QuestionRouter', async (t) => {

  await t.test('classifyQuestion: should identify top products intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('Which products generated the highest revenue?'), 'top_products');
    assert.strictEqual(QuestionRouter.classifyQuestion('What are the best selling products?'), 'top_products');
  });

  await t.test('classifyQuestion: should identify bottom products intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('Which products should the business review?'), 'bottom_products');
    assert.strictEqual(QuestionRouter.classifyQuestion('What are the weakest products?'), 'bottom_products');
  });

  await t.test('classifyQuestion: should identify category intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('Which category performs best?'), 'category');
    assert.strictEqual(QuestionRouter.classifyQuestion('Show me revenue by segment'), 'category');
  });

  await t.test('classifyQuestion: should identify peak/time intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('When was revenue at its peak?'), 'peak');
    assert.strictEqual(QuestionRouter.classifyQuestion('Which month had the highest sales?'), 'peak');
  });

  await t.test('classifyQuestion: should identify anomaly intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('Are there any unusual drops in sales?'), 'anomaly');
    assert.strictEqual(QuestionRouter.classifyQuestion('Did revenue decline anywhere?'), 'anomaly');
  });

  await t.test('classifyQuestion: should identify trend/overview intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('What are the most important trends?'), 'trend');
    assert.strictEqual(QuestionRouter.classifyQuestion('Give me an overview of the data'), 'trend');
  });

  await t.test('classifyQuestion: should identify region intent', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('Which region performs best?'), 'region');
  });

  await t.test('classifyQuestion: should fall back to overview for unknown questions', () => {
    assert.strictEqual(QuestionRouter.classifyQuestion('random unknown question xyz'), 'overview');
  });

  await t.test('answerQuestion: should include correct product name in top_products response', () => {
    const response = QuestionRouter.answerQuestion('Which products generated the highest revenue?', mockSummary);
    assert.ok(response.directAnswer.includes('Espresso Beans'), 'Direct answer should mention top product');
    assert.strictEqual(response.intent, 'top_products');
    assert.ok(Array.isArray(response.keyInsights));
    assert.ok(response.keyInsights.length > 0);
  });

  await t.test('answerQuestion: response should always have required fields', () => {
    const response = QuestionRouter.answerQuestion('some question', mockSummary);
    assert.ok(typeof response.title === 'string');
    assert.ok(typeof response.directAnswer === 'string');
    assert.ok(typeof response.businessExplanation === 'string');
    assert.ok(typeof response.recommendedAction === 'string');
    assert.ok(typeof response.caveat === 'string');
    assert.ok(Array.isArray(response.keyInsights));
    assert.ok(Array.isArray(response.recommendedActions));
    assert.ok(typeof response.verification === 'object');
  });

  await t.test('answerQuestion: verification should check number claims in the response', () => {
    const response = QuestionRouter.answerQuestion('Which products generated the highest revenue?', mockSummary);
    // ClaimVerifier.verify() returns { valid: boolean, suspiciousNumbers: [] }
    assert.ok(typeof response.verification.valid === 'boolean',
      `Expected verification.valid to be boolean, got: ${JSON.stringify(response.verification)}`);
  });
});
