// Run with `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedProduct } from './blocklist.js';

test('blocks treating people as products', () => {
  for (const name of ['kevin the slave', 'A SLAVE', '2 slaves', 'slavery starter kit', 'trafficked workers', 'buy a person', 'human being']) {
    assert.equal(isBlockedProduct(name), true, name);
  }
});

test('allows normal products, including harmless lookalikes', () => {
  for (const name of ['AirPods Pro', 'Nike Dunk Low Panda', 'Camera flash master/slave trigger', 'Master-slave hard drive cable', 'Personal trainer session', 'Slavic history book', 'Twelve Years a Slave (Blu-ray)', '']) {
    assert.equal(isBlockedProduct(name), false, name);
  }
});
