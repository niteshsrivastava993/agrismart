import test from 'node:test';
import assert from 'node:assert/strict';
import { forgotSchema, resetSchema } from '../routes/auth.js';
import { isTokenStale } from '../middleware/index.js';
import { hashToken, newResetToken } from '../utils/tokens.js';

const token = 'a'.repeat(64);

test('reset tokens are random, 64 hex chars, and only their hash is derivable', () => {
  const a = newResetToken(), b = newResetToken();
  assert.match(a.token, /^[a-f0-9]{64}$/);
  assert.notEqual(a.token, b.token);
  assert.equal(a.tokenHash, hashToken(a.token));
  assert.notEqual(a.tokenHash, a.token);
});

test('forgot schema normalises and validates email', () => {
  assert.equal(forgotSchema.safeParse({ email: ' A@B.IN ' }).data.email, 'a@b.in');
  assert.equal(forgotSchema.safeParse({ email: 'nope' }).success, false);
});

test('reset schema needs a well-formed token and a strong, confirmed password', () => {
  const ok = { token, password: 'Strong123', confirmPassword: 'Strong123' };
  assert.equal(resetSchema.safeParse(ok).success, true);
  assert.equal(resetSchema.safeParse({ ...ok, token: 'short' }).success, false);
  assert.equal(resetSchema.safeParse({ ...ok, token: { $ne: null } }).success, false);
  assert.equal(resetSchema.safeParse({ ...ok, password: 'weak', confirmPassword: 'weak' }).success, false);
  assert.equal(resetSchema.safeParse({ ...ok, confirmPassword: 'Other1234' }).success, false);
});

test('tokens issued before a password change are stale, later ones are not', () => {
  const changed = new Date('2026-09-24T10:00:30Z');
  const sec = (iso) => Math.floor(new Date(iso).getTime() / 1000);
  assert.equal(isTokenStale(sec('2026-09-24T09:00:00Z'), changed), true);
  assert.equal(isTokenStale(sec('2026-09-24T10:00:30Z'), changed), false); // issued in the same second: the new session
  assert.equal(isTokenStale(sec('2026-09-24T10:05:00Z'), changed), false);
  assert.equal(isTokenStale(sec('2026-09-24T09:00:00Z'), undefined), false);
});
