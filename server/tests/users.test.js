import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordSchema, profileSchema } from '../routes/users.js';

test('profile update ignores role and email so they cannot be changed', () => {
  const r = profileSchema.safeParse({ fullName: 'Asha Verma', role: 'admin', email: 'x@y.in', isActive: false });
  assert.equal(r.success, true);
  assert.deepEqual(Object.keys(r.data), ['fullName']);
});

test('profile update validates values and rejects an empty update', () => {
  assert.equal(profileSchema.safeParse({}).success, false);
  assert.equal(profileSchema.safeParse({ mobile: '12345' }).success, false);
  assert.equal(profileSchema.safeParse({ language: 'fr' }).success, false);
  assert.equal(profileSchema.safeParse({ language: 'hi' }).success, true);
});

test('profile update accepts a valid avatarId, allows clearing it, and rejects a malformed one', () => {
  assert.equal(profileSchema.safeParse({ avatarId: '507f1f77bcf86cd799439011' }).success, true);
  assert.equal(profileSchema.safeParse({ avatarId: null }).success, true);
  assert.equal(profileSchema.safeParse({ avatarId: 'not-an-id' }).success, false);
});

test('password change needs a strong, confirmed and different password', () => {
  const ok = { currentPassword: 'Old12345', newPassword: 'New12345', confirmPassword: 'New12345' };
  assert.equal(passwordSchema.safeParse(ok).success, true);
  assert.equal(passwordSchema.safeParse({ ...ok, newPassword: 'weak', confirmPassword: 'weak' }).success, false);
  assert.equal(passwordSchema.safeParse({ ...ok, confirmPassword: 'Other12345' }).success, false);
  assert.equal(passwordSchema.safeParse({ ...ok, newPassword: 'Old12345', confirmPassword: 'Old12345' }).success, false);
});
