import test from 'node:test';
import assert from 'node:assert/strict';
import { polygonAreaAcres } from '../src/utils/geo.js';

const square = (lat, meters) => {
  const dLat = meters / 111195;
  const dLon = meters / (111195 * Math.cos((lat * Math.PI) / 180));
  return [[lat, 80.9], [lat + dLat, 80.9], [lat + dLat, 80.9 + dLon], [lat, 80.9 + dLon]];
};

test('a 100 m square is about 2.47 acres at any latitude', () => {
  for (const lat of [0, 26.85, 55]) assert.ok(Math.abs(polygonAreaAcres(square(lat, 100)) - 2.471) < 0.05, `lat ${lat}`);
});

test('area does not depend on the direction the points are listed', () => {
  const s = square(26.85, 100);
  assert.ok(Math.abs(polygonAreaAcres(s) - polygonAreaAcres([...s].reverse())) < 1e-9);
});

test('fewer than three points, or junk, gives zero', () => {
  assert.equal(polygonAreaAcres([]), 0);
  assert.equal(polygonAreaAcres([[1, 1], [2, 2]]), 0);
  assert.equal(polygonAreaAcres(null), 0);
});
