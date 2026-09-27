import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSchema } from '../routes/search.js';
import { escapeRegex } from '../utils/regex.js';
import { mapCrop, mapDiary, mapField, mapListing, mapMarket, mapUser, marketAction, titleCase } from '../utils/search.js';

test('search needs 2 to 100 characters after trimming', () => {
  assert.equal(searchSchema.safeParse({ q: ' a ' }).success, false);
  assert.equal(searchSchema.safeParse({}).success, false);
  assert.equal(searchSchema.safeParse({ q: 'x'.repeat(101) }).success, false);
  assert.equal(searchSchema.safeParse({ q: '  wheat ' }).data.q, 'wheat');
});

test('user input is escaped so it cannot become a regex pattern', () => {
  assert.equal(escapeRegex('a.b(c)'), 'a\\.b\\(c\\)');
  assert.equal(new RegExp(escapeRegex('.*'), 'i').test('abc'), false);
  assert.equal(new RegExp(escapeRegex('.*'), 'i').test('x.*y'), true);
});

test('results carry a type, title and a route inside the app', () => {
  const all = [
    mapField({ _id: 'f1', name: 'North', crop: 'Wheat', areaAcres: 2 }),
    mapCrop({ _id: 'Wheat', count: 1 }),
    mapDiary({ _id: 'd1', activity: 'Irrigation', date: new Date('2026-09-20'), field: { _id: 'f1', name: 'North' } }),
    mapMarket({ _id: 'Wheat', markets: ['A', 'B'], latest: new Date('2026-09-23') }),
    mapListing({ _id: 'l1', crop: 'Rice', pricePerUnit: 3000, unit: 'quintal', district: 'X', state: 'Y' }, true),
    mapUser({ _id: 'u1', fullName: 'Asha', email: 'a@x.in', role: 'farmer' }),
    marketAction('wheat'),
  ];
  for (const r of all) { assert.ok(r.type && r.title && r.to.startsWith('/'), r.type); }
  assert.equal(all[2].to, '/farmer/diary?field=f1');
  assert.equal(all[3].subtitle, '2 markets · latest 2026-09-23');
  assert.equal(all[1].subtitle, '1 field · view prices');
});

test('listing links differ for the seller and for buyers', () => {
  const l = { _id: 'l1', crop: 'Rice', pricePerUnit: 1, unit: 'kg', district: 'X', state: 'Y' };
  assert.equal(mapListing(l, true).to, '/farmer/listings');
  assert.equal(mapListing(l, false).to, '/buyer/dashboard');
});

test('the market action title-cases the commodity for the exact-match filter', () => {
  assert.equal(titleCase('WHEAT'), 'Wheat');
  assert.equal(marketAction('kanpur nagar').to, '/market?commodity=Kanpur%20Nagar');
  assert.equal(mapDiary({ _id: 'd', activity: 'x', date: new Date(), field: null }).to, '/farmer/diary');
});
