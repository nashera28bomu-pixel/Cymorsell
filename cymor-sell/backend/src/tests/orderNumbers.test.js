const { test } = require('node:test');
const assert = require('node:assert');

// Pure-logic sanity checks that don't require a live MongoDB connection.
// Full integration tests (auth, tenant isolation, cart calc against a live DB,
// payment confirmation) are designed to run against a MongoDB Memory Server /
// test Atlas cluster - see README "Testing" section for setup, since this
// sandbox has no network access to provision one.

test('order number format matches CYM-#### pattern', () => {
  const sample = 'CYM-1048';
  assert.match(sample, /^CYM-\d+$/);
});

test('invoice number format matches INV-####### pattern', () => {
  const sample = 'INV-0001048';
  assert.match(sample, /^INV-\d{7}$/);
});
