import 'dotenv/config';
import mongoose from 'mongoose';
import Media from '../models/Media.js';
import DiaryEntry from '../models/DiaryEntry.js';
import CropHealth from '../models/CropHealth.js';

if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is required.'); process.exit(1); }
await mongoose.connect(process.env.MONGODB_URI);
// Images uploaded but never saved into a diary entry or health record, older than 24 hours.
const [d, c] = await Promise.all([DiaryEntry.distinct('imageId', { imageId: { $ne: null } }), CropHealth.distinct('imageId', { imageId: { $ne: null } })]);
const r = await Media.deleteMany({ createdAt: { $lt: new Date(Date.now() - 24 * 3600e3) }, _id: { $nin: [...d, ...c] } });
console.log(`Removed ${r.deletedCount} unused images.`);
await mongoose.disconnect();
