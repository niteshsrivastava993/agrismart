// Colour bands for the farmer-recorded crop health score (0-100).
export const HEALTH_BANDS = {
  good: { key: 'good', label: 'Good', range: '70–100', color: '#9DB58F' },
  fair: { key: 'fair', label: 'Fair', range: '40–69', color: '#D9A441' },
  poor: { key: 'poor', label: 'Poor', range: '0–39', color: '#D9705F' },
  unknown: { key: 'unknown', label: 'No record', range: '', color: '#B8BFB6' },
};

export function healthBand(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return HEALTH_BANDS.unknown;
  if (score >= 70) return HEALTH_BANDS.good;
  if (score >= 40) return HEALTH_BANDS.fair;
  return HEALTH_BANDS.poor;
}
