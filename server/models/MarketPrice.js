import mongoose from 'mongoose';

// Daily price snapshots collected from data.gov.in by this app. History starts when a record is first fetched.
const marketPriceSchema = new mongoose.Schema(
  {
    commodity: { type: String, required: true },
    variety: { type: String, default: null },
    state: String,
    district: String,
    market: String,
    arrivalDate: { type: Date, required: true },
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },
    modalPrice: { type: Number, default: null },
    unit: { type: String, default: 'quintal' },
    source: String,
    fetchedAt: Date,
  },
  { timestamps: true }
);
marketPriceSchema.index({ commodity: 1, state: 1, district: 1, market: 1, variety: 1, arrivalDate: 1 }, { unique: true });
marketPriceSchema.index({ commodity: 1, arrivalDate: -1 });

export default mongoose.model('MarketPrice', marketPriceSchema);
