import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { getCurrentWeather, getForecast } from '../services/weatherService.js';
import { audit } from '../utils/audit.js';

const router = Router();

const querySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    q: z.string().trim().min(2).max(100).optional(),
  })
  .refine((d) => d.q || (d.lat !== undefined && d.lon !== undefined), { message: 'Provide q, or both lat and lon' });

router.get('/current', protect, validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const result = await getCurrentWeather(req.query);
  audit(req.user._id, 'weather.request', { q: req.query.q, lat: req.query.lat, lon: req.query.lon });
  res.json(result);
}));

router.get('/forecast', protect, validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const result = await getForecast(req.query);
  audit(req.user._id, 'weather.request', { kind: 'forecast', q: req.query.q, lat: req.query.lat, lon: req.query.lon });
  res.json(result);
}));

export default router;
