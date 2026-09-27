const API_URL = 'https://api.resend.com/emails';

export const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const appUrl = () =>
  (process.env.APP_URL || (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, '');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function buildResetEmail({ name, link }) {
  return {
    subject: 'Reset your AgriSmart password',
    text: `Hi ${name},\n\nUse this link to set a new AgriSmart password. It expires in 1 hour and works once:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<p>Hi ${esc(name)},</p><p>Use the button below to set a new AgriSmart password. The link expires in 1 hour and works once.</p>` +
      `<p><a href="${esc(link)}" style="display:inline-block;padding:10px 18px;background:#D9A441;color:#111310;border-radius:8px;text-decoration:none">Reset password</a></p>` +
      `<p>If the button doesn't work, copy this link:<br>${esc(link)}</p><p>If you didn't ask for this, you can ignore this email.</p>`,
  };
}

// Sends through Resend. The API key is only ever used in the Authorization header.
export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) throw Object.assign(new Error('Email is not configured.'), { status: 503 });
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
    });
  } catch (e) {
    console.error('email request failed:', e.message);
    throw Object.assign(new Error('Email service is temporarily unavailable.'), { status: 502 });
  }
  if (!res.ok) {
    console.error('email upstream status:', res.status);
    throw Object.assign(new Error('Email service is temporarily unavailable.'), { status: 502 });
  }
  return res.json().catch(() => ({}));
}
