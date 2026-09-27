import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchema, inquirySchema, updateSchema } from '../routes/listings.js';
import { firstName, toPublic } from '../utils/listings.js';

const valid = { crop: 'Wheat', category: 'grains', quantity: 40, pricePerUnit: 2450, state: 'Uttar Pradesh', district: 'Lucknow' };

test('toPublic exposes only the seller first name, never contact details', () => {
  const l = { _id: 'l1', ...valid, unit: 'quintal', status: 'active', seller: { fullName: 'Asha Verma', email: 'a@x.in', mobile: '9876543210' }, mobile: '9876543210', email: 'a@x.in' };
  const p = toPublic(l, new Set(['l1']));
  assert.equal(p.sellerName, 'Asha');
  assert.equal(p.saved, true);
  const json = JSON.stringify(p);
  for (const secret of ['9876543210', 'a@x.in', 'Verma']) assert.ok(!json.includes(secret));
});

test('firstName falls back safely', () => {
  assert.equal(firstName(''), 'Farmer');
  assert.equal(firstName(undefined), 'Farmer');
});

test('listing schema accepts valid data and defaults unit', () => {
  const r = createSchema.safeParse(valid);
  assert.equal(r.success, true);
  assert.equal(r.data.unit, 'quintal');
});

test('listing schema rejects bad quantity, price, category and unit', () => {
  for (const bad of [{ quantity: 0 }, { quantity: -5 }, { pricePerUnit: 0 }, { category: 'weapons' }, { unit: 'ton' }, { crop: '' }]) {
    assert.equal(createSchema.safeParse({ ...valid, ...bad }).success, false, JSON.stringify(bad));
  }
});

test('listing update is partial but still validates values and status', () => {
  assert.equal(updateSchema.safeParse({ status: 'sold' }).success, true);
  assert.equal(updateSchema.safeParse({ status: 'gone' }).success, false);
  assert.equal(updateSchema.safeParse({ pricePerUnit: -1 }).success, false);
});

test('inquiry needs a real message', () => {
  assert.equal(inquirySchema.safeParse({ message: 'Hi' }).success, false);
  assert.equal(inquirySchema.safeParse({ message: '   ' }).success, false);
  assert.equal(inquirySchema.safeParse({ message: 'Is 40 quintals still available?' }).success, true);
});
