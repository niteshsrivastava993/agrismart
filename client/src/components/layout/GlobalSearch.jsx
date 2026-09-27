import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Clock, Search, Sprout, Store, TrendingUp, Users, Wheat, Zap } from 'lucide-react';
import { useI18n } from '../../i18n/index.jsx';
import { api } from '../../services/api.js';
import { addRecent, clearRecent, getRecent } from '../../utils/recentSearches.js';

const ICONS = { field: Sprout, crop: Wheat, diary: BookOpen, notification: Bell, market: TrendingUp, listing: Store, user: Users, action: Zap };
const ORDER = ['field', 'crop', 'diary', 'listing', 'notification', 'market', 'user', 'action'];

export default function GlobalSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [state, setState] = useState({ loading: false, results: [], error: '' });
  const [recent, setRecent] = useState([]);
  const input = useRef(null);

  const close = () => { setOpen(false); setQ(''); setDq(''); };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) { setRecent(getRecent()); setTimeout(() => input.current?.focus(), 0); } }, [open]);
  useEffect(() => { const id = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(id); }, [q]);

  useEffect(() => {
    if (!open || dq.length < 2) { setState({ loading: false, results: [], error: '' }); return undefined; }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api(`/search?${new URLSearchParams({ q: dq })}`)
      .then((d) => live && setState({ loading: false, results: d.results, error: '' }))
      .catch((e) => live && setState({ loading: false, results: [], error: e.message }));
    return () => { live = false; };
  }, [dq, open]);

  const groups = ORDER.map((type) => [type, state.results.filter((r) => r.type === type)]).filter(([, rows]) => rows.length);
  const go = (to) => { addRecent(dq); close(); navigate(to); };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t('nav.search')} className="rounded-xl p-2 text-mist/70 hover:bg-white/10 hover:text-ivory"><Search className="h-4 w-4" /></button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 pt-[max(1rem,env(safe-area-inset-top))]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-label={t('nav.search')} className="glass fade-in mx-auto mt-4 flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-mist/60" aria-hidden="true" />
              <label htmlFor="global-search" className="sr-only">{t('nav.search')}</label>
              <input id="global-search" ref={input} value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} autoComplete="off"
                onKeyDown={(e) => { if (e.key === 'Enter' && state.results[0]) go(state.results[0].to); }}
                placeholder={t('search.placeholder')} className="w-full bg-transparent text-sm outline-none placeholder:text-mist/50" />
              <button onClick={close} className="rounded-lg px-2 py-1 text-xs text-mist/60 hover:bg-white/10">Esc</button>
            </div>

            <div className="overflow-y-auto p-2" aria-live="polite">
              {q.trim().length < 2 ? (
                recent.length > 0 && (
                  <div className="p-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-mist/60">
                      <span>{t('search.recent')}</span>
                      <button onClick={() => setRecent(clearRecent())} className="underline">{t('search.clear')}</button>
                    </div>
                    {recent.map((r) => <button key={r} onClick={() => setQ(r)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"><Clock className="h-4 w-4 text-mist/50" aria-hidden="true" />{r}</button>)}
                  </div>
                )
              ) : state.loading && !state.results.length ? <p className="p-4 text-sm text-mist/60">…</p>
                : state.error ? <p role="alert" className="p-4 text-sm text-amber">{state.error}</p>
                : groups.length === 0 ? <p className="p-4 text-sm text-mist/70">{t('search.none')}</p>
                : groups.map(([type, rows]) => {
                  const Icon = ICONS[type];
                  return (
                    <section key={type} aria-label={t(`search.${type}`)} className="p-1">
                      <h3 className="px-2 pb-1 pt-2 text-[11px] uppercase tracking-widest text-mist/50">{t(`search.${type}`)}</h3>
                      {rows.map((r) => (
                        <Link key={`${type}-${r.id}`} to={r.to} onClick={() => { addRecent(dq); close(); }} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10">
                          <Icon className="h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                          <span className="min-w-0"><span className="block truncate text-sm">{r.title}</span><span className="block truncate text-xs text-mist/60">{r.subtitle}</span></span>
                        </Link>
                      ))}
                    </section>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
