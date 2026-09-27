import { Router } from 'express';
import { z } from 'zod';
import SoilReading from '../models/SoilReading.js';
import Field from '../models/Field.js';
import { asyncHandler, protect, requireRole, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.use(protect, requireRole('farmer'));

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const opt = (min, max) => z.number().min(min).max(max).nullable().optional();
export const readingSchema = z.object({
  field: oid,
  recordedAt: z.coerce.date().refine((d) => d.getTime() <= Date.now() + 864e5, 'Date cannot be in the future'),
  moisturePct: z.number().min(0).max(100),
  ph: opt(0, 14),
  temperatureC: opt(-10, 70),
  notes: z.string().trim().max(500).optional(),
});
const listSchema = z.object({
  field: oid.optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const populate = { path: 'field', select: 'name crop' };
const ownsField = (id, owner) => Field.exists({ _id: id, owner });

// Newest reading for each of the farmer's fields.
router.get('/latest', asyncHandler(async (req, res) => {
  const rows = await SoilReading.aggregate([
    { $match: { owner: req.user._id } },
    { $sort: { recordedAt: -1 } },
    { $group: { _id: '$field', moisturePct: { $first: '$moisturePct' }, ph: { $first: '$ph' }, recordedAt: { $first: '$recordedAt' } } },
  ]);
  res.json({ latest: rows.map(({ _id, ...r }) => ({ field: String(_id), ...r })) });
}));

router.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const { field, order, limit } = req.query;
  const readings = await SoilReading.find({ owner: req.user._id, ...(field && { field }) })
    .sort({ recordedAt: order === 'asc' ? 1 : -1 }).limit(limit).populate(populate);
  res.json({ readings });
}));

router.post('/', validate(readingSchema), asyncHandler(async (req, res) => {
  if (!(await ownsField(req.body.field, req.user._id))) return res.status(400).json({ error: 'Field not found' });
  const reading = await SoilReading.create({ ...req.body, owner: req.user._id });
  audit(req.user._id, 'soil.create', { readingId: reading._id });
  res.status(201).json({ reading: await reading.populate(populate) });
}));

router.patch('/:id', validate(readingSchema.partial()), asyncHandler(async (req, res) => {
  if (req.body.field && !(await ownsField(req.body.field, req.user._id))) return res.status(400).json({ error: 'Field not found' });
  const reading = await SoilReading.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body, { new: true, runValidators: true }).populate(populate);
  if (!reading) return res.status(404).json({ error: 'Reading not found' });
  audit(req.user._id, 'soil.update', { readingId: reading._id });
  res.json({ reading });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const reading = await SoilReading.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!reading) return res.status(404).json({ error: 'Reading not found' });
  audit(req.user._id, 'soil.delete', { readingId: reading._id });
  res.json({ ok: true });
}));

export default router;
