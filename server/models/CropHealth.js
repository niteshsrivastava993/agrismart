import mongoose from 'mongoose';

const cropHealthSchema = new mongoose.Schema(
  {
    isDemo: { type: Boolean, default: false }, // marks records created by seed.js
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
    date: { type: Date, required: true },
    healthScore: { type: Number, required: true, min: 0, max: 100 }, // recorded by the farmer, not computed
    growthStage: String,
    issueType: { type: String, enum: ['none', 'disease', 'pest', 'nutrient', 'water', 'other'], default: 'none' },
    observation: String,
    notes: String,
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
  },
  { timestamps: true }
);
cropHealthSchema.index({ owner: 1, date: -1 });
cropHealthSchema.index({ owner: 1, field: 1, date: -1 });

export default mongoose.model('CropHealth', cropHealthSchema);
