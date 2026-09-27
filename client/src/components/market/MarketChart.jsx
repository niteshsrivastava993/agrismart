import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus, TrendingDown, TrendingUp, X } from 'lucide-react';
import { GlassButton, GlassCard, GlassInput, GlassSkeleton, SourceNote } from '../ui/Glass.jsx';
import { api } from '../../services/api.js';
import { fmtDate, fmtPrice } from '../../utils/format.js';
import { useI18n } from '../../i18n/index.jsx';

const label = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const COLORS = ['#D9A441', '#7C8874', '#8EA9B8', '#A69A89'];
const MAX_SERIES = 4;

export default function MarketChart({ commodity, state }) {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const [extra, setExtra] = useState([]);
  const [compareInput, setCompareInput] = useState('');
  const [series, setSeries] = useState({});

  const list = [commodity, ...extra];

  // Fetches every series in the list in parallel against the real trend endpoint —
  // one series failing (or lacking history) never blocks the others.
  useEffect(() => {
    let live = true;
    setSeries((prev) => {
      const next = {};
      for (const c of list) next[c] = prev[c] || { loading: true, data: null, error: null };
      return next;
    });
    Promise.all(list.map((c) =>
      api(`/market/trend?${new URLSearchParams({ commodity: c, days: String(days), ...(state && { state }) })}`)
        .then((data) => ({ c, data, error: null }))
        .catch((e) => ({ c, data: null, error: e.message }))
    )).then((results) => {
      if (!live) return;
      setSeries((prev) => {
        const next = { ...prev };
        for (const { c, data, error } of results) next[c] = { loading: false, data, error };
        return next;
      });
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodity, JSON.stringify(extra), state, days]);

  function addCompare(e) {
    e.preventDefault();
    const name = compareInput.trim();
    if (!name || list.length >= MAX_SERIES || list.includes(name)) return;
    setExtra((x) => [...x, name]);
    setCompareInput('');
  }
  const removeCompare = (name) => setExtra((x) => x.filter((c) => c !== name));

  const primary = series[commodity];
  const c = primary?.data?.change;
  const anyLoading = list.some((k) => series[k]?.loading);
  const allSettled = list.every((k) => series[k] && !series[k].loading);

  // Merge every series' points into one date-indexed row set for a shared x-axis.
  const dateSet = new Set();
  list.forEach((k) => series[k]?.data?.points?.forEach((p) => dateSet.add(p.date)));
  const sortedDates = [...dateSet].sort();
  const chartData = sortedDates.map((date) => {
    const row = { date: label(date) };
    list.forEach((k) => {
      const pt = series[k]?.data?.points?.find((p) => p.date === date);
      row[k] = pt ? pt.modalPrice : null;
    });
    return row;
  });
  const plottable = list.filter((k) => (series[k]?.data?.points?.length ?? 0) >= 2);

  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-mist/60">Price trend · {commodity}</p>
          {c ? (
            <p className={`mt-1 flex items-center gap-2 text-lg ${c.direction === 'up' ? 'text-emerald-300' : c.direction === 'down' ? 'text-red-300' : ''}`}>
              {c.direction === 'down' ? <TrendingDown className="h-5 w-5" aria-hidden="true" /> : <TrendingUp className="h-5 w-5" aria-hidden="true" />}
              {c.absolute > 0 ? '+' : ''}{fmtPrice(c.absolute)}{c.percent !== null && ` (${c.percent > 0 ? '+' : ''}${c.percent}%)`}
              <span className="text-xs text-mist/60">{fmtDate(c.from)} → {fmtDate(c.to)}</span>
            </p>
          ) : null}
        </div>
        <div className="flex gap-2" role="group" aria-label={t('p.marketchart.trend_period')}>
          {[7, 30].map((n) => (
            <GlassButton key={n} aria-pressed={days === n} onClick={() => setDays(n)} className={`px-3 py-1.5 text-xs ${days === n ? '!bg-white/25' : ''}`}>
              {t('p.marketchart.days_n', { n })}
            </GlassButton>
          ))}
        </div>
      </div>

      {/* Comparison chips + add form */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {list.map((k, i) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
            {k}
            {series[k]?.error && <span className="text-amber" title={t('p.marketchart.compare_error', { commodity: k })}>·!</span>}
            {i > 0 && (
              <button type="button" onClick={() => removeCompare(k)} aria-label={t('p.marketchart.compare_remove', { commodity: k })}
                className="-m-1 rounded-full p-1.5 hover:bg-white/15">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {list.length < MAX_SERIES && (
          <form onSubmit={addCompare} className="flex items-center gap-1.5">
            <GlassInput aria-label={t('p.marketchart.compare_title')} placeholder={t('p.marketchart.compare_placeholder')}
              value={compareInput} onChange={(e) => setCompareInput(e.target.value)} className="w-44" />
            <GlassButton type="submit" className="px-2.5 py-2" aria-label={t('p.marketchart.compare_add')}><Plus className="h-4 w-4" aria-hidden="true" /></GlassButton>
          </form>
        )}
      </div>
      {list.length >= MAX_SERIES && <p className="mt-1.5 text-[11px] text-mist/50">{t('p.marketchart.compare_limit')}</p>}

      {anyLoading && !allSettled && chartData.length === 0 ? <GlassSkeleton className="mt-4 h-48" />
        : primary?.error && !primary?.data ? <p role="alert" className="mt-4 text-sm text-amber">{primary.error}</p>
        : plottable.length === 0 ? <p className="mt-4 py-8 text-center text-sm text-mist/70">{t('p.marketchart.not_enough_history', { commodity })}</p>
        : (
          <>
            <div className="mt-4 h-52" role="img" aria-label={t('p.marketchart.chart_aria', { commodity: list.join(', ') })}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: 'currentColor', fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                  <Tooltip formatter={(v, name) => [`${fmtPrice(v)} /quintal`, name]}
                    contentStyle={{ background: 'rgba(17,19,16,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#F4F0E8' }} />
                  {list.map((k, i) => plottable.includes(k) && (
                    <Line key={k} type="monotone" dataKey={k} name={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                      dot={{ r: 3, fill: COLORS[i % COLORS.length] }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {list.filter((k) => !plottable.includes(k) && series[k]?.data && !series[k]?.error).map((k) => (
              <p key={k} className="mt-1 text-[11px] text-mist/50">{t('p.marketchart.compare_no_data', { commodity: k })}</p>
            ))}
            <p className="mt-2 text-[11px] text-mist/60">{t('p.marketchart.average_modal_price_across')}</p>
            {primary?.data && <SourceNote source={primary.data.source} fetchedAt={primary.data.updatedAt} />}
          </>
        )}
    </GlassCard>
  );
}
