// Clearly labelled demo records for development. Never presented as live data.
const DAY = 864e5;
const at = (now, days) => new Date(now.getTime() + days * DAY);
const NOTE = 'Demo record created by the seed script.';

export const demoFields = (now = new Date()) => [
  { name: 'North Plot (Demo)', crop: 'Wheat', areaAcres: 2.5, latitude: 26.8467, longitude: 80.9462, sowingDate: at(now, -120), expectedHarvestDate: at(now, 5), soilType: 'Loamy', irrigationType: 'Canal', notes: NOTE },
  { name: 'River Field (Demo)', crop: 'Potato', areaAcres: 1.2, latitude: 26.7606, longitude: 80.885, sowingDate: at(now, -40), expectedHarvestDate: at(now, 60), soilType: 'Sandy loam', irrigationType: 'Drip', notes: NOTE },
  { name: 'East Block (Demo)', crop: 'Onion', areaAcres: 0.8, latitude: 26.9124, longitude: 81.0187, sowingDate: at(now, -25), expectedHarvestDate: at(now, 95), soilType: 'Clay loam', irrigationType: 'Sprinkler', notes: NOTE },
];

// ids: array of field ids in the same order as demoFields()
export const demoDiary = (now, ids) => [
  { field: ids[0], crop: 'Wheat', date: at(now, -20), activity: 'Fertilizer application', fertilizer: 'Urea, 50 kg', observation: 'Even crop stand.' },
  { field: ids[0], crop: 'Wheat', date: at(now, -10), activity: 'Irrigation', irrigation: 'Canal flooding, about 2 hours', observation: 'Topsoil was dry before watering.' },
  { field: ids[1], crop: 'Potato', date: at(now, -40), activity: 'Sowing', notes: 'Planted in ridges.' },
  { field: ids[1], crop: 'Potato', date: at(now, -7), activity: 'Weeding', observation: 'Light weed pressure on the western edge.' },
].map((e) => ({ ...e, notes: e.notes ? `${e.notes} ${NOTE}` : NOTE }));

export const demoHealth = (now, fieldId) => [
  [-28, 78, 'Tillering', 'none', 'Healthy growth.'],
  [-21, 74, 'Tillering', 'none', 'Slightly slower growth.'],
  [-14, 66, 'Stem elongation', 'water', 'Leaf tips curling; soil dry.'],
  [-7, 71, 'Stem elongation', 'none', 'Recovering after irrigation.'],
  [-1, 80, 'Heading', 'none', 'Healthy condition.'],
].map(([d, healthScore, growthStage, issueType, observation]) => ({ field: fieldId, date: at(now, d), healthScore, growthStage, issueType, observation, notes: NOTE }));

export const demoSoil = (now, fieldId) => [
  [-14, 22, 6.8, 27], [-10, 34, 6.9, 28], [-6, 41, 6.9, 26], [-2, 38, 6.8, 29],
].map(([d, moisturePct, ph, temperatureC]) => ({ field: fieldId, recordedAt: at(now, d), moisturePct, ph, temperatureC, notes: NOTE }));

export const demoListings = () => [
  { crop: 'Wheat', category: 'grains', quantity: 40, unit: 'quintal', pricePerUnit: 2400, state: 'Uttar Pradesh', district: 'Lucknow', description: `Demo listing. ${NOTE}` },
  { crop: 'Potato', category: 'vegetables', quantity: 15, unit: 'quintal', pricePerUnit: 1200, state: 'Uttar Pradesh', district: 'Lucknow', description: `Demo listing. ${NOTE}` },
];
