import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChange } from '../services/marketStore.js';
import { normalizeRecord } from '../services/marketService.js';

const pt = (date, modalPrice) => ({ date, modalPrice, markets: 1 });

test('computeChange reports an upward move from real points', () => {
  const c = computeChange([pt('2026-09-20', 2400), pt('2026-09-22', 2500), pt('2026-09-24', 2520)]);
  assert.equal(c.direction, 'up');
  assert.equal(c.absolute, 120);
  assert.equal(c.percent, 5);
  assert.equal(c.from, '2026-09-20');
  assert.equal(c.to, '2026-09-24');
});

test('computeChange reports downward and flat moves', () => {
  assert.equal(computeChange([pt('a', 2000), pt('b', 1900)]).direction, 'down');
  assert.equal(computeChange([pt('a', 2000), pt('b', 2000)]).direction, 'flat');
});

test('computeChange returns null instead of guessing when data is thin', () => {
  assert.equal(computeChange([]), null);
  assert.equal(computeChange([pt('a', 2000)]), null);
  assert.equal(computeChange([pt('a', 2000), pt('b', null)]), null);
});

test('computeChange skips null prices at the ends', () => {
  const c = computeChange([pt('a', null), pt('b', 1000), pt('c', 1100), pt('d', null)]);
  assert.equal(c.from, 'b');
  assert.equal(c.percent, 10);
});

test('normalizeRecord keeps the variety so snapshots of different varieties do not collide', () => {
  assert.equal(normalizeRecord({ commodity: 'Wheat', market: 'X', variety: 'Dara' }, 'now').variety, 'Dara');
  assert.equal(normalizeRecord({ commodity: 'Wheat', market: 'X' }, 'now').variety, null);
});
