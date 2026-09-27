import express, { Router } from 'express';
import Media from '../models/Media.js';
import DiaryEntry from '../models/DiaryEntry.js';
import CropHealth from '../models/CropHealth.js';
import { asyncHandler, protect, requireRole } from '../middleware/index.js';
import { sniffImage } from '../utils/media.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.use(protect);

const MAX_PER_USER = 200;
const rawImage = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' });

// The client sends the image bytes directly (Content-Type: image/jpeg|png|webp), max 2 MB.
router.post('/', requireRole('farmer'), rawImage, asyncHandler(async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) return res.status(415).json({ error: 'Upload a JPEG, PNG or WebP image.' });
  const declared = String(req.headers['content-type']).split(';')[0].trim();
  const actual = sniffImage(buf);
  if (!actual || actual !== declared) return res.status(415).json({ error: 'File content does not match an allowed image type.' });
  if ((await Media.countDocuments({ owner: req.user._id })) >= MAX_PER_USER) return res.status(400).json({ error: 'Image limit reached. Delete old images first.' });
  const media = await Media.create({ owner: req.user._id, contentType: actual, size: buf.length, data: buf });
  audit(req.user._id, 'media.upload', { mediaId: media._id, size: buf.length });
  res.status(201).json({ id: media._id });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const media = await Media.findOne({ _id: req.params.id, owner: req.user._id });
  if (!media) return res.status(404).json({ error: 'Image not found' });
  res.set({
    'Content-Type': media.contentType,
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
    'Content-Disposition': 'inline',
  }).send(media.data);
}));

router.delete('/:id', requireRole('farmer'), asyncHandler(async (req, res) => {
  const media = await Media.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!media) return res.status(404).json({ error: 'Image not found' });
  await Promise.all([
    DiaryEntry.updateMany({ owner: req.user._id, imageId: media._id }, { imageId: null }),
    CropHealth.updateMany({ owner: req.user._id, imageId: media._id }, { imageId: null }),
  ]);
  res.json({ ok: true });
}));

export default router;
