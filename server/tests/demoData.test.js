import test from 'node:test';
import assert from 'node:assert/strict';
import { readingSchema } from '../routes/soil.js';
import { demoDiary, demoFields, demoHealth, demoListings, demoSoil } from '../utils/demoData.js';
import { createSchema } from '../routes/listings.js';
import { entrySchema } from '../routes/cropHealth.js';
import { buildHarvestReminder } from '../utils/notify.js';

const now = new Date('2026-09-24T09:00:00Z');
const ids = ['a'.repeat(24), 'b'.repeat(24), 'c'.repeat(24)];

test('every demo field is labelled as demo and has valid coordinates and area', () => {
  for (const f of demoFields(now)) {
    assert.match(f.name, /\(Demo\)$/);
    assert.ok(f.latitude >= -90 && f.latitude <= 90 && f.longitude >= -180 && f.longitude <= 180);
    assert.ok(f.areaAcres > 0);
  }
});

test('the first demo field triggers a harvest reminder so notifications can be exercised', () => {
  assert.ok(buildHarvestReminder({ _id: 'x', ...demoFields(now)[0] }, now));
});

test('demo crop health records satisfy the API schema', () => {
  const records = demoHealth(now, ids[0]);
  assert.ok(records.length >= 2);
  for (const r of records) assert.equal(entrySchema.safeParse(r).success, true);
});

test('demo diary entries reference the given fields and are labelled', () => {
  for (const e of demoDiary(now, ids)) {
    assert.ok(ids.includes(e.field));
    assert.ok(e.activity);
    assert.match(e.notes, /Demo record/);
  }
});

test('demo listings satisfy the listing schema and say they are demo data', () => {
  for (const l of demoListings()) {
    assert.equal(createSchema.safeParse(l).success, true);
    assert.match(l.description, /Demo/);
  }
});

test('demo soil readings satisfy the soil schema', () => {
  const rows = demoSoil(now, ids[0]);
  assert.ok(rows.length >= 2);
  for (const r of rows) assert.equal(readingSchema.safeParse(r).success, true);
});
