import test from 'node:test';
import assert from 'node:assert';
import { AppState } from '../../js/models/AppState.js';

test('AppState', async (t) => {
  await t.test('should initialize with default values', () => {
    const state = new AppState();
    assert.strictEqual(state.fileName, "");
    assert.deepStrictEqual(state.rawRows, []);
    assert.deepStrictEqual(state.normalizedRows, []);
    assert.deepStrictEqual(state.history, []);
  });

  await t.test('hasData should return true if normalizedRows exist', () => {
    const state = new AppState();
    assert.strictEqual(state.hasData(), false);
    
    state.normalizedRows.push({ product: 'A', revenue: 10 });
    assert.strictEqual(state.hasData(), true);
  });

  await t.test('reset should clear all state except history', () => {
    const state = new AppState();
    state.fileName = "test.csv";
    state.rawRows = [1, 2, 3];
    state.history = ["Q1", "Q2"];
    
    state.reset();
    
    assert.strictEqual(state.fileName, "");
    assert.deepStrictEqual(state.rawRows, []);
    assert.deepStrictEqual(state.history, ["Q1", "Q2"]); // History must survive reset
  });
});
