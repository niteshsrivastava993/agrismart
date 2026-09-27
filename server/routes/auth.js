import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';
import PasswordReset from '../models/PasswordReset.js';
import { appUrl, buildResetEmail, isEmailConfigured, sendEmail } from '../services/emailService.js';
import { hashToken, newResetToken } from '../utils/tokens.js';

const router = Router();

export const strongPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72)
  .regex(/[a-z]/, 'Needs a lowercase letter')
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/\d/, 'Needs a number');

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    password: strongPassword,
    confirmPassword: z.string(),
    role: z.enum(['farmer', 'buyer']), // admin accounts are never self-registered
    state: z.string().trim().min(2).max(60),
    district: z.string().trim().min(2).max(60),
    language: z.enum(['en', 'hi']).default('en'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const resetSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid reset link'), password: strongPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export const signToken = (user) =>
  jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { password, confirmPassword: _confirmPassword, ...profile } = req.body;
  const user = await User.create({ ...profile, passwordHash: await bcrypt.hash(password, 12) });
  audit(user._id, 'auth.register', { role: user.role });
  notify(user._id, { type: 'system', title: 'Welcome to AgriSmart', message: 'Your account is ready.', dedupeKey: 'welcome' }).catch((e) => console.error('notify failed:', e.message));
  res.status(201).json({ token: signToken(user), user });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
  user.lastLoginAt = new Date();
  await user.save();
  audit(user._id, 'auth.login');
  res.json({ token: signToken(user), user });
}));

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

router.post('/logout', protect, (req, res) => {
  audit(req.user._id, 'auth.logout');
  res.json({ ok: true }); // client discards the token
});

const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const INVALID_LINK = 'This reset link is invalid or has expired.';

// Always answers the same way for known and unknown emails so accounts cannot be discovered.
router.post('/forgot-password', forgotLimiter, validate(forgotSchema), asyncHandler(async (req, res) => {
  if (!isEmailConfigured()) return res.status(503).json({ error: 'Password reset email is not configured on this server.' });
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (user) {
    const { token, tokenHash } = newResetToken();
    await PasswordReset.deleteMany({ user: user._id });
    await PasswordReset.create({ user: user._id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    sendEmail({ to: user.email, ...buildResetEmail({ name: user.fullName, link: `${appUrl()}/reset-password?token=${token}` }) })
      .catch((e) => console.error('reset email failed:', e.message));
    audit(user._id, 'auth.password_reset_requested');
  }
  res.json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' });
}));

router.post('/reset-password', validate(resetSchema), asyncHandler(async (req, res) => {
  const record = await PasswordReset.findOne({ tokenHash: hashToken(req.body.token), expiresAt: { $gt: new Date() } });
  if (!record) return res.status(400).json({ error: INVALID_LINK });
  const user = await User.findById(record.user).select('+passwordHash');
  if (!user || !user.isActive) { await record.deleteOne(); return res.status(400).json({ error: INVALID_LINK }); }
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  await PasswordReset.deleteMany({ user: user._id });
  audit(user._id, 'auth.password_reset');
  res.json({ ok: true });
}));

export default router;
