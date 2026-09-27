const BASE_URL = 'https://api.data.gov.in/resource/';
const DEFAULT_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'; // daily mandi prices; override via DATA_GOV_RESOURCE_ID
const SOURCE = 'Government of India — Open Government Data (data.gov.in)';
const TTL_MS = 30 * 60 * 1000;
const cache = new Map();

// Missing / "NA" / non-numeric prices become null, never 0.
export const toPrice = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^na$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// dd/mm/yyyy -> yyyy-mm-dd, otherwise null.
export const toIsoDate = (d) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

export const normalizeRecord = (r, fetchedAt) => ({
  commodity: r.commodity || null,
  state: r.state || null,
  district: r.district || null,
  market: r.market || null,
  variety: r.variety || null,
  arrivalDate: toIsoDate(r.arrival_date),
  minPrice: toPrice(r.min_price),
  maxPrice: toPrice(r.max_price),
  modalPrice: toPrice(r.modal_price),
  unit: 'quintal',
  source: SOURCE,
  fetchedAt,
});

export async function getPrices({ commodity, state, district, market, limit = 50, offset = 0 }) {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('Connect API credentials to view live data.'), { status: 503 });
  }
  const cacheKey = JSON.stringify([commodity, state, district, market, limit, offset]);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.storedAt < TTL_MS) return { ...hit.data, cached: true, stale: false };

  const params = new URLSearchParams({ 'api-key': apiKey, format: 'json', limit: String(limit), offset: String(offset) });
  for (const [k, v] of Object.entries({ commodity, state, district, market })) {
    if (v) params.set(`filters[${k}]`, v);
  }
  const url = `${BASE_URL}${process.env.DATA_GOV_RESOURCE_ID || DEFAULT_RESOURCE}?${params}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`data.gov.in responded ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.records)) throw new Error('Unexpected data.gov.in response shape');
    const fetchedAt = new Date().toISOString();
    const data = {
      records: json.records.map((r) => normalizeRecord(r, fetchedAt)).filter((r) => r.commodity && r.market),
      total: Number(json.total) || null,
      source: SOURCE,
      sourceUpdatedAt: json.updated_date ?? null,
      fetchedAt,
    };
    cache.set(cacheKey, { data, storedAt: Date.now() });
    return { ...data, cached: false, stale: false };
  } catch (e) {
    console.error('market fetch failed:', e.message);
    if (hit) return { ...hit.data, cached: true, stale: true, message: 'Showing cached data.' };
    throw Object.assign(new Error('Live data is temporarily unavailable.'), { status: 503 });
  }
}
