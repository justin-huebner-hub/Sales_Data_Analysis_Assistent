import test from 'node:test';
import assert from 'node:assert';
import { Parser } from '../../js/utils/Parser.js';

test('Parser.basicCsvParse', async (t) => {

  await t.test('should parse comma-delimited CSV correctly', () => {
    const csv = `name,revenue,qty\nEspresso,1000,100\nTea,500,80`;
    const result = Parser.basicCsvParse(csv);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'Espresso');
    assert.strictEqual(result[0].revenue, '1000');
    assert.strictEqual(result[1].name, 'Tea');
  });

  await t.test('should auto-detect semicolon delimiter', () => {
    const csv = `name;revenue;qty\nEspresso;1000;100\nTea;500;80`;
    const result = Parser.basicCsvParse(csv);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'Espresso');
    assert.strictEqual(result[0].revenue, '1000');
  });

  await t.test('should handle quoted fields containing commas', () => {
    const csv = `name,description\n"Coffee, dark","A strong, dark roast"`;
    const result = Parser.basicCsvParse(csv);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Coffee, dark');
  });

  await t.test('should strip whitespace from headers', () => {
    const csv = ` name , revenue \nEspresso,1000`;
    const result = Parser.basicCsvParse(csv);
    assert.ok('name' in result[0], 'Header should be trimmed');
    assert.ok('revenue' in result[0], 'Header should be trimmed');
  });

  await t.test('should return empty array for file with fewer than 2 lines', () => {
    assert.deepStrictEqual(Parser.basicCsvParse('only one line'), []);
    assert.deepStrictEqual(Parser.basicCsvParse(''), []);
  });

  await t.test('should handle Windows line endings (CRLF)', () => {
    const csv = "name,revenue\r\nEspresso,1000\r\nTea,500";
    const result = Parser.basicCsvParse(csv);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'Espresso');
  });

  await t.test('parseFile should reject unsupported file types', async () => {
    const fakeFile = { name: 'report.pdf', text: async () => '' };
    await assert.rejects(
      () => Parser.parseFile(fakeFile),
      /Unsupported file type/
    );
  });
});
