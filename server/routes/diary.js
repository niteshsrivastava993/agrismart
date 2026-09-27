import { Router } from 'express';
import { z } from 'zod';
import DiaryEntry from '../models/DiaryEntry.js';
import Field from '../models/Field.js';
import { asyncHandler, protect, requireRole, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';
import { dropMedia, mediaOwned } from '../utils/media.js';

const router = Router();
router.use(protect, requireRole('farmer'));

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const text = (n) => z.string().trim().max(n).optional();
const entrySchema = z.object({
  field: oid,
  date: z.coerce.date(),
  activity: z.string().trim().min(1).max(120),
  crop: text(60),
  irrigation: text(200),
  fertilizer: text(200),
  pesticide: text(200),
  observation: text(1000),
  notes: text(1000),
  imageId: oid.nullable().optional(),
});
const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  field: oid.optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
});

const ownsField = (id, owner) => Field.findOne({ _id: id, owner });
const populate = { path: 'field', select: 'name crop' };

router.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const { q, field, order, limit, page } = req.query;
  const filter = { owner: req.user._id };
  if (field) filter.field = field;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = ['activity', 'crop', 'observation', 'notes'].map((k) => ({ [k]: rx }));
  }
  const [entries, total] = await Promise.all([
    DiaryEntry.find(filter).sort({ date: order === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).populate(populate),
    DiaryEntry.countDocuments(filter),
  ]);
  res.json({ entries, total, page });
}));

router.post('/', validate(entrySchema), asyncHandler(async (req, res) => {
  const field = await ownsField(req.body.field, req.user._id);
  if (!field) return res.status(400).json({ error: 'Field not found' });
  if (!(await mediaOwned(req.body.imageId, req.user._id))) return res.status(400).json({ error: 'Image not found' });
  const entry = await DiaryEntry.create({ ...req.body, crop: req.body.crop || field.crop, owner: req.user._id });
  audit(req.user._id, 'diary.create', { entryId: entry._id });
  res.status(201).json({ entry: await entry.populate(populate) });
}));

router.patch('/:id', validate(entrySchema.partial()), asyncHandler(async (req, res) => {
  if (req.body.field && !(await ownsField(req.body.field, req.user._id))) return res.status(400).json({ error: 'Field not found' });
  if (!(await mediaOwned(req.body.imageId, req.user._id))) return res.status(400).json({ error: 'Image not found' });
  const before = await DiaryEntry.findOne({ _id: req.params.id, owner: req.user._id }).select('imageId');
  if (!before) return res.status(404).json({ error: 'Entry not found' });
  const entry = await DiaryEntry.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body, { new: true, runValidators: true }).populate(populate);
  if ('imageId' in req.body && String(before.imageId || '') !== String(req.body.imageId || '')) dropMedia(before.imageId, req.user._id);
  audit(req.user._id, 'diary.update', { entryId: entry._id });
  res.json({ entry });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const entry = await DiaryEntry.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  dropMedia(entry.imageId, req.user._id);
  audit(req.user._id, 'diary.delete', { entryId: entry._id });
  res.json({ ok: true });
}));

export default router;
