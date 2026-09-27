import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env');
  process.exit(1);
}
await mongoose.connect(MONGODB_URI);
await User.create({
  fullName: 'AgriSmart Admin', email: ADMIN_EMAIL, mobile: '9000000000', role: 'admin',
  state: 'NA', district: 'NA', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
});
console.log(`Admin created: ${ADMIN_EMAIL}`);
await mongoose.disconnect();
