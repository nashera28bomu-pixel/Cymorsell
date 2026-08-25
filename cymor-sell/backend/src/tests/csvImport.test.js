const { test } = require('node:test');
const assert = require('node:assert');
const { parseAndValidateCsv } = require('../services/csvImportService');

test('valid CSV rows parse correctly', () => {
  const csv = 'name,price,stock\nRunFlex Pro,3200,8\nTrailBlazer X,4500,5\n';
  const { validRows, errors } = parseAndValidateCsv(Buffer.from(csv));
  assert.strictEqual(validRows.length, 2);
  assert.strictEqual(errors.length, 0);
  assert.strictEqual(validRows[0].price, 3200);
});

test('rows missing required fields are rejected with row-level errors', () => {
  const csv = 'name,price\n,3200\nShoe,not-a-number\nGoodShoe,1000\n';
  const { validRows, errors } = parseAndValidateCsv(Buffer.from(csv));
  assert.strictEqual(validRows.length, 1);
  assert.strictEqual(errors.length, 2);
  assert.ok(errors[0].errors.some((e) => e.includes('name')));
  assert.ok(errors[1].errors.some((e) => e.includes('price')));
});

test('malformed data is never silently imported', () => {
  const csv = 'name,price,stock\nBadStock,1000,not-a-number\n';
  const { validRows, errors } = parseAndValidateCsv(Buffer.from(csv));
  assert.strictEqual(validRows.length, 0);
  assert.strictEqual(errors.length, 1);
});
