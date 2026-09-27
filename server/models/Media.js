import mongoose from 'mongoose';

// Images live in MongoDB so the app needs no persistent disk. Always served through an owner check.
const mediaSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Media', mediaSchema);
