import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { getPrices } from '../services/marketService.js';
import { getTrend, saveSnapshots } from '../services/marketStore.js';
import { audit } from '../utils/audit.js';

const router = Router();
const optional = z.string().trim().min(1).max(100).optional();

const querySchema = z.object({
  commodity: optional,
  state: optional,
  district: optional,
  market: optional,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
const trendSchema = z.object({
  commodity: z.string().trim().min(1).max(100),
  state: optional,
  district: optional,
  market: optional,
  days: z.coerce.number().int().min(2).max(90).default(30),
});

router.get('/prices', protect, validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const result = await getPrices(req.query);
  if (!result.cached) saveSnapshots(result.records).catch((e) => console.error('snapshot save failed:', e.message));
  const { limit: _limit, offset: _offset, ...filters } = req.query;
  audit(req.user._id, 'market.search', { filters });
  res.json(result);
}));

// Trend is built only from prices this app has collected, averaged across the matching markets per arrival date.
router.get('/trend', protect, validate(trendSchema, 'query'), asyncHandler(async (req, res) => {
  const trend = await getTrend(req.query);
  res.json({ ...trend, days: req.query.days, source: 'Government of India — Open Government Data (data.gov.in), as collected by this app' });
}));

export default router;
