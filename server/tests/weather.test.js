import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentWeather, normalizeWeather } from '../services/weatherService.js';

const sample = { name: 'Lucknow', sys: { country: 'IN' }, coord: { lat: 26.8, lon: 80.9 }, main: { temp: 31.2, feels_like: 35, humidity: 60, pressure: 1005 }, wind: { speed: 2.1 }, visibility: 6000, weather: [{ main: 'Haze', description: 'haze' }], dt: 1790000000 };
const quiet = () => { const orig = console.error; console.error = () => {}; return () => { console.error = orig; }; };

test('normalizeWeather returns nulls for missing fields', () => {
  const n = normalizeWeather({}, 'now');
  assert.equal(n.temperatureC, null);
  assert.equal(n.location, null);
  assert.equal(n.observedAt, null);
});

test('getCurrentWeather refuses to run without credentials', async () => {
  delete process.env.OPENWEATHER_API_KEY;
  await assert.rejects(getCurrentWeather({ q: 'Lucknow' }), (e) => e.status === 503 && /Connect API credentials/.test(e.message));
});

test('getCurrentWeather normalizes and then serves from cache', async () => {
  process.env.OPENWEATHER_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => sample }; };
  const a = await getCurrentWeather({ q: 'Lucknow' });
  assert.equal(a.temperatureC, 31.2);
  assert.equal(a.location, 'Lucknow, IN');
  assert.equal(a.source, 'OpenWeather');
  assert.match(a.observedAt, /^\d{4}-\d{2}-\d{2}T/);
  const b = await getCurrentWeather({ q: 'lucknow' });
  assert.equal(b.cached, true);
  assert.equal(calls, 1);
});

test('getCurrentWeather maps 404 to Location not found', async () => {
  process.env.OPENWEATHER_API_KEY = 'test-key';
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(getCurrentWeather({ q: 'Nowhereville' }), (e) => e.status === 404 && e.message === 'Location not found');
});

test('getCurrentWeather reports unavailable on API failure without leaking the key', async () => {
  process.env.OPENWEATHER_API_KEY = 'secret-key-123';
  const restore = quiet();
  globalThis.fetch = async () => { throw new Error('network down'); };
  try {
    await assert.rejects(getCurrentWeather({ lat: 10, lon: 20 }), (e) => e.status === 503 && !e.message.includes('secret-key-123'));
  } finally { restore(); }
});

// ---- forecast ----
import { getForecast, normalizeForecast } from '../services/weatherService.js';

const at = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const slot = (iso, temp, min, max, main, pop, rain) => ({ dt: at(iso), main: { temp, temp_min: min, temp_max: max }, weather: [{ main }], ...(pop === undefined ? {} : { pop }), ...(rain ? { rain: { '3h': rain } } : {}) });
const forecastSample = {
  city: { name: 'Lucknow', country: 'IN', timezone: 19800, coord: { lat: 26.8, lon: 80.9 } },
  list: [
    slot('2026-09-24T06:00:00Z', 30, 29, 31, 'Clear', 0.1),
    slot('2026-09-24T12:00:00Z', 33, 32, 34, 'Clear', 0.2),
    slot('2026-09-24T20:00:00Z', 26, 25, 27, 'Rain', 0.8, 2.5), // 01:30 IST on the 25th
    slot('2026-09-25T02:00:00Z', 28, 27, 29, 'Clouds'),
  ],
};

test('normalizeForecast groups slots into the city\'s local days', () => {
  const f = normalizeForecast(forecastSample, 'T');
  assert.deepEqual(f.days.map((d) => d.date), ['2026-09-24', '2026-09-25']);
  assert.deepEqual([f.days[0].minC, f.days[0].maxC, f.days[0].condition, f.days[0].rainChancePct], [29, 34, 'Clear', 20]);
  assert.deepEqual([f.days[1].minC, f.days[1].maxC, f.days[1].rainChancePct, f.days[1].rainMm], [25, 29, 80, 2.5]);
  assert.equal(f.next.length, 4);
  assert.equal(f.next[2].localTime, '2026-09-25T01:30');
  assert.equal(f.location, 'Lucknow, IN');
});

test('normalizeForecast keeps unknown values as null and copes with an empty list', () => {
  const f = normalizeForecast({ city: { timezone: 0 }, list: [slot('2026-09-24T06:00:00Z', 30, 29, 31, 'Clear')] }, 'T');
  assert.equal(f.days[0].rainChancePct, null);
  assert.deepEqual(normalizeForecast({}, 'T').days, []);
});

test('getForecast needs credentials, caches, and reports failure without the key', async () => {
  delete process.env.OPENWEATHER_API_KEY;
  await assert.rejects(getForecast({ q: 'ForecastTown' }), (e) => e.status === 503 && /Connect API credentials/.test(e.message));
  process.env.OPENWEATHER_API_KEY = 'secret-key-456';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => forecastSample }; };
  const a = await getForecast({ q: 'ForecastTown' });
  const b = await getForecast({ q: 'forecasttown' });
  assert.equal(a.days.length, 2);
  assert.equal(b.cached, true);
  assert.equal(calls, 1);
  const restore = quiet();
  globalThis.fetch = async () => { throw new Error('down'); };
  try { await assert.rejects(getForecast({ q: 'OtherTown' }), (e) => e.status === 503 && !e.message.includes('secret-key')); } finally { restore(); }
});
