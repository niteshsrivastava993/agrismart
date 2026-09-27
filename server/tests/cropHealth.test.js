import test from 'node:test';
import assert from 'node:assert/strict';
import { entrySchema, analyzeSchema } from '../routes/cropHealth.js';

const valid = { field: 'a'.repeat(24), date: '2026-09-23', healthScore: 72, growthStage: 'Tillering' };

test('crop health entry accepts valid data and defaults issueType to none', () => {
  const r = entrySchema.safeParse(valid);
  assert.equal(r.success, true);
  assert.equal(r.data.issueType, 'none');
});

test('crop health entry rejects out-of-range or non-integer scores', () => {
  for (const healthScore of [-1, 101, 55.5, '72', undefined]) assert.equal(entrySchema.safeParse({ ...valid, healthScore }).success, false);
});

test('crop health entry rejects bad ids, bad dates and unknown issue types', () => {
  assert.equal(entrySchema.safeParse({ ...valid, field: 'nope' }).success, false);
  assert.equal(entrySchema.safeParse({ ...valid, date: 'not-a-date' }).success, false);
  assert.equal(entrySchema.safeParse({ ...valid, issueType: 'aliens' }).success, false);
});

const validAnalyze = { field: 'a'.repeat(24), imageId: 'b'.repeat(24), crop: 'Wheat', symptoms: 'Yellowing leaf tips' };

test('analyze request accepts valid data and makes symptoms optional', () => {
  assert.equal(analyzeSchema.safeParse(validAnalyze).success, true);
  const { symptoms: _symptoms, ...rest } = validAnalyze;
  assert.equal(analyzeSchema.safeParse(rest).success, true);
});

test('analyze request requires an image and a real field/crop', () => {
  assert.equal(analyzeSchema.safeParse({ ...validAnalyze, imageId: undefined }).success, false);
  assert.equal(analyzeSchema.safeParse({ ...validAnalyze, field: 'nope' }).success, false);
  assert.equal(analyzeSchema.safeParse({ ...validAnalyze, crop: '' }).success, false);
});
