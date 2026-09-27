import MarketPrice from '../models/MarketPrice.js';

const DAY = 864e5;

export async function saveSnapshots(records) {
  const ops = records
    .filter((r) => r.arrivalDate && r.commodity && r.market)
    .map((r) => ({
      updateOne: {
        filter: { commodity: r.commodity, variety: r.variety ?? null, state: r.state, district: r.district, market: r.market, arrivalDate: new Date(r.arrivalDate) },
        update: { $set: { minPrice: r.minPrice, maxPrice: r.maxPrice, modalPrice: r.modalPrice, unit: r.unit, source: r.source, fetchedAt: new Date(r.fetchedAt) } },
        upsert: true,
      },
    }));
  if (!ops.length) return 0;
  const res = await MarketPrice.bulkWrite(ops, { ordered: false });
  return res.upsertedCount + res.modifiedCount;
}

// Change between the first and last dated point that has a price. Returns null with fewer than two.
export function computeChange(points) {
  const priced = points.filter((p) => p.modalPrice !== null && p.modalPrice !== undefined);
  if (priced.length < 2) return null;
  const first = priced[0], last = priced[priced.length - 1];
  const absolute = last.modalPrice - first.modalPrice;
  return {
    from: first.date,
    to: last.date,
    absolute,
    percent: first.modalPrice === 0 ? null : Number(((absolute / first.modalPrice) * 100).toFixed(1)),
    direction: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat',
  };
}

export async function getTrend({ commodity, state, district, market, days = 30 }, now = new Date()) {
  const match = { commodity, arrivalDate: { $gte: new Date(now.getTime() - days * DAY), $lte: now } };
  for (const [k, v] of Object.entries({ state, district, market })) if (v) match[k] = v;
  const rows = await MarketPrice.aggregate([
    { $match: match },
    { $group: { _id: '$arrivalDate', modalPrice: { $avg: '$modalPrice' }, markets: { $addToSet: '$market' }, fetchedAt: { $max: '$fetchedAt' } } },
    { $sort: { _id: 1 } },
  ]);
  const points = rows.map((r) => ({
    date: r._id.toISOString().slice(0, 10),
    modalPrice: r.modalPrice === null || r.modalPrice === undefined ? null : Math.round(r.modalPrice),
    markets: r.markets.length,
  }));
  const updatedAt = rows.reduce((m, r) => (r.fetchedAt && (!m || r.fetchedAt > m) ? r.fetchedAt : m), null);
  return { points, change: computeChange(points), updatedAt: updatedAt ? updatedAt.toISOString() : null };
}
