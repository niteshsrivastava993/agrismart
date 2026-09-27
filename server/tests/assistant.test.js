import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, executeTool, normalizeMessages, runAssistant } from '../services/assistantService.js';

const farmer = { _id: 'u1', role: 'farmer', state: 'Uttar Pradesh', district: 'Lucknow' };
const buyer = { _id: 'u2', role: 'buyer', state: 'Uttar Pradesh', district: 'Kanpur' };
const rec = (i) => ({ commodity: 'Wheat', market: `M${i}`, district: 'Lucknow', state: 'UP', arrivalDate: '2026-09-23', minPrice: 1, maxPrice: 3, modalPrice: 2, unit: 'quintal', variety: 'x', fetchedAt: 'now' });
const quiet = () => { const o = console.error; console.error = () => {}; return () => { console.error = o; }; };

test('market tool trims the result, trims inputs and reports its source', async () => {
  let seen;
  const deps = { getPrices: async (a) => { seen = a; return { source: 'data.gov.in', fetchedAt: 'T', stale: false, records: Array.from({ length: 12 }, (_, i) => rec(i)) }; } };
  const out = await executeTool('get_market_prices', { commodity: '  Wheat ', district: 'Lucknow' }, farmer, deps);
  assert.equal(out.records.length, 8);
  assert.equal(out.source, 'data.gov.in');
  assert.equal(seen.commodity, 'Wheat');
  assert.equal(seen.limit, 10);
  assert.equal('variety' in out.records[0], false);
});

test('tools return errors instead of throwing or inventing data', async () => {
  assert.ok((await executeTool('get_market_prices', {}, farmer, {})).error);
  assert.ok((await executeTool('get_weather', {}, farmer, {})).error);
  const deps = { getCurrentWeather: async () => { throw new Error('Live data is temporarily unavailable.'); } };
  assert.equal((await executeTool('get_weather', { place: 'Lucknow' }, farmer, deps)).error, 'Live data is temporarily unavailable.');
  assert.match((await executeTool('nope', {}, farmer, {})).error, /Unknown tool/);
});

test('get_my_fields is farmers only', async () => {
  const deps = { listFields: async () => [{ name: 'A' }] };
  assert.ok((await executeTool('get_my_fields', {}, buyer, deps)).error);
  assert.deepEqual((await executeTool('get_my_fields', {}, farmer, deps)).fields, [{ name: 'A' }]);
});

test('normalizeMessages drops leading assistant turns and merges repeated roles', () => {
  const out = normalizeMessages([{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }]);
  assert.deepEqual(out, [{ role: 'user', content: 'a\nb' }]);
});

test('system prompt carries user context and the no-guessing rules', () => {
  const p = buildSystemPrompt(farmer, new Date('2026-09-24T00:00:00Z'));
  assert.match(p, /Lucknow/);
  assert.match(p, /2026-09-24/);
  assert.match(p, /MUST call the relevant tool/);
});

test('runAssistant is disabled without an API key', async () => {
  delete process.env.AI_API_KEY;
  await assert.rejects(runAssistant({ messages: [{ role: 'user', content: 'hi' }], user: farmer }), (e) => e.status === 503);
});

test('runAssistant runs the tool loop and never puts the key in the request body', async () => {
  process.env.AI_API_KEY = 'k-secret-123';
  const calls = [];
  const replies = [
    { candidates: [{ content: { role: 'model', parts: [{ text: 'Checking' }, { functionCall: { name: 'get_market_prices', args: { commodity: 'Wheat' } } }] } }] },
    { candidates: [{ content: { role: 'model', parts: [{ text: 'Wheat is ₹2 per quintal.' }] } }] },
  ];
  globalThis.fetch = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => replies[calls.length - 1] }; };
  const deps = { getPrices: async () => ({ source: 'data.gov.in', fetchedAt: 'T', stale: false, records: [rec(1)] }) };
  const out = await runAssistant({ messages: [{ role: 'user', content: 'wheat price?' }], user: farmer }, { deps });
  assert.equal(out.reply, 'Wheat is ₹2 per quintal.');
  assert.equal(out.sources[0].source, 'data.gov.in');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'k-secret-123');
  assert.ok(calls[0].url.includes(':generateContent'));
  const last = calls[1].body.contents.at(-1);
  assert.equal(last.role, 'user');
  assert.equal(last.parts[0].functionResponse.name, 'get_market_prices');
  for (const c of calls) assert.ok(!c.init.body.includes('k-secret-123'));
});

test('runAssistant reports upstream failure as 502 without leaking the key', async () => {
  process.env.AI_API_KEY = 'k-secret-123';
  const restore = quiet();
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  try {
    await assert.rejects(runAssistant({ messages: [{ role: 'user', content: 'hi' }], user: farmer }), (e) => e.status === 502 && !e.message.includes('k-secret'));
  } finally { restore(); }
});
