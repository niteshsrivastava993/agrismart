import test, { after, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'flow-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
const { createApp } = await import('../app.js');
const { default: User } = await import('../models/User.js');
const { default: AuditLog } = await import('../models/AuditLog.js');
const { default: Notification } = await import('../models/Notification.js');

// Database calls are replaced with an in-memory store so the real route code runs end to end.
const store = new Map();
const makeUser = (o) => ({ isActive: true, save: async () => {}, ...o, toJSON() { const { passwordHash: _p, save: _s, toJSON: _t, ...rest } = this; return rest; } });
const createStub = mock.method(User, 'create', async (doc) => { const u = makeUser({ _id: new mongoose.Types.ObjectId(), ...doc }); store.set(String(u._id), u); return u; });
mock.method(User, 'findById', async (id) => store.get(String(id)) ?? null);
mock.method(User, 'findOne', (q) => ({ select: async () => [...store.values()].find((u) => u.email === q.email) ?? null }));
mock.method(AuditLog, 'create', async () => ({}));
mock.method(Notification, 'create', async () => ({}));
const quiet = () => { const e = console.error, w = console.warn; console.error = () => {}; console.warn = () => {}; return () => { console.error = e; console.warn = w; }; };

let server, port;
before(() => new Promise((resolve) => { server = createApp().listen(0, () => { port = server.address().port; resolve(); }); }));
after(() => new Promise((resolve) => { mock.restoreAll(); server.closeAllConnections?.(); server.close(resolve); }));

function call(path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({ port, path, method, agent: false, headers: { ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) } }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => { let json = null; try { json = JSON.parse(raw); } catch { /* not json */ } resolve({ status: res.statusCode, json }); });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const signup = (over = {}) => ({ fullName: 'Asha Verma', email: 'asha@example.com', mobile: '9876543210', password: 'Passw0rd1', confirmPassword: 'Passw0rd1', role: 'farmer', state: 'Uttar Pradesh', district: 'Lucknow', ...over });
let farmerToken, buyerToken;

test('registration creates a hashed account and returns a valid token', async () => {
  const r = await call('/api/auth/register', { method: 'POST', body: signup() });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.user.email, 'asha@example.com');
  assert.equal(r.json.user.role, 'farmer');
  assert.ok(!('passwordHash' in r.json.user));
  const stored = [...store.values()][0];
  assert.match(stored.passwordHash, /^\$2[aby]\$/);
  assert.ok(!JSON.stringify(stored).includes('Passw0rd1') || stored.passwordHash !== 'Passw0rd1');
  const payload = jwt.verify(r.json.token, 'flow-secret');
  assert.equal(payload.sub, String(stored._id));
  assert.equal(payload.role, 'farmer');
  farmerToken = r.json.token;
});

test('a buyer can register too, and admin cannot be self-registered', async () => {
  const b = await call('/api/auth/register', { method: 'POST', body: signup({ email: 'ravi@example.com', role: 'buyer' }) });
  assert.equal(b.status, 201);
  buyerToken = b.json.token;
  assert.equal((await call('/api/auth/register', { method: 'POST', body: signup({ email: 'x@example.com', role: 'admin' }) })).status, 400);
});

test('login accepts the right password and gives one generic error otherwise', async () => {
  const ok = await call('/api/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: 'Passw0rd1' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  const wrong = await call('/api/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: 'WrongPass1' } });
  const unknown = await call('/api/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'Passw0rd1' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error, unknown.json.error);
});

test('the session token works for /me', async () => {
  const r = await call('/api/auth/me', { token: farmerToken });
  assert.equal(r.status, 200);
  assert.equal(r.json.user.email, 'asha@example.com');
});

test('roles are enforced on the server: a farmer cannot use admin routes, a buyer cannot use farmer routes', async () => {
  assert.equal((await call('/api/admin/stats', { token: farmerToken })).status, 403);
  assert.equal((await call('/api/fields', { token: buyerToken })).status, 403);
  assert.equal((await call('/api/diary', { token: buyerToken })).status, 403);
  assert.equal((await call('/api/listings/mine', { token: buyerToken })).status, 403);
  assert.equal((await call('/api/listings/saved', { token: farmerToken })).status, 403);
  assert.equal((await call('/api/media', { method: 'POST', token: buyerToken, body: {} })).status, 403);
});

test('deactivated accounts and tokens issued before a password change are rejected', async () => {
  const farmer = [...store.values()].find((u) => u.email === 'asha@example.com');
  farmer.passwordChangedAt = new Date(Date.now() + 5000);
  const stale = await call('/api/auth/me', { token: farmerToken });
  assert.equal(stale.status, 401);
  assert.equal(stale.json.error, 'Session expired');
  farmer.passwordChangedAt = undefined;
  farmer.isActive = false;
  assert.equal((await call('/api/auth/me', { token: farmerToken })).json.error, 'Account unavailable');
  farmer.isActive = true;
});

test('unexpected failures return 500 with the cause outside production, and without it in production', async () => {
  const restore = quiet();
  try {
    createStub.mock.mockImplementationOnce(async () => { throw new Error('boom'); });
    const dev = await call('/api/auth/register', { method: 'POST', body: signup({ email: 'dev@example.com' }) });
    assert.equal(dev.status, 500);
    assert.equal(dev.json.detail, 'boom');
    process.env.NODE_ENV = 'production';
    createStub.mock.mockImplementationOnce(async () => { throw new Error('boom'); });
    const prod = await call('/api/auth/register', { method: 'POST', body: signup({ email: 'prod@example.com' }) });
    assert.equal(prod.status, 500);
    assert.equal(prod.json.detail, undefined);
    assert.equal(prod.json.error, 'Internal server error');
  } finally { delete process.env.NODE_ENV; restore(); }
});
