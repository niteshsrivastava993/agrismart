import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.JWT_SECRET = 'smoke-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
delete process.env.RESEND_API_KEY;
const { createApp } = await import('../app.js');

let server, port;
before(() => new Promise((resolve) => { server = createApp().listen(0, () => { port = server.address().port; resolve(); }); }));
after(() => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); }));

// Plain http client so we can send an Origin header and raw bodies.
function call(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({ port, path, method, agent: false, headers: { ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}), ...headers } }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => { let json = null; try { json = JSON.parse(raw); } catch { /* not json */ } resolve({ status: res.statusCode, headers: res.headers, json }); });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('health endpoint works without a database and sends security headers', async () => {
  const r = await call('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.database, 'unavailable');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-powered-by'], undefined);
  assert.ok(r.headers['ratelimit-limit']);
});

test('unknown routes return a JSON 404', async () => {
  const r = await call('/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.json.error, 'Not found');
});

test('every protected route is mounted and rejects requests without a token', async () => {
  const routes = [
    ['GET', '/api/auth/me'], ['POST', '/api/media'], ['GET', '/api/soil'], ['GET', '/api/soil/latest'], ['GET', '/api/crop-health/latest'], ['GET', '/api/media/507f1f77bcf86cd799439011'], ['GET', '/api/fields'], ['GET', '/api/diary'], ['GET', '/api/crop-health'],
    ['GET', '/api/notifications'], ['GET', '/api/listings'], ['GET', '/api/assistant/status'], ['POST', '/api/assistant/chat'],
    ['GET', '/api/search?q=wheat'], ['PATCH', '/api/users/me'], ['GET', '/api/admin/stats'],
    ['GET', '/api/market/prices'], ['GET', '/api/market/trend?commodity=Wheat'], ['GET', '/api/weather/current?q=Lucknow'], ['GET', '/api/weather/forecast?q=Lucknow'],
  ];
  for (const [method, path] of routes) {
    const r = await call(path, { method, body: method === 'GET' ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${path}`);
    assert.equal(r.json.error, 'Authentication required', `${method} ${path}`);
  }
});

test('a forged token is rejected', async () => {
  const r = await call('/api/fields', { headers: { authorization: 'Bearer not.a.jwt' } });
  assert.equal(r.status, 401);
  assert.equal(r.json.error, 'Invalid token');
});

test('registration and login validate input before touching the database', async () => {
  const reg = await call('/api/auth/register', { method: 'POST', body: {} });
  assert.equal(reg.status, 400);
  assert.ok(reg.json.details.some((d) => d.path === 'email'));
  const login = await call('/api/auth/login', { method: 'POST', body: { email: 'nope', password: 'x' } });
  assert.equal(login.status, 400);
});

test('operator objects in login fields are rejected (NoSQL injection)', async () => {
  const r = await call('/api/auth/login', { method: 'POST', body: { email: { $ne: null }, password: { $ne: null } } });
  assert.equal(r.status, 400);
});

test('malformed JSON and oversized bodies are rejected', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: '{bad json' })).status, 400);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: 'a@b.in', password: 'x'.repeat(200 * 1024) } })).status, 413);
});

test('forgot-password says so plainly when email is not configured', async () => {
  const r = await call('/api/auth/forgot-password', { method: 'POST', body: { email: 'a@b.in' } });
  assert.equal(r.status, 503);
  assert.match(r.json.error, /not configured/);
});

test('CORS allows the configured origin only', async () => {
  const ok = await call('/api/health', { headers: { origin: 'http://localhost:5173' } });
  assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
  const bad = await call('/api/health', { headers: { origin: 'https://evil.example' } });
  assert.equal(bad.headers['access-control-allow-origin'], undefined);
});
