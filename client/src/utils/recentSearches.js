const KEY = 'agrismart_recent_searches';
const MAX = 5;

export function getRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX) : [];
  } catch { return []; }
}

export function addRecent(q) {
  const term = String(q || '').trim();
  if (term.length < 2) return getRecent();
  const next = [term, ...getRecent().filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: recents just won't persist */ }
  return next;
}

export function clearRecent() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return [];
}
