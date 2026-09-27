// Deterministic, threshold-based advisories computed only from values the
// weather API actually returned. Nothing here is predicted or invented —
// each rule just names a well-known agronomic implication of a real reading,
// and is skipped entirely if the underlying value is missing.
export function getWeatherAdvisories({ current, forecastDays, forecastNext }) {
  const out = [];

  const minC = forecastDays?.[0]?.minC;
  if (typeof minC === 'number' && minC <= 4) out.push('frost');

  const rainSoon = forecastNext?.some((s) => typeof s.rainChancePct === 'number' && s.rainChancePct >= 70);
  if (rainSoon) out.push('heavy_rain');

  if (typeof current?.windSpeedMs === 'number' && current.windSpeedMs * 3.6 >= 25) out.push('high_wind');

  if (typeof current?.humidity === 'number' && current.humidity >= 80 && typeof current?.temperatureC === 'number' && current.temperatureC >= 20) {
    out.push('fungal_risk');
  }

  if (typeof current?.temperatureC === 'number' && current.temperatureC >= 38) out.push('heat');

  return out;
}
