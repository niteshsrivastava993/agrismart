import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['weather', 'market', 'crop_reminder', 'system'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false }, // "delete" is a soft delete so generated reminders are not recreated
    dedupeKey: String,
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, dismissed: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

export default mongoose.model('Notification', notificationSchema);
