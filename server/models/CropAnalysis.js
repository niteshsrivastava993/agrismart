import mongoose from 'mongoose';

// AI-generated crop photo analysis. Kept separate from CropHealth, which is the farmer's own
// manually-recorded health score — this model never feeds a number into that score, and the
// manual log is unaffected by this feature.
const cropAnalysisSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true },
    crop: { type: String, required: true, trim: true },
    symptoms: { type: String, trim: true, maxlength: 500 },
    possibleIssue: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['low', 'moderate', 'high', 'unknown'], default: 'unknown' },
    explanation: { type: String, required: true },
    recommendedActions: { type: [String], default: [] },
    preventiveMeasures: { type: [String], default: [] },
    whenToSeekHelp: { type: String, default: '' },
    // Only ever populated from data Express already fetched (soil readings, weather) — never invented.
    contextUsed: {
      soilMoisturePct: { type: Number, default: null },
      weatherCondition: { type: String, default: null },
      weatherTemperatureC: { type: Number, default: null },
    },
    model: { type: String, required: true }, // which AI model produced this, shown for transparency
    disclaimer: { type: String, required: true },
  },
  { timestamps: true }
);
cropAnalysisSchema.index({ owner: 1, field: 1, createdAt: -1 });
cropAnalysisSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('CropAnalysis', cropAnalysisSchema);
