import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { pickVideo, videoPlan } from '../src/utils/backgrounds.js';

const manifest = JSON.parse(readFileSync(new URL('../public/backgrounds/manifest.json', import.meta.url), 'utf8'));

test('video entries accept only plain mp4/webm names and fall back between hd and sd', () => {
  const m = { a: { hd: 'a-hd.mp4', sd: 'a-sd.mp4', poster: 'a.webp' }, b: { sd: 'b.webm' }, c: { hd: '../x.mp4' }, d: { hd: 'https://evil.example/x.mp4' }, e: 'login.webp' };
  assert.deepEqual(pickVideo(m, 'a'), { hd: '/backgrounds/a-hd.mp4', sd: '/backgrounds/a-sd.mp4', poster: '/backgrounds/a.webp' });
  assert.deepEqual(pickVideo(m, 'b'), { hd: '/backgrounds/b.webm', sd: '/backgrounds/b.webm', poster: null });
  for (const k of ['c', 'd', 'e', 'missing', 'constructor']) assert.equal(pickVideo(m, k), null, k);
  assert.equal(pickVideo(null, 'a'), null);
});

test('video plays full size on wide screens and light on phones; poster only for reduced motion or data saver', () => {
  assert.equal(videoPlan({ width: 1440 }), 'hd');
  assert.equal(videoPlan({ width: 390 }), 'sd');
  assert.equal(videoPlan({ width: 1440, effectiveType: '3g' }), 'sd');
  assert.equal(videoPlan({ width: 1440, reducedMotion: true }), 'poster');
  assert.equal(videoPlan({ width: 1440, saveData: true }), 'poster');
  assert.equal(videoPlan({ width: 1440, effectiveType: '2g' }), 'poster');
});

test('every page in the shipped manifest points at files that exist', () => {
  assert.deepEqual(Object.keys(manifest).sort(), ['dashboard', 'login', 'marketplace', 'weather']);
  for (const e of Object.values(manifest)) for (const f of [e.hd, e.sd, e.poster]) assert.ok(existsSync(new URL(`../public/backgrounds/${f}`, import.meta.url)), f);
});
