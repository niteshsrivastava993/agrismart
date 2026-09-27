import mongoose from 'mongoose';

const diarySchema = new mongoose.Schema(
  {
    isDemo: { type: Boolean, default: false }, // marks records created by seed.js
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
    crop: { type: String, trim: true },
    date: { type: Date, required: true },
    activity: { type: String, required: true, trim: true },
    irrigation: String,
    fertilizer: String,
    pesticide: String,
    observation: String,
    notes: String,
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
  },
  { timestamps: true }
);
diarySchema.index({ owner: 1, date: -1 });
diarySchema.index({ owner: 1, field: 1, date: -1 });

export default mongoose.model('DiaryEntry', diarySchema);
