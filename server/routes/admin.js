import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import Field from '../models/Field.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler, protect, requireRole, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.use(protect, requireRole('admin'));

router.get('/stats', asyncHandler(async (req, res) => {
  const [byRole, active, fields, marketSearches, weatherRequests] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: true }),
    Field.countDocuments(),
    AuditLog.countDocuments({ action: 'market.search' }),
    AuditLog.countDocuments({ action: 'weather.request' }),
  ]);
  const roles = Object.fromEntries(byRole.map((r) => [r._id, r.count]));
  res.json({
    users: { total: byRole.reduce((n, r) => n + r.count, 0), farmers: roles.farmer || 0, buyers: roles.buyer || 0, admins: roles.admin || 0, active },
    fields,
    marketSearches,
    weatherRequests,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable',
    weatherApiConfigured: Boolean(process.env.OPENWEATHER_API_KEY),
    marketApiConfigured: Boolean(process.env.DATA_GOV_API_KEY),
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    assistantConfigured: Boolean(process.env.AI_API_KEY),
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const [users, total] = await Promise.all([
    User.find().sort('-createdAt').skip((page - 1) * 25).limit(25),
    User.countDocuments(),
  ]);
  res.json({ users, total, page });
}));

router.patch('/users/:id/active', validate(z.object({ isActive: z.boolean() })), asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) return res.status(400).json({ error: 'You cannot deactivate your own account' });
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  audit(req.user._id, req.body.isActive ? 'admin.user.activate' : 'admin.user.deactivate', { userId: user._id });
  res.json({ user });
}));

router.get('/audit', asyncHandler(async (req, res) => {
  res.json({ logs: await AuditLog.find().sort('-createdAt').limit(100).populate('user', 'fullName email role') });
}));

export default router;
