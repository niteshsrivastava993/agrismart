import test from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, buildResetEmail, isEmailConfigured, sendEmail } from '../services/emailService.js';

const quiet = () => { const o = console.error; console.error = () => {}; return () => { console.error = o; }; };
const mail = { to: 'a@b.in', subject: 'S', html: '<p>x</p>', text: 'x' };

test('reset email contains the link and escapes the name in HTML', () => {
  const m = buildResetEmail({ name: '<script>alert(1)</script>', link: 'https://app.test/reset-password?token=abc' });
  assert.ok(m.text.includes('https://app.test/reset-password?token=abc'));
  assert.ok(m.html.includes('token=abc'));
  assert.ok(!m.html.includes('<script>'));
  assert.match(m.subject, /Reset/);
});

test('email is considered configured only with both key and sender', () => {
  delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
  assert.equal(isEmailConfigured(), false);
  process.env.RESEND_API_KEY = 're_test'; assert.equal(isEmailConfigured(), false);
  process.env.EMAIL_FROM = 'AgriSmart <noreply@example.com>'; assert.equal(isEmailConfigured(), true);
});

test('sendEmail refuses when not configured', async () => {
  delete process.env.RESEND_API_KEY;
  await assert.rejects(sendEmail(mail), (e) => e.status === 503);
});

test('sendEmail posts to Resend with bearer auth and the expected body', async () => {
  process.env.RESEND_API_KEY = 're_secret_123'; process.env.EMAIL_FROM = 'AgriSmart <noreply@example.com>';
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ id: 'e1' }) }; };
  const out = await sendEmail(mail);
  assert.equal(out.id, 'e1');
  assert.equal(seen.url, 'https://api.resend.com/emails');
  assert.equal(seen.init.headers.Authorization, 'Bearer re_secret_123');
  const body = JSON.parse(seen.init.body);
  assert.deepEqual(body.to, ['a@b.in']);
  assert.equal(body.from, 'AgriSmart <noreply@example.com>');
  assert.ok(!seen.init.body.includes('re_secret_123'));
});

test('sendEmail reports failures as 502 without leaking the key', async () => {
  process.env.RESEND_API_KEY = 're_secret_123'; process.env.EMAIL_FROM = 'x@example.com';
  const restore = quiet();
  try {
    globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({}) });
    await assert.rejects(sendEmail(mail), (e) => e.status === 502 && !e.message.includes('re_secret'));
    globalThis.fetch = async () => { throw new Error('network down'); };
    await assert.rejects(sendEmail(mail), (e) => e.status === 502);
  } finally { restore(); }
});

test('appUrl prefers APP_URL, then the first CLIENT_ORIGIN, without a trailing slash', () => {
  process.env.APP_URL = 'https://agrismart.example/'; assert.equal(appUrl(), 'https://agrismart.example');
  delete process.env.APP_URL; process.env.CLIENT_ORIGIN = 'https://a.example, https://b.example'; assert.equal(appUrl(), 'https://a.example');
});
