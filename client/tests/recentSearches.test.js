import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage for Node.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { addRecent, clearRecent, getRecent } = await import('../src/utils/recentSearches.js');

test('recent searches keep the newest first, without duplicates, capped at 5', () => {
  clearRecent();
  for (const q of ['wheat', 'rice', 'Wheat', 'onion', 'potato', 'tomato', 'maize']) addRecent(q);
  assert.deepEqual(getRecent(), ['maize', 'tomato', 'potato', 'onion', 'Wheat']);
});

test('too-short terms are ignored and clearing empties the list', () => {
  clearRecent();
  addRecent('a'); addRecent('  ');
  assert.deepEqual(getRecent(), []);
  addRecent('wheat');
  assert.equal(getRecent().length, 1);
  assert.deepEqual(clearRecent(), []);
  assert.deepEqual(getRecent(), []);
});

test('corrupt stored data is treated as empty', () => {
  store.set('agrismart_recent_searches', '{not json');
  assert.deepEqual(getRecent(), []);
  store.set('agrismart_recent_searches', '{"a":1}');
  assert.deepEqual(getRecent(), []);
});
