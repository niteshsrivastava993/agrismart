import { Router } from 'express';
import { z } from 'zod';
import Field from '../models/Field.js';
import DiaryEntry from '../models/DiaryEntry.js';
import Listing from '../models/Listing.js';
import MarketPrice from '../models/MarketPrice.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler, protect, validate } from '../middleware/index.js';
import { escapeRegex } from '../utils/regex.js';
import { mapCrop, mapDiary, mapField, mapListing, mapMarket, mapNotification, mapUser, marketAction } from '../utils/search.js';

const router = Router();
router.use(protect);

export const searchSchema = z.object({ q: z.string().trim().min(2, 'Type at least 2 characters').max(100) });
const anyOf = (rx, keys) => ({ $or: keys.map((k) => ({ [k]: rx })) });

// Every query is scoped to what the signed-in role is allowed to see.
router.get('/', validate(searchSchema, 'query'), asyncHandler(async (req, res) => {
  const { q } = req.query;
  const rx = new RegExp(escapeRegex(q), 'i');
  const u = req.user;
  const tasks = [
    Notification.find({ user: u._id, dismissed: false, ...anyOf(rx, ['title', 'message']) }).sort('-createdAt').limit(5).then((r) => r.map(mapNotification)),
    MarketPrice.aggregate([
      { $match: { commodity: rx } },
      { $group: { _id: '$commodity', markets: { $addToSet: '$market' }, latest: { $max: '$arrivalDate' } } },
      { $sort: { latest: -1 } }, { $limit: 5 },
    ]).then((r) => r.map(mapMarket)),
  ];
  if (u.role === 'farmer') {
    tasks.push(
      Field.find({ owner: u._id, ...anyOf(rx, ['name', 'crop', 'soilType', 'notes']) }).limit(5).then((r) => r.map(mapField)),
      Field.aggregate([{ $match: { owner: u._id, crop: rx } }, { $group: { _id: '$crop', count: { $sum: 1 } } }, { $limit: 5 }]).then((r) => r.map(mapCrop)),
      DiaryEntry.find({ owner: u._id, ...anyOf(rx, ['activity', 'crop', 'observation', 'notes']) }).sort('-date').limit(5).populate('field', 'name').then((r) => r.map(mapDiary)),
      Listing.find({ seller: u._id, ...anyOf(rx, ['crop', 'description']) }).limit(5).then((r) => r.map((l) => mapListing(l, true)))
    );
  } else if (u.role === 'buyer') {
    tasks.push(Listing.find({ status: 'active', ...anyOf(rx, ['crop', 'description']) }).limit(5).then((r) => r.map((l) => mapListing(l, false))));
  } else if (u.role === 'admin') {
    tasks.push(User.find(anyOf(rx, ['fullName', 'email'])).limit(5).then((r) => r.map(mapUser)));
  }
  const results = (await Promise.all(tasks)).flat();
  results.push(marketAction(q));
  res.json({ query: q, results });
}));

export default router;
