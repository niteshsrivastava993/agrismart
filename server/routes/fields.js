import { Router } from 'express';
import { z } from 'zod';
import Field from '../models/Field.js';
import { asyncHandler, protect, requireRole, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.use(protect, requireRole('farmer'));

export const boundarySchema = z
  .array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
  .max(200)
  .refine((a) => a.length === 0 || a.length >= 3, 'A boundary needs at least 3 points (or none to clear it)');

export const fieldSchema = z.object({
  name: z.string().trim().min(1).max(100),
  crop: z.string().trim().min(1).max(60),
  areaAcres: z.number().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  boundary: boundarySchema.optional(),
  sowingDate: z.coerce.date().optional(),
  expectedHarvestDate: z.coerce.date().optional(),
  soilType: z.string().trim().max(60).optional(),
  irrigationType: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  res.json({ fields: await Field.find({ owner: req.user._id }).sort('-createdAt') });
}));

router.post('/', validate(fieldSchema), asyncHandler(async (req, res) => {
  const field = await Field.create({ ...req.body, owner: req.user._id });
  audit(req.user._id, 'field.create', { fieldId: field._id });
  res.status(201).json({ field });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const field = await Field.findOne({ _id: req.params.id, owner: req.user._id });
  if (!field) return res.status(404).json({ error: 'Field not found' });
  res.json({ field });
}));

router.patch('/:id', validate(fieldSchema.partial()), asyncHandler(async (req, res) => {
  const field = await Field.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!field) return res.status(404).json({ error: 'Field not found' });
  audit(req.user._id, 'field.update', { fieldId: field._id });
  res.json({ field });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const field = await Field.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!field) return res.status(404).json({ error: 'Field not found' });
  audit(req.user._id, 'field.delete', { fieldId: field._id });
  res.json({ ok: true });
}));

export default router;
