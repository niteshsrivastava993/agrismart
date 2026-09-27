import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCropImage } from '../services/cropAnalysisService.js';

const req = { imageBase64: 'aGVsbG8=', contentType: 'image/jpeg', crop: 'Wheat', symptoms: 'Yellowing tips', context: {} };
const goodBody = {
  possible_issue: 'Nitrogen deficiency',
  severity: 'moderate',
  explanation: 'Leaf yellowing pattern is consistent with nitrogen deficiency.',
  recommended_actions: ['Apply nitrogen-rich fertilizer'],
  preventive_measures: ['Soil-test before next sowing'],
  when_to_seek_help: 'If it spreads, consult a local expert.',
  model: 'gemini-2.5-flash-lite',
};

test('throws a 503 without PYTHON_AI_SERVICE_URL configured, and never calls fetch', async () => {
  delete process.env.PYTHON_AI_SERVICE_URL;
  let called = false;
  globalThis.fetch = async () => { called = true; return { ok: true, json: async () => goodBody }; };
  await assert.rejects(analyzeCropImage(req), (e) => e.status === 503);
  assert.equal(called, false);
});

test('returns a normalized result on success and carries a fixed disclaimer', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001';
  let seenUrl, seenBody;
  globalThis.fetch = async (url, init) => { seenUrl = url; seenBody = JSON.parse(init.body); return { ok: true, json: async () => goodBody }; };
  const out = await analyzeCropImage(req);
  assert.equal(seenUrl, 'http://localhost:8001/analyze');
  assert.equal(seenBody.crop, 'Wheat');
  assert.equal(seenBody.image_base64, req.imageBase64);
  assert.equal(out.possibleIssue, 'Nitrogen deficiency');
  assert.equal(out.severity, 'moderate');
  assert.deepEqual(out.recommendedActions, ['Apply nitrogen-rich fertilizer']);
  assert.match(out.disclaimer, /not a certified diagnosis/);
  assert.equal('confidence' in out, false);
});

test('strips a trailing slash from PYTHON_AI_SERVICE_URL before calling', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001/';
  let seenUrl;
  globalThis.fetch = async (url) => { seenUrl = url; return { ok: true, json: async () => goodBody }; };
  await analyzeCropImage(req);
  assert.equal(seenUrl, 'http://localhost:8001/analyze');
});

test('propagates a 503 from the AI service (not configured there either)', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001';
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({ detail: 'AI crop analysis is not configured.' }) });
  await assert.rejects(analyzeCropImage(req), (e) => e.status === 503 && /not configured/.test(e.message));
});

test('turns any other upstream failure into a 502, not a guess', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001';
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ detail: 'boom' }) });
  await assert.rejects(analyzeCropImage(req), (e) => e.status === 502);
});

test('a network error also becomes a 502', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001';
  globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(analyzeCropImage(req), (e) => e.status === 502);
});

test('rejects a malformed response instead of passing it through', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ possible_issue: '' }) });
  await assert.rejects(analyzeCropImage(req), (e) => e.status === 502);
});

test('drops an unexpected confidence-like field even if it slips through validation upstream', async () => {
  process.env.PYTHON_AI_SERVICE_URL = 'http://localhost:8001';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ...goodBody, confidence: 0.99 }) });
  const out = await analyzeCropImage(req);
  assert.equal('confidence' in out, false);
});
