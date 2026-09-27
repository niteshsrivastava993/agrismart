import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema(
  {
    isDemo: { type: Boolean, default: false }, // marks records created by seed.js
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    crop: { type: String, required: true, trim: true, index: true },
    areaAcres: { type: Number, required: true, min: 0 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    boundary: { type: [[Number]], default: [] }, // polygon corners as [lat, lon]
    sowingDate: Date,
    expectedHarvestDate: Date,
    soilType: String,
    irrigationType: String,
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export default mongoose.model('Field', fieldSchema);
