import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { signToken, strongPassword } from './auth.js';
import { audit } from '../utils/audit.js';
import { dropMedia, mediaOwned } from '../utils/media.js';

const router = Router();
router.use(protect);

// Role and email are deliberately absent, so they cannot be changed here.
export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    state: z.string().trim().min(2).max(60),
    district: z.string().trim().min(2).max(60),
    language: z.enum(['en', 'hi']),
    avatarId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id').nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const passwordSchema = z
  .object({ currentPassword: z.string().min(1, 'Required'), newPassword: strongPassword, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'Choose a different password' });

router.patch('/me', validate(profileSchema), asyncHandler(async (req, res) => {
  if (!(await mediaOwned(req.body.avatarId, req.user._id))) return res.status(400).json({ error: 'Image not found' });
  const before = await User.findById(req.user._id).select('avatarId');
  const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true });
  if ('avatarId' in req.body && String(before.avatarId || '') !== String(req.body.avatarId || '')) dropMedia(before.avatarId, req.user._id);
  audit(user._id, 'profile.update', { fields: Object.keys(req.body) });
  res.json({ user });
}));

router.post('/me/password', validate(passwordSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: 'Validation failed', details: [{ path: 'currentPassword', message: 'Incorrect password' }] });
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  audit(user._id, 'auth.password_change');
  res.json({ ok: true, token: signToken(user) }); // other sessions are signed out; this one continues
}));

export default router;
