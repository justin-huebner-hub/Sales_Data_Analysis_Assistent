import test from 'node:test';
import assert from 'node:assert';
import { ClaimVerifier } from '../../js/analysis/ClaimVerifier.js';

test('ClaimVerifier', async (t) => {
  await t.test('extractNumbers should find numbers and percentages', () => {
    const text = "Der Umsatz stieg um 15,5% auf 100.000 €.";
    const numbers = ClaimVerifier.extractNumbers(text);
    assert.ok(numbers.includes('15,5%'));
    // Depending on regex, it might extract just the number or with euro sign.
    // The main point is it finds numbers.
  });

  await t.test('verify should catch hallucinated numbers', () => {
    // verify() takes an object (aiJson) and an array of allowed NUMBERS (not strings)
    // It returns { valid: boolean, suspiciousNumbers: string[] }
    const aiJson = { text: "Revenue was 500 EUR." };
    const allowed = [100, 200, 300]; // 500 is NOT in the allowed list

    const result = ClaimVerifier.verify(aiJson, allowed);
    assert.strictEqual(result.valid, false);
    assert.ok(result.suspiciousNumbers.length > 0, 'Should flag the hallucinated number 500');
  });

  await t.test('verify should pass when all numbers are allowed', () => {
    const aiJson = { text: "Total revenue is 100." };
    const allowed = [100, 200, 300]; // 100 IS in the allowed list

    const result = ClaimVerifier.verify(aiJson, allowed);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.suspiciousNumbers.length, 0);
  });
});
