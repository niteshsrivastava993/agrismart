import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (n) => JSON.parse(readFileSync(new URL(`../src/locales/${n}.json`, import.meta.url), 'utf8'));
const en = load('en'), hi = load('hi');
const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

test('English and Hindi define exactly the same keys', () => {
  assert.deepEqual(Object.keys(hi).sort(), Object.keys(en).sort());
});

test('no translation is empty', () => {
  for (const d of [en, hi]) for (const [k, v] of Object.entries(d)) assert.ok(String(v).trim(), k);
});

test('Hindi strings keep the same {placeholders} as English', () => {
  for (const k of Object.keys(en)) assert.equal(vars(hi[k]), vars(en[k]), k);
});
