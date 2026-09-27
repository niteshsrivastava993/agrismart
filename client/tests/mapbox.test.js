import test from 'node:test';
import assert from 'node:assert/strict';
import { satelliteTile } from '../src/utils/mapbox.js';
import { pickBackground } from '../src/utils/backgrounds.js';

test('a public Mapbox token produces a satellite tile URL with attribution', () => {
  const t = satelliteTile(' pk.abc123.def_456 ');
  assert.ok(t.url.includes('access_token=pk.abc123.def_456'));
  assert.ok(t.url.includes('{z}/{x}/{y}'));
  assert.match(t.attribution, /Mapbox/);
});

test('missing, malformed and secret tokens are refused', () => {
  for (const v of [undefined, null, '', '   ', 'sk.abc.def', 'abc', 'pk.only-one-part', 'pk.a b.c']) assert.equal(satelliteTile(v), null, String(v));
});

test('backgrounds come only from plain image file names in the manifest', () => {
  const m = { login: 'login.webp', a: '../secret.jpg', b: 'x/y.jpg', c: 'https://evil.example/a.jpg', d: 'file.svg', e: 42, f: 'ok-name_2.JPG' };
  assert.equal(pickBackground(m, 'login'), '/backgrounds/login.webp');
  assert.equal(pickBackground(m, 'f'), '/backgrounds/ok-name_2.JPG');
  for (const k of ['a', 'b', 'c', 'd', 'e', 'missing', 'constructor']) assert.equal(pickBackground(m, k), null, k);
  assert.equal(pickBackground(null, 'login'), null);
  assert.equal(pickBackground({}, 'login'), null);
});
