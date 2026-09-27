import { useState } from 'react';
import { Search, ShoppingBasket, TrendingUp } from 'lucide-react';
import ListingCard from '../components/listings/ListingCard.jsx';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassLinkButton, GlassSkeleton } from '../components/ui/Glass.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { CATEGORIES } from '../constants/categories.js';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { useI18n } from '../i18n/index.jsx';

const toQuery = (f) => new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v && v.trim()))).toString();

export default function BuyerDashboard() {
  const { t } = useI18n();
  const [tab, setTab] = useState('browse');
  const [filters, setFilters] = useState({ q: '', category: '', state: '', district: '', sort: 'newest' });
  const [applied, setApplied] = useState('sort=newest');
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const browse = useApi(tab === 'browse' ? `/listings?${applied}&r=${tick}` : null);
  const saved = useApi(tab === 'saved' ? `/listings/saved?r=${tick}` : null);
  const res = tab === 'browse' ? browse : saved;
  const listings = res.data?.listings ?? [];
  const set = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function toggleSave(l) {
    setError('');
    try { await api(`/listings/${l._id}/save`, { method: l.saved ? 'DELETE' : 'PUT' }); setTick((t) => t + 1); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl">{t('p.buyerdashboard.marketplace')}</h1><p className="text-sm text-mist/70">{t('p.buyerdashboard.browse_produce_listed_by')}</p></div>

      <Reveal>
        <GlassCard className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber"><TrendingUp className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="font-display text-lg">{t('p.buyerdashboard.marketIntelTitle')}</p>
              <p className="mt-0.5 max-w-md text-sm text-mist/70">{t('p.buyerdashboard.marketIntelBody')}</p>
            </div>
          </div>
          <GlassLinkButton to="/market" variant="primary" className="text-sm">{t('p.buyerdashboard.viewMarket')}</GlassLinkButton>
        </GlassCard>
      </Reveal>

      <div role="tablist" className="glass-btn grid max-w-xs grid-cols-2 rounded-xl p-1 text-sm">
        {[['browse', t('l.browse')], ['saved', t('l.saved')]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg py-2 transition ${tab === k ? 'bg-white/20' : 'text-mist/70'}`}>{label}</button>
        ))}
      </div>

      {tab === 'browse' && (
        <GlassCard>
          <form onSubmit={(e) => { e.preventDefault(); setApplied(toQuery(filters)); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <GlassInput name="q" label={t('p.buyerdashboard.search_crop')} className="lg:col-span-2" value={filters.q} onChange={set} />
            <GlassInput as="select" name="category" label={t('p.buyerdashboard.category')} value={filters.category} onChange={set}>
              <option value="">{t('p.buyerdashboard.all')}</option>{CATEGORIES.map(([k]) => <option key={k} value={k}>{t(`l.cat_${k}`)}</option>)}
            </GlassInput>
            <GlassInput name="state" label={t('p.buyerdashboard.state')} value={filters.state} onChange={set} />
            <GlassInput as="select" name="sort" label={t('p.buyerdashboard.sort')} value={filters.sort} onChange={set}>
              <option value="newest">{t('p.buyerdashboard.newest')}</option><option value="price_asc">{t('p.buyerdashboard.price_low_to_high')}</option><option value="price_desc">{t('p.buyerdashboard.price_high_to_low')}</option>
            </GlassInput>
            <GlassButton type="submit" variant="primary"><Search className="h-4 w-4" aria-hidden="true" />{t('p.buyerdashboard.search')}</GlassButton>
          </form>
        </GlassCard>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      {res.loading && !res.data ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-56" />)}</div>
        : res.error ? <GlassCard><p role="alert" className="text-amber">{res.error}</p></GlassCard>
        : listings.length === 0 ? <EmptyState icon={ShoppingBasket} title={tab === 'saved' ? t('l.no_saved') : t('l.no_listings')} hint={tab === 'saved' ? t('l.saved_hint') : t('l.browse_hint')} />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((l) => <ListingCard key={l._id} listing={l} onToggleSave={toggleSave} />)}</div>}
    </div>
  );
}
