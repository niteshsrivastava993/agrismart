import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrices, normalizeRecord, toIsoDate, toPrice } from '../services/marketService.js';

const rec = { commodity: 'Wheat', state: 'Uttar Pradesh', district: 'Lucknow', market: 'Lucknow', arrival_date: '23/09/2026', min_price: '2300', max_price: '2600', modal_price: '2450' };
const ok = (records) => ({ ok: true, status: 200, json: async () => ({ records, total: records.length, updated_date: '2026-09-23 18:40:00' }) });
const quiet = () => { const orig = console.error; console.error = () => {}; return () => { console.error = orig; }; };

test('toPrice keeps numbers and turns missing values into null, never 0', () => {
  assert.equal(toPrice('2450'), 2450);
  for (const v of ['NA', 'na', '', '  ', null, undefined, 'abc']) assert.equal(toPrice(v), null);
});

test('toIsoDate converts dd/mm/yyyy and rejects other formats', () => {
  assert.equal(toIsoDate('23/09/2026'), '2026-09-23');
  assert.equal(toIsoDate('2026-09-23'), null);
  assert.equal(toIsoDate(undefined), null);
});

test('normalizeRecord produces the internal shape with null for missing prices', () => {
  const n = normalizeRecord({ ...rec, modal_price: 'NA' }, '2026-09-24T00:00:00.000Z');
  assert.equal(n.modalPrice, null);
  assert.equal(n.minPrice, 2300);
  assert.equal(n.unit, 'quintal');
  assert.equal(n.arrivalDate, '2026-09-23');
  assert.equal(n.fetchedAt, '2026-09-24T00:00:00.000Z');
});

test('getPrices refuses to run without credentials', async () => {
  delete process.env.DATA_GOV_API_KEY;
  await assert.rejects(getPrices({}), (e) => e.status === 503 && /Connect API credentials/.test(e.message));
});

test('getPrices normalizes, filters invalid rows and sends filters upstream', async () => {
  process.env.DATA_GOV_API_KEY = 'test-key';
  let url;
  globalThis.fetch = async (u) => { url = decodeURIComponent(u); return ok([rec, { ...rec, commodity: '' }]); };
  const r = await getPrices({ commodity: 'Wheat' });
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].modalPrice, 2450);
  assert.equal(r.cached, false);
  assert.equal(r.sourceUpdatedAt, '2026-09-23 18:40:00');
  assert.ok(url.includes('filters[commodity]=Wheat'));
});

test('getPrices serves stale cache when the API fails, and 503 when nothing is cached', async () => {
  process.env.DATA_GOV_API_KEY = 'test-key';
  globalThis.fetch = async () => ok([{ ...rec, commodity: 'Rice' }]);
  await getPrices({ commodity: 'Rice' });

  const realNow = Date.now, restore = quiet();
  try {
    Date.now = () => realNow() + 31 * 60 * 1000; // cache expired
    globalThis.fetch = async () => { throw new Error('boom'); };
    const stale = await getPrices({ commodity: 'Rice' });
    assert.equal(stale.stale, true);
    assert.equal(stale.records.length, 1);
    await assert.rejects(getPrices({ commodity: 'Unseen' }), (e) => e.status === 503 && /temporarily unavailable/.test(e.message));
  } finally { Date.now = realNow; restore(); }
});

test('getPrices treats a malformed upstream response as unavailable', async () => {
  process.env.DATA_GOV_API_KEY = 'test-key';
  const restore = quiet();
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) });
  try { await assert.rejects(getPrices({ commodity: 'Malformed' }), (e) => e.status === 503); } finally { restore(); }
});
