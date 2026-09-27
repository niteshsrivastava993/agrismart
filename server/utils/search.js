// Turns database rows into uniform search results: { type, id, title, subtitle, to }.
const day = (d) => new Date(d).toISOString().slice(0, 10);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const titleCase = (s) => String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const mapField = (f) => ({ type: 'field', id: String(f._id), title: f.name, subtitle: `${f.crop} · ${f.areaAcres} acres`, to: '/farmer/fields' });
export const mapCrop = (c) => ({ type: 'crop', id: c._id, title: c._id, subtitle: `${plural(c.count, 'field')} · view prices`, to: `/market?commodity=${encodeURIComponent(c._id)}` });
export const mapDiary = (e) => ({ type: 'diary', id: String(e._id), title: e.activity, subtitle: `${day(e.date)} · ${e.field?.name ?? 'Deleted field'}`, to: e.field?._id ? `/farmer/diary?field=${e.field._id}` : '/farmer/diary' });
export const mapNotification = (n) => ({ type: 'notification', id: String(n._id), title: n.title, subtitle: n.message, to: '/notifications' });
export const mapMarket = (m) => ({ type: 'market', id: m._id, title: m._id, subtitle: `${plural(m.markets.length, 'market')} · latest ${day(m.latest)}`, to: `/market?commodity=${encodeURIComponent(m._id)}` });
export const mapListing = (l, own) => ({ type: 'listing', id: String(l._id), title: l.crop, subtitle: `₹${l.pricePerUnit}/${l.unit} · ${l.district}, ${l.state}`, to: own ? '/farmer/listings' : '/buyer/dashboard' });
export const mapUser = (u) => ({ type: 'user', id: String(u._id), title: u.fullName, subtitle: `${u.email} · ${u.role}`, to: '/admin/dashboard' });
export const marketAction = (q) => ({ type: 'action', id: 'market-search', title: `Search market prices for “${q}”`, subtitle: 'Uses the government price data', to: `/market?commodity=${encodeURIComponent(titleCase(q))}` });
