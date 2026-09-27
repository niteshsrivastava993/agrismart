const EARTH_RADIUS_M = 6371008.8;
const SQ_M_PER_ACRE = 4046.8564224;

// Approximate polygon area in acres from [lat, lon] corners. Flat projection around the centroid,
// which is accurate for farm-sized shapes.
export function polygonAreaAcres(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  const lat0 = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lon0 = points.reduce((s, p) => s + p[1], 0) / points.length;
  const k = Math.PI / 180;
  const xy = points.map(([lat, lon]) => [EARTH_RADIUS_M * Math.cos(lat0 * k) * (lon - lon0) * k, EARTH_RADIUS_M * (lat - lat0) * k]);
  let sum = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2 / SQ_M_PER_ACRE;
}
