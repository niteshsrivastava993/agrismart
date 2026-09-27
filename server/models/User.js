import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    isDemo: { type: Boolean, default: false }, // marks records created by seed.js
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true, index: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    avatarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date, // tokens issued before this are rejected
  },
  {
    timestamps: true,
    toJSON: { transform: (_, o) => { delete o.passwordHash; delete o.__v; return o; } },
  }
);

export default mongoose.model('User', userSchema);
