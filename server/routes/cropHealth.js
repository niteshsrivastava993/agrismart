import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import CropHealth from '../models/CropHealth.js';
import CropAnalysis from '../models/CropAnalysis.js';
import Field from '../models/Field.js';
import Media from '../models/Media.js';
import SoilReading from '../models/SoilReading.js';
import { asyncHandler, protect, requireRole, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';
import { dropMedia, mediaOwned } from '../utils/media.js';
import { analyzeCropImage } from '../services/cropAnalysisService.js';
import { getCurrentWeather } from '../services/weatherService.js';

const router = Router();
router.use(protect, requireRole('farmer'));

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const text = (n) => z.string().trim().max(n).optional();
export const entrySchema = z.object({
  field: oid,
  date: z.coerce.date(),
  healthScore: z.number().int().min(0).max(100),
  growthStage: text(60),
  issueType: z.enum(['none', 'disease', 'pest', 'nutrient', 'water', 'other']).default('none'),
  observation: text(1000),
  notes: text(1000),
  imageId: oid.nullable().optional(),
});
const listSchema = z.object({
  field: oid.optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
});
const populate = { path: 'field', select: 'name crop' };
const ownsField = (id, owner) => Field.exists({ _id: id, owner });

// --- AI-assisted photo analysis (separate from the manual health log above) ---
export const analyzeSchema = z.object({
  field: oid,
  imageId: oid,
  crop: z.string().trim().min(1).max(80),
  symptoms: text(500),
});
const analysisListSchema = z.object({
  field: oid.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});
const analysisPopulate = { path: 'field', select: 'name crop' };
const analyzeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });

router.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const { field, order, limit, page } = req.query;
  const filter = { owner: req.user._id, ...(field && { field }) };
  const [records, total] = await Promise.all([
    CropHealth.find(filter).sort({ date: order === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).populate(populate),
    CropHealth.countDocuments(filter),
  ]);
  res.json({ records, total, page });
}));

// Newest record for each of the farmer's fields (used for the map indicator).
router.get('/latest', asyncHandler(async (req, res) => {
  const rows = await CropHealth.aggregate([
    { $match: { owner: req.user._id } },
    { $sort: { date: -1 } },
    { $group: { _id: '$field', healthScore: { $first: '$healthScore' }, date: { $first: '$date' }, issueType: { $first: '$issueType' } } },
  ]);
  res.json({ latest: rows.map(({ _id, ...r }) => ({ field: String(_id), ...r })) });
}));

// Analyzes one photo against the vision model via python-ai-service and stores the result.
// Soil/weather context is looked up here (already-real, already-fetched data) and passed through
// as-is; this route never invents context and never asks the AI to guess it.
router.post('/analyze', analyzeLimiter, validate(analyzeSchema), asyncHandler(async (req, res) => {
  const { field, imageId, crop, symptoms } = req.body;
  const fieldDoc = await Field.findOne({ _id: field, owner: req.user._id });
  if (!fieldDoc) return res.status(400).json({ error: 'Field not found' });
  const media = await Media.findOne({ _id: imageId, owner: req.user._id });
  if (!media) return res.status(400).json({ error: 'Image not found' });

  const [soilResult, weatherResult] = await Promise.allSettled([
    SoilReading.findOne({ field, owner: req.user._id }).sort({ recordedAt: -1 }),
    getCurrentWeather({ lat: fieldDoc.latitude, lon: fieldDoc.longitude }),
  ]);
  const context = {};
  if (soilResult.status === 'fulfilled' && soilResult.value) context.soil_moisture_pct = soilResult.value.moisturePct;
  if (weatherResult.status === 'fulfilled') {
    context.weather_condition = weatherResult.value.condition;
    context.weather_temperature_c = weatherResult.value.temperatureC;
  }

  const result = await analyzeCropImage({ imageBase64: media.data.toString('base64'), contentType: media.contentType, crop, symptoms, context });

  const record = await CropAnalysis.create({
    owner: req.user._id,
    field,
    imageId,
    crop,
    symptoms,
    possibleIssue: result.possibleIssue,
    severity: result.severity,
    explanation: result.explanation,
    recommendedActions: result.recommendedActions,
    preventiveMeasures: result.preventiveMeasures,
    whenToSeekHelp: result.whenToSeekHelp,
    contextUsed: {
      soilMoisturePct: context.soil_moisture_pct ?? null,
      weatherCondition: context.weather_condition ?? null,
      weatherTemperatureC: context.weather_temperature_c ?? null,
    },
    model: result.model,
    disclaimer: result.disclaimer,
  });
  audit(req.user._id, 'crop-health.analyze', { recordId: record._id, field });
  res.status(201).json({ record: await record.populate(analysisPopulate) });
}));

router.get('/analyses', validate(analysisListSchema, 'query'), asyncHandler(async (req, res) => {
  const { field, limit, page } = req.query;
  const filter = { owner: req.user._id, ...(field && { field }) };
  const [records, total] = await Promise.all([
    CropAnalysis.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(analysisPopulate),
    CropAnalysis.countDocuments(filter),
  ]);
  res.json({ records, total, page });
}));

router.get('/analyses/:id', asyncHandler(async (req, res) => {
  const record = await CropAnalysis.findOne({ _id: req.params.id, owner: req.user._id }).populate(analysisPopulate);
  if (!record) return res.status(404).json({ error: 'Analysis not found' });
  res.json({ record });
}));

router.delete('/analyses/:id', asyncHandler(async (req, res) => {
  const record = await CropAnalysis.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!record) return res.status(404).json({ error: 'Analysis not found' });
  audit(req.user._id, 'crop-health.analysis-delete', { recordId: record._id });
  res.json({ ok: true });
}));

router.post('/', validate(entrySchema), asyncHandler(async (req, res) => {
  if (!(await ownsField(req.body.field, req.user._id))) return res.status(400).json({ error: 'Field not found' });
  if (!(await mediaOwned(req.body.imageId, req.user._id))) return res.status(400).json({ error: 'Image not found' });
  const record = await CropHealth.create({ ...req.body, owner: req.user._id });
  audit(req.user._id, 'crop-health.create', { recordId: record._id });
  res.status(201).json({ record: await record.populate(populate) });
}));

router.patch('/:id', validate(entrySchema.partial()), asyncHandler(async (req, res) => {
  if (req.body.field && !(await ownsField(req.body.field, req.user._id))) return res.status(400).json({ error: 'Field not found' });
  if (!(await mediaOwned(req.body.imageId, req.user._id))) return res.status(400).json({ error: 'Image not found' });
  const before = await CropHealth.findOne({ _id: req.params.id, owner: req.user._id }).select('imageId');
  if (!before) return res.status(404).json({ error: 'Record not found' });
  const record = await CropHealth.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body, { new: true, runValidators: true }).populate(populate);
  if ('imageId' in req.body && String(before.imageId || '') !== String(req.body.imageId || '')) dropMedia(before.imageId, req.user._id);
  audit(req.user._id, 'crop-health.update', { recordId: record._id });
  res.json({ record });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const record = await CropHealth.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!record) return res.status(404).json({ error: 'Record not found' });
  dropMedia(record.imageId, req.user._id);
  audit(req.user._id, 'crop-health.delete', { recordId: record._id });
  res.json({ ok: true });
}));

export default router;
