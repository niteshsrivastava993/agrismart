import test from 'node:test';
import assert from 'node:assert/strict';
import { readingSchema } from '../routes/soil.js';

const ok = { field: 'a'.repeat(24), recordedAt: '2026-09-23', moisturePct: 34 };

test('a soil reading needs a field, date and moisture, and optional values may be null', () => {
  assert.equal(readingSchema.safeParse(ok).success, true);
  assert.equal(readingSchema.safeParse({ ...ok, ph: 6.8, temperatureC: 27 }).success, true);
  assert.equal(readingSchema.safeParse({ ...ok, ph: null, temperatureC: null }).success, true);
  assert.equal(readingSchema.safeParse({ field: ok.field }).success, false);
});

test('out-of-range moisture, pH, temperature, ids and future dates are rejected', () => {
  for (const bad of [{ moisturePct: -1 }, { moisturePct: 101 }, { moisturePct: '30' }, { ph: 15 }, { ph: -1 }, { temperatureC: 80 }, { field: 'nope' }, { recordedAt: 'not a date' }]) {
    assert.equal(readingSchema.safeParse({ ...ok, ...bad }).success, false, JSON.stringify(bad));
  }
  const future = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  assert.equal(readingSchema.safeParse({ ...ok, recordedAt: future }).success, false);
});

test('partial updates still validate the values they contain', () => {
  assert.equal(readingSchema.partial().safeParse({ moisturePct: 50 }).success, true);
  assert.equal(readingSchema.partial().safeParse({ moisturePct: 500 }).success, false);
});
