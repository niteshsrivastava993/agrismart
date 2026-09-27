import mongoose from 'mongoose';

export const CATEGORIES = ['grains', 'vegetables', 'fruits', 'pulses', 'oilseeds', 'spices', 'other'];

const listingSchema = new mongoose.Schema(
  {
    isDemo: { type: Boolean, default: false }, // marks records created by seed.js
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    crop: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['quintal', 'kg', 'tonne'], default: 'quintal' },
    pricePerUnit: { type: Number, required: true, min: 0 },
    state: { type: String, required: true },
    district: { type: String, required: true },
    description: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['active', 'sold', 'closed'], default: 'active' },
  },
  { timestamps: true }
);
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ status: 1, category: 1, state: 1 });

export default mongoose.model('Listing', listingSchema);
