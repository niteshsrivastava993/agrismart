import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowUpRight, MapPin, Search, TrendingUp } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton, GlassStatCard, SourceNote } from '../components/ui/Glass.jsx';
import MarketChart from '../components/market/MarketChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { fmtDate, fmtPrice } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

const FILTERS = [['commodity', 'Commodity'], ['state', 'State'], ['district', 'District'], ['market', 'Market']];
const toQuery = (f) => new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim())), limit: '100' }).toString();

export default function Market() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  // Links from voice search carry filters in the URL; otherwise default to the user's state.
  const initial = () => {
    const fromUrl = ['commodity', 'state', 'district'].some((k) => params.has(k));
    return { commodity: params.get('commodity') || '', state: fromUrl ? params.get('state') || '' : user.state, district: params.get('district') || '', market: '' };
  };
  const [filters, setFilters] = useState(initial);
  const [applied, setApplied] = useState(() => toQuery(initial()));
  const urlSearch = params.toString();
  useEffect(() => {
    if (!urlSearch) return;
    const f = initial();
    setFilters(f);
    setApplied(toQuery(f));
  }, [urlSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  const res = useApi(`/market/prices?${applied}`);
  const records = res.data?.records ?? [];
  const ap = new URLSearchParams(applied);
  const trendCommodity = ap.get('commodity');

  const modalPrices = records.map((r) => r.modalPrice).filter((v) => typeof v === 'number');
  const marketCount = new Set(records.map((r) => `${r.market}|${r.district}`)).size;
  const overview = modalPrices.length > 0 ? {
    markets: marketCount,
    lowest: Math.min(...modalPrices),
    highest: Math.max(...modalPrices),
    average: Math.round(modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length),
  } : null;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl">{t('p.market.market_prices')}</h1>
        <p className="text-sm text-mist/70">{t('p.market.daily_mandi_prices_in')}</p></div>

      {overview && !res.loading && !res.error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassStatCard icon={MapPin} label={t('p.market.markets_found')} value={overview.markets} />
          <GlassStatCard icon={ArrowDownRight} label={t('p.market.lowest_modal')} value={fmtPrice(overview.lowest)} />
          <GlassStatCard icon={ArrowUpRight} label={t('p.market.highest_modal')} value={fmtPrice(overview.highest)} />
          <GlassStatCard icon={Activity} label={t('p.market.average_modal')} value={fmtPrice(overview.average)} />
        </div>
      )}

      <GlassCard>
        <form onSubmit={(e) => { e.preventDefault(); setApplied(toQuery(filters)); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          {FILTERS.map(([name]) => (
            <GlassInput key={name} name={name} label={t(`l.mf_${name}`)} value={filters[name]} onChange={(e) => setFilters((f) => ({ ...f, [name]: e.target.value }))} />
          ))}
          <GlassButton type="submit" variant="primary"><Search className="h-4 w-4" aria-hidden="true" />{t('p.market.search')}</GlassButton>
        </form>
      </GlassCard>

      {trendCommodity && <MarketChart key={`${trendCommodity}|${ap.get('state')}`} commodity={trendCommodity} state={ap.get('state')} />}

      {res.loading ? (
        <div><p className="mb-2 text-sm text-mist/70">{t('p.market.fetching_live_market_data')}</p><GlassSkeleton className="h-64" /></div>
      ) : res.error ? (
        <GlassCard><p role="alert" className="text-amber">{res.error}</p></GlassCard>
      ) : records.length === 0 ? (
        <EmptyState icon={TrendingUp} title={t('p.market.no_market_records_found')} hint={t('p.market.try_a_different_commodity')} />
      ) : (
        <GlassCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-mist/60">
                <tr>{['commodity', 'market', 'min', 'max', 'modal', 'arrival'].map((h) => <th key={h} scope="col" className="px-4 py-3 font-normal">{t(`l.col_${h}`)}</th>)}</tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="px-4 py-3">{r.commodity}</td>
                    <td className="px-4 py-3 text-mist/80">{r.market}, {r.district}</td>
                    <td className="px-4 py-3">{fmtPrice(r.minPrice)}</td>
                    <td className="px-4 py-3">{fmtPrice(r.maxPrice)}</td>
                    <td className="px-4 py-3 text-amber">{fmtPrice(r.modalPrice)}</td>
                    <td className="px-4 py-3 text-mist/80">{fmtDate(r.arrivalDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <SourceNote source={res.data.source} fetchedAt={res.data.fetchedAt} stale={res.data.stale} />
            {res.data.sourceUpdatedAt && <p className="text-[11px] text-mist/60">Dataset updated: {String(res.data.sourceUpdatedAt)}</p>}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
