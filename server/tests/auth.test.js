import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { protect, requireRole, validate } from '../middleware/index.js';
import { registerSchema } from '../routes/auth.js';

process.env.JWT_SECRET = 'test-secret';

const mockRes = () => {
  const r = { statusCode: 200, body: null, status(c) { r.statusCode = c; return r; }, json(b) { r.body = b; return r; } };
  return r;
};
const run = async (headers) => { const res = mockRes(); let nexted = false; await protect({ headers }, res, () => { nexted = true; }); return { res, nexted }; };

test('protect rejects a missing token', async () => {
  const { res, nexted } = await run({});
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Authentication required');
  assert.equal(nexted, false);
});

test('protect rejects malformed and wrongly signed tokens', async () => {
  assert.equal((await run({ authorization: 'Bearer garbage' })).res.body.error, 'Invalid token');
  const forged = jwt.sign({ role: 'admin' }, 'other-secret', { subject: 'abc' });
  assert.equal((await run({ authorization: `Bearer ${forged}` })).res.body.error, 'Invalid token');
});

test('protect rejects an expired JWT', async () => {
  const expired = jwt.sign({ role: 'farmer' }, 'test-secret', { subject: 'abc', expiresIn: -10 });
  const { res } = await run({ authorization: `Bearer ${expired}` });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Session expired');
});

test('requireRole allows listed roles and blocks everyone else', () => {
  const guard = requireRole('admin');
  let res = mockRes(), called = false;
  guard({ user: { role: 'farmer' } }, res, () => { called = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  guard({ user: undefined }, (res = mockRes()), () => { called = true; });
  assert.equal(res.statusCode, 403);
  guard({ user: { role: 'admin' } }, mockRes(), () => { called = true; });
  assert.equal(called, true);
});

test('validate returns 400 with details for bad input and passes parsed data on success', () => {
  const mw = validate(z.object({ n: z.coerce.number() }));
  const res = mockRes();
  mw({ body: { n: 'x' } }, res, () => assert.fail('should not continue'));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.details[0].path, 'n');
  const req = { body: { n: '5' } };
  let called = false;
  mw(req, mockRes(), () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.body.n, 5);
});

const valid = { fullName: 'Asha Verma', email: ' Asha@Example.COM ', mobile: '9876543210', password: 'Strong123', confirmPassword: 'Strong123', role: 'farmer', state: 'Uttar Pradesh', district: 'Lucknow' };

test('registerSchema accepts valid data, lowercases email and defaults language', () => {
  const r = registerSchema.safeParse(valid);
  assert.equal(r.success, true);
  assert.equal(r.data.email, 'asha@example.com');
  assert.equal(r.data.language, 'en');
});

test('registerSchema rejects bad mobile, weak password, mismatch, missing fields and admin role', () => {
  const pathOf = (o) => registerSchema.safeParse(o).error?.issues.map((i) => i.path[0]);
  assert.ok(pathOf({ ...valid, mobile: '1234567890' }).includes('mobile'));
  assert.ok(pathOf({ ...valid, password: 'password', confirmPassword: 'password' }).includes('password'));
  assert.ok(pathOf({ ...valid, confirmPassword: 'Different123' }).includes('confirmPassword'));
  assert.ok(pathOf({ ...valid, state: undefined }).includes('state'));
  assert.ok(pathOf({ ...valid, role: 'admin' }).includes('role'));
});
