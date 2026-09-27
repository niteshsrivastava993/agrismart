import { Router } from 'express';
import { z } from 'zod';
import Listing, { CATEGORIES } from '../models/Listing.js';
import SavedListing from '../models/SavedListing.js';
import Inquiry from '../models/Inquiry.js';
import { asyncHandler, protect, requireRole, validate } from '../middleware/index.js';
import { audit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';
import { toPublic } from '../utils/listings.js';

const router = Router();
router.use(protect);
const farmer = requireRole('farmer');
const buyer = requireRole('buyer');

const text = (n) => z.string().trim().max(n).optional();
const base = z.object({
  crop: z.string().trim().min(1).max(60),
  category: z.enum(CATEGORIES),
  quantity: z.number().positive(),
  unit: z.enum(['quintal', 'kg', 'tonne']).default('quintal'),
  pricePerUnit: z.number().positive(),
  state: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  description: text(1000),
  status: z.enum(['active', 'sold', 'closed']),
});
export const createSchema = base.omit({ status: true });
export const updateSchema = base.partial();
export const inquirySchema = z.object({ message: z.string().trim().min(5, 'Write at least 5 characters').max(1000) });
const listQuery = z.object({
  q: text(100),
  category: z.enum(CATEGORIES).optional(),
  state: text(60),
  district: text(60),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCI = (s) => new RegExp(`^${esc(s)}$`, 'i');
const sellerRef = { path: 'seller', select: 'fullName' };
const savedIds = async (user) => new Set((await SavedListing.distinct('listing', { user: user._id })).map(String));

router.get('/', validate(listQuery, 'query'), asyncHandler(async (req, res) => {
  const { q, category, state, district, sort, page, limit } = req.query;
  const filter = { status: 'active' };
  if (category) filter.category = category;
  if (state) filter.state = exactCI(state);
  if (district) filter.district = exactCI(district);
  if (q) { const rx = new RegExp(esc(q), 'i'); filter.$or = [{ crop: rx }, { description: rx }]; }
  const order = { newest: { createdAt: -1 }, price_asc: { pricePerUnit: 1 }, price_desc: { pricePerUnit: -1 } }[sort];
  const [items, total, saved] = await Promise.all([
    Listing.find(filter).sort(order).skip((page - 1) * limit).limit(limit).populate(sellerRef),
    Listing.countDocuments(filter),
    req.user.role === 'buyer' ? savedIds(req.user) : new Set(),
  ]);
  res.json({ listings: items.map((l) => toPublic(l, saved)), total, page });
}));

router.get('/mine', farmer, asyncHandler(async (req, res) => {
  const [listings, counts] = await Promise.all([
    Listing.find({ seller: req.user._id }).sort('-createdAt'),
    Inquiry.aggregate([{ $match: { seller: req.user._id } }, { $group: { _id: '$listing', n: { $sum: 1 } } }]),
  ]);
  const byListing = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({ listings: listings.map((l) => ({ ...l.toJSON(), inquiryCount: byListing.get(String(l._id)) || 0 })) });
}));

router.get('/saved', buyer, asyncHandler(async (req, res) => {
  const rows = await SavedListing.find({ user: req.user._id }).sort('-createdAt').populate({ path: 'listing', populate: sellerRef });
  const saved = new Set(rows.map((r) => String(r.listing?._id)));
  res.json({ listings: rows.filter((r) => r.listing).map((r) => toPublic(r.listing, saved)) });
}));

router.get('/inquiries/received', farmer, asyncHandler(async (req, res) => {
  const inquiries = await Inquiry.find({ seller: req.user._id }).sort('-createdAt').limit(100).populate('listing', 'crop');
  res.json({ inquiries });
}));

router.post('/', farmer, validate(createSchema), asyncHandler(async (req, res) => {
  const listing = await Listing.create({ ...req.body, seller: req.user._id });
  audit(req.user._id, 'listing.create', { listingId: listing._id });
  res.status(201).json({ listing });
}));

router.patch('/:id', farmer, validate(updateSchema), asyncHandler(async (req, res) => {
  const listing = await Listing.findOneAndUpdate({ _id: req.params.id, seller: req.user._id }, req.body, { new: true, runValidators: true });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  audit(req.user._id, 'listing.update', { listingId: listing._id });
  res.json({ listing });
}));

router.delete('/:id', farmer, asyncHandler(async (req, res) => {
  const listing = await Listing.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  await Promise.all([Inquiry.deleteMany({ listing: listing._id }), SavedListing.deleteMany({ listing: listing._id })]);
  audit(req.user._id, 'listing.delete', { listingId: listing._id });
  res.json({ ok: true });
}));

router.put('/:id/save', buyer, asyncHandler(async (req, res) => {
  if (!(await Listing.exists({ _id: req.params.id, status: 'active' }))) return res.status(404).json({ error: 'Listing not found' });
  await SavedListing.updateOne({ user: req.user._id, listing: req.params.id }, { $setOnInsert: { user: req.user._id } }, { upsert: true });
  res.json({ saved: true });
}));

router.delete('/:id/save', buyer, asyncHandler(async (req, res) => {
  await SavedListing.deleteOne({ user: req.user._id, listing: req.params.id });
  res.json({ saved: false });
}));

router.post('/:id/inquiries', buyer, validate(inquirySchema), asyncHandler(async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.id, status: 'active' });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const inquiry = await Inquiry.create({
    listing: listing._id, seller: listing.seller, buyer: req.user._id,
    buyerName: req.user.fullName, buyerMobile: req.user.mobile, message: req.body.message,
  });
  notify(listing.seller, { type: 'system', title: `New inquiry: ${listing.crop}`, message: `${req.user.fullName} sent you a message about your ${listing.crop} listing.` })
    .catch((e) => console.error('notify failed:', e.message));
  audit(req.user._id, 'listing.inquiry', { listingId: listing._id });
  res.status(201).json({ inquiry: { _id: inquiry._id } });
}));

export default router;
