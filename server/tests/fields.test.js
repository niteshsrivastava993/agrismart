import test from 'node:test';
import assert from 'node:assert/strict';
import { boundarySchema, fieldSchema } from '../routes/fields.js';

const tri = [[26.85, 80.94], [26.851, 80.94], [26.851, 80.941]];
const base = { name: 'North', crop: 'Wheat', areaAcres: 2, latitude: 26.85, longitude: 80.94 };

test('a boundary of three or more valid points is accepted, and [] clears it', () => {
  assert.equal(boundarySchema.safeParse(tri).success, true);
  assert.equal(boundarySchema.safeParse([]).success, true);
});

test('too few points, bad coordinates and wrong shapes are rejected', () => {
  assert.equal(boundarySchema.safeParse(tri.slice(0, 2)).success, false);
  assert.equal(boundarySchema.safeParse([[91, 0], [0, 0], [1, 1]]).success, false);
  assert.equal(boundarySchema.safeParse([[0, 181], [0, 0], [1, 1]]).success, false);
  assert.equal(boundarySchema.safeParse([[1, 2, 3], [0, 0], [1, 1]]).success, false);
  assert.equal(boundarySchema.safeParse([['a', 'b'], [0, 0], [1, 1]]).success, false);
  assert.equal(boundarySchema.safeParse(Array.from({ length: 201 }, (_, i) => [i / 10, 0])).success, false);
});

test('field schema takes an optional boundary and validates it', () => {
  assert.equal(fieldSchema.safeParse(base).success, true);
  assert.equal(fieldSchema.safeParse({ ...base, boundary: tri }).success, true);
  assert.equal(fieldSchema.safeParse({ ...base, boundary: tri.slice(0, 2) }).success, false);
  assert.equal(fieldSchema.partial().safeParse({ boundary: [] }).success, true);
});
