import { Router } from 'express';
import { z } from 'zod';
import Notification from '../models/Notification.js';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { syncHarvestReminders } from '../utils/notify.js';

const router = Router();
router.use(protect);

const listSchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const mine = (req) => ({ user: req.user._id, dismissed: false });

router.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  if (req.user.role === 'farmer') {
    await syncHarvestReminders(req.user._id).catch((e) => console.error('reminder sync failed:', e.message));
  }
  const filter = { ...mine(req), ...(req.query.unread === 'true' && { read: false }) };
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort('-createdAt').limit(req.query.limit),
    Notification.countDocuments({ ...mine(req), read: false }),
  ]);
  res.json({ notifications, unreadCount });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ ...mine(req), read: false }, { read: true });
  res.json({ updated: r.modifiedCount });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, ...mine(req) }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json({ notification: n });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, ...mine(req) }, { dismissed: true });
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json({ ok: true });
}));

export default router;
