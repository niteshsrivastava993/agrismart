const BASE = 'https://api.openweathermap.org/data/2.5/';
const TTL_MS = { current: 10 * 60 * 1000, forecast: 30 * 60 * 1000 };
const cache = new Map();

export const normalizeWeather = (d, fetchedAt) => ({
  location: [d.name, d.sys?.country].filter(Boolean).join(', ') || null,
  latitude: d.coord?.lat ?? null,
  longitude: d.coord?.lon ?? null,
  temperatureC: d.main?.temp ?? null,
  feelsLikeC: d.main?.feels_like ?? null,
  humidity: d.main?.humidity ?? null,
  pressureHpa: d.main?.pressure ?? null,
  windSpeedMs: d.wind?.speed ?? null,
  visibilityM: d.visibility ?? null,
  condition: d.weather?.[0]?.main ?? null,
  description: d.weather?.[0]?.description ?? null,
  observedAt: d.dt ? new Date(d.dt * 1000).toISOString() : null,
  source: 'OpenWeather',
  fetchedAt,
});

// Groups OpenWeather's 3-hourly forecast into local calendar days (using the city's UTC offset).
export function normalizeForecast(d, fetchedAt) {
  const tz = d.city?.timezone ?? 0;
  const days = new Map();
  const slots = [];
  for (const it of d.list ?? []) {
    const iso = new Date((it.dt + tz) * 1000).toISOString();
    const date = iso.slice(0, 10);
    const pop = typeof it.pop === 'number' ? Math.round(it.pop * 100) : null;
    const cond = it.weather?.[0]?.main ?? null;
    slots.push({ localTime: iso.slice(0, 16), tempC: it.main?.temp ?? null, condition: cond, rainChancePct: pop });
    const day = days.get(date) ?? { date, temps: [], conds: new Map(), pops: [], rain: 0 };
    for (const v of [it.main?.temp_min ?? it.main?.temp, it.main?.temp_max ?? it.main?.temp]) if (typeof v === 'number') day.temps.push(v);
    if (cond) day.conds.set(cond, (day.conds.get(cond) || 0) + 1);
    if (pop !== null) day.pops.push(pop);
    day.rain += it.rain?.['3h'] ?? 0;
    days.set(date, day);
  }
  return {
    location: [d.city?.name, d.city?.country].filter(Boolean).join(', ') || null,
    latitude: d.city?.coord?.lat ?? null,
    longitude: d.city?.coord?.lon ?? null,
    days: [...days.values()].map((x) => ({
      date: x.date,
      minC: x.temps.length ? Math.round(Math.min(...x.temps)) : null,
      maxC: x.temps.length ? Math.round(Math.max(...x.temps)) : null,
      condition: [...x.conds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      rainChancePct: x.pops.length ? Math.max(...x.pops) : null,
      rainMm: Number(x.rain.toFixed(1)),
    })),
    next: slots.slice(0, 8),
    source: 'OpenWeather',
    fetchedAt,
  };
}

async function request(kind, endpoint, { lat, lon, q }, normalize) {
  const appid = process.env.OPENWEATHER_API_KEY;
  if (!appid) throw Object.assign(new Error('Connect API credentials to view live data.'), { status: 503 });

  const params = new URLSearchParams({ units: 'metric', appid });
  if (q) params.set('q', q);
  else { params.set('lat', String(lat)); params.set('lon', String(lon)); }

  const key = `${kind}:${q ? `q:${q.toLowerCase()}` : `ll:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.storedAt < TTL_MS[kind]) return { ...hit.data, cached: true, stale: false };

  try {
    const res = await fetch(`${BASE}${endpoint}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (res.status === 404) throw Object.assign(new Error('Location not found'), { status: 404 });
    if (!res.ok) throw new Error(`OpenWeather responded ${res.status}`);
    const data = normalize(await res.json(), new Date().toISOString());
    cache.set(key, { data, storedAt: Date.now() });
    return { ...data, cached: false, stale: false };
  } catch (e) {
    if (e.status === 404) throw e;
    console.error(`${kind} weather fetch failed:`, e.message);
    if (hit) return { ...hit.data, cached: true, stale: true, message: 'Showing cached data.' };
    throw Object.assign(new Error('Weather data temporarily unavailable.'), { status: 503 });
  }
}

export const getCurrentWeather = (args) => request('current', 'weather', args, normalizeWeather);
export const getForecast = (args) => request('forecast', 'forecast', args, normalizeForecast);
