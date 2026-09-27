import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHarvestReminder } from '../utils/notify.js';

const now = new Date('2026-09-24T09:00:00Z');
const field = (expectedHarvestDate) => ({ _id: 'f1', name: 'North plot', crop: 'Wheat', expectedHarvestDate });

test('harvest reminder is created for harvests within 7 days', () => {
  const r = buildHarvestReminder(field(new Date('2026-09-27T00:00:00Z')), now);
  assert.equal(r.type, 'crop_reminder');
  assert.match(r.message, /in 3 days/);
  assert.equal(r.dedupeKey, 'harvest:f1:2026-09-27');
});

test('harvest reminder says today when harvest is today', () => {
  assert.match(buildHarvestReminder(field(new Date('2026-09-24T00:00:00Z')), now).message, /today/);
});

test('no reminder for past, far-future or missing harvest dates', () => {
  assert.equal(buildHarvestReminder(field(new Date('2026-09-20T00:00:00Z')), now), null);
  assert.equal(buildHarvestReminder(field(new Date('2026-10-30T00:00:00Z')), now), null);
  assert.equal(buildHarvestReminder(field(undefined), now), null);
});
