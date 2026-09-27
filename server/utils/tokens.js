import crypto from 'node:crypto';

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export function newResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}
