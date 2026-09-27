import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';
import Field from './models/Field.js';
import DiaryEntry from './models/DiaryEntry.js';
import CropHealth from './models/CropHealth.js';
import SoilReading from './models/SoilReading.js';
import Listing from './models/Listing.js';
import Inquiry from './models/Inquiry.js';
import SavedListing from './models/SavedListing.js';
import Notification from './models/Notification.js';
import AuditLog from './models/AuditLog.js';
import { demoDiary, demoFields, demoHealth, demoListings, demoSoil } from './utils/demoData.js';

const { MONGODB_URI, NODE_ENV, SEED_PASSWORD = 'Demo@12345' } = process.env;
const args = new Set(process.argv.slice(2));

if (!MONGODB_URI) { console.error('MONGODB_URI is required. Copy .env.example to .env.'); process.exit(1); }
if (NODE_ENV === 'production' && !args.has('--force')) { console.error('Refusing to seed demo data with NODE_ENV=production. Use --force to override.'); process.exit(1); }
if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(SEED_PASSWORD)) { console.error('SEED_PASSWORD needs 8+ characters with upper, lower and a digit.'); process.exit(1); }

await mongoose.connect(MONGODB_URI);

// Remove previous demo data (including anything the demo users created since).
const oldIds = (await User.find({ isDemo: true }).select('_id')).map((u) => u._id);
await Promise.all([
  Field.deleteMany({ $or: [{ owner: { $in: oldIds } }, { isDemo: true }] }),
  DiaryEntry.deleteMany({ $or: [{ owner: { $in: oldIds } }, { isDemo: true }] }),
  CropHealth.deleteMany({ $or: [{ owner: { $in: oldIds } }, { isDemo: true }] }),
  SoilReading.deleteMany({ $or: [{ owner: { $in: oldIds } }, { isDemo: true }] }),
  Listing.deleteMany({ $or: [{ seller: { $in: oldIds } }, { isDemo: true }] }),
  Inquiry.deleteMany({ $or: [{ seller: { $in: oldIds } }, { buyer: { $in: oldIds } }] }),
  SavedListing.deleteMany({ user: { $in: oldIds } }),
  Notification.deleteMany({ user: { $in: oldIds } }),
  AuditLog.deleteMany({ user: { $in: oldIds } }),
]);
await User.deleteMany({ isDemo: true });

if (args.has('--clean')) {
  console.log(`Removed demo data (${oldIds.length} demo users).`);
  await mongoose.disconnect();
  process.exit(0);
}

const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
const base = { passwordHash, isDemo: true, language: 'en' };
const [admin, farmer, buyer] = await User.create([
  { ...base, fullName: 'Demo Admin', email: 'admin@agrismart.demo', mobile: '9000000001', role: 'admin', state: 'Uttar Pradesh', district: 'Lucknow' },
  { ...base, fullName: 'Demo Farmer', email: 'farmer@agrismart.demo', mobile: '9000000002', role: 'farmer', state: 'Uttar Pradesh', district: 'Lucknow' },
  { ...base, fullName: 'Demo Buyer', email: 'buyer@agrismart.demo', mobile: '9000000003', role: 'buyer', state: 'Uttar Pradesh', district: 'Kanpur Nagar' },
]);

const now = new Date();
const fields = await Field.create(demoFields(now).map((f) => ({ ...f, owner: farmer._id, isDemo: true })));
const ids = fields.map((f) => f._id);
await DiaryEntry.create(demoDiary(now, ids).map((e) => ({ ...e, owner: farmer._id, isDemo: true })));
await CropHealth.create(demoHealth(now, ids[0]).map((r) => ({ ...r, owner: farmer._id, isDemo: true })));

await SoilReading.create(demoSoil(now, ids[0]).map((r) => ({ ...r, owner: farmer._id, isDemo: true })));
await Listing.create(demoListings().map((l) => ({ ...l, seller: farmer._id, isDemo: true })));

console.log('Demo data created. Sign in with:');
for (const u of [admin, farmer, buyer]) console.log(`  ${u.role.padEnd(6)} ${u.email}  /  ${SEED_PASSWORD}`);
console.log('Market prices and weather are not seeded; they require live API credentials.');
await mongoose.disconnect();
