import test from 'node:test';
import assert from 'node:assert/strict';
import { sniffImage } from '../utils/media.js';
import { entrySchema as healthSchema } from '../routes/cropHealth.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPVP8 ')]);

test('images are recognised by their first bytes', () => {
  assert.equal(sniffImage(jpeg), 'image/jpeg');
  assert.equal(sniffImage(png), 'image/png');
  assert.equal(sniffImage(webp), 'image/webp');
});

test('non-images, disguised files and tiny buffers are rejected', () => {
  assert.equal(sniffImage(Buffer.from('<svg onload=alert(1)></svg>')), null);
  assert.equal(sniffImage(Buffer.from('GIF89a....')), null);
  assert.equal(sniffImage(Buffer.from('RIFF....WAVEfmt ')), null);
  assert.equal(sniffImage(Buffer.from([0xff, 0xd8])), null);
  assert.equal(sniffImage(Buffer.alloc(0)), null);
  assert.equal(sniffImage('not a buffer'), null);
  assert.equal(sniffImage(null), null);
});

test('records accept a null or well-formed imageId only', () => {
  const base = { field: 'a'.repeat(24), date: '2026-09-23', healthScore: 70 };
  assert.equal(healthSchema.safeParse({ ...base, imageId: null }).success, true);
  assert.equal(healthSchema.safeParse({ ...base, imageId: 'b'.repeat(24) }).success, true);
  assert.equal(healthSchema.safeParse({ ...base }).success, true);
  assert.equal(healthSchema.safeParse({ ...base, imageId: 'nope' }).success, false);
  assert.equal(healthSchema.safeParse({ ...base, imageId: { $ne: null } }).success, false);
});
