const KEY = 'agrismart_theme';
const query = () => window.matchMedia('(prefers-color-scheme: light)');
export const getThemePref = () => localStorage.getItem(KEY) || 'dark';
const resolve = (p) => (p === 'system' ? (query().matches ? 'light' : 'dark') : p);
export const applyTheme = (p = getThemePref()) => { document.documentElement.dataset.theme = resolve(p); };
export function setThemePref(p) { localStorage.setItem(KEY, p); applyTheme(p); }
export function initTheme() {
  applyTheme();
  query().addEventListener('change', () => { if (getThemePref() === 'system') applyTheme(); });
}
