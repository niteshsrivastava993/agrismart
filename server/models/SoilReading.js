import mongoose from 'mongoose';

// Readings entered by the farmer from their own measurements. No sensor integration is implied.
const soilSchema = new mongoose.Schema(
  {
    isDemo: { type: Boolean, default: false }, // marks records created by seed.js
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
    recordedAt: { type: Date, required: true },
    moisturePct: { type: Number, required: true, min: 0, max: 100 },
    ph: { type: Number, min: 0, max: 14, default: null },
    temperatureC: { type: Number, min: -10, max: 70, default: null },
    notes: String,
  },
  { timestamps: true }
);
soilSchema.index({ owner: 1, field: 1, recordedAt: -1 });
soilSchema.index({ owner: 1, recordedAt: -1 });

export default mongoose.model('SoilReading', soilSchema);
