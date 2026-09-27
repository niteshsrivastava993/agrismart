import mongoose from 'mongoose';

// buyerName/buyerMobile are copied at send time: the buyer explicitly shares them with this seller.
const inquirySchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true },
    buyerMobile: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);
inquirySchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model('Inquiry', inquirySchema);
