import test from 'node:test';
import assert from 'node:assert/strict';
import { healthBand } from '../src/utils/health.js';

test('scores fall into good, fair and poor at the documented boundaries', () => {
  for (const [score, key] of [[100, 'good'], [70, 'good'], [69, 'fair'], [40, 'fair'], [39, 'poor'], [0, 'poor']]) assert.equal(healthBand(score).key, key, String(score));
});

test('a missing or non-numeric score is shown as no record, never as poor', () => {
  for (const v of [null, undefined, NaN, '70', {}]) assert.equal(healthBand(v).key, 'unknown');
});
