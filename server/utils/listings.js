export const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || 'Farmer';

// Public view of a listing: only the seller's first name is exposed. No email, mobile or full name.
export const toPublic = (l, savedIds = new Set()) => ({
  _id: l._id,
  crop: l.crop,
  category: l.category,
  quantity: l.quantity,
  unit: l.unit,
  pricePerUnit: l.pricePerUnit,
  state: l.state,
  district: l.district,
  description: l.description ?? '',
  status: l.status,
  createdAt: l.createdAt,
  sellerName: firstName(l.seller?.fullName),
  saved: savedIds.has(String(l._id)),
});
