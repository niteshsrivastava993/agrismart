import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CloudSun, Droplets, HeartPulse, Sprout, TrendingUp } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassLinkButton, GlassSkeleton, SourceNote } from '../components/ui/Glass.jsx';
import MarketChart from '../components/market/MarketChart.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/index.jsx';
import { fmtDate, fmtPrice } from '../utils/format.js';

const FloatingMotif = lazy(() => import('../components/ui/FloatingMotif.jsx'));

function Metric({ icon: Icon, label, s, render, idle }) {
  if (s.loading) return <GlassSkeleton className="h-36" />;
  return (
    <GlassCard className="fade-in">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist/60"><Icon className="h-4 w-4 text-softblue" aria-hidden="true" />{label}</div>
      {s.error ? <p className="mt-4 text-sm text-amber">{s.error}</p> : s.data ? render(s.data) : <p className="mt-4 text-sm text-mist/70">{idle}</p>}
    </GlassCard>
  );
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const fields = useApi('/fields');
  const list = fields.data?.fields ?? [];
  const first = list[0];
  const health = useApi('/crop-health?limit=1&order=desc');
  const soil = useApi('/soil/latest');
  const weather = useApi(first ? `/weather/current?lat=${first.latitude}&lon=${first.longitude}` : null);
  const market = useApi(first ? `/market/prices?${new URLSearchParams({ commodity: first.crop, state: user.state, limit: '20' })}` : null);
  const diary = useApi('/diary?limit=3&order=desc');
  const diaryEntries = diary.data?.entries ?? [];

  const h = new Date().getHours();
  const greeting = t(h < 12 ? 'dashboard.morning' : h < 17 ? 'dashboard.afternoon' : 'dashboard.evening');
  const heading = <h1 className="font-display text-4xl md:text-5xl">{greeting}, {user.fullName.split(' ')[0]}</h1>;

  if (!fields.loading && !fields.error && list.length === 0) {
    return (
      <div className="space-y-8">
        {heading}
        <EmptyState icon={Sprout} title={t('dashboard.noFieldsTitle')} hint={t('dashboard.noFieldsHint')}>
          <GlassLinkButton to="/farmer/fields" variant="primary">{t('dashboard.addField')}</GlassLinkButton>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>{heading}<p className="mt-2 text-mist/70">{t('dashboard.glance')}</p></div>
        <Suspense fallback={null}><FloatingMotif icon={Sprout} className="-mt-2" /></Suspense>
      </div>

      <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric icon={Sprout} label={t('dashboard.activeFields')} s={fields} idle="—" render={() => (
          <><p className="mt-4 text-4xl font-light">{list.length}</p><p className="mt-1 text-xs text-mist/60">{t('dashboard.acresTotal', { n: list.reduce((n, f) => n + f.areaAcres, 0).toFixed(1) })}</p></>
        )} />
        <Metric icon={HeartPulse} label={t('dashboard.cropHealth')} s={health} idle="—" render={(d) => d.records.length ? (
          <><p className="mt-4 text-4xl font-light">{d.records[0].healthScore}%</p>
            <p className="mt-1 text-xs text-mist/80">{d.records[0].field?.name} · {fmtDate(d.records[0].date)}</p>
            <p className="mt-2 text-[11px] text-mist/60">{t('dashboard.recordedByYou')}</p></>
        ) : <p className="mt-4 text-sm text-mist/70">{t('dashboard.noData')} <Link to="/farmer/crop-health" className="text-amber underline">{t('dashboard.addRecord')}</Link></p>} />
        <Metric icon={Droplets} label={t('dashboard.soilMoisture')} s={soil} idle="—" render={(d) => {
          const r = [...d.latest].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0];
          return r ? (
            <><p className="mt-4 text-4xl font-light">{r.moisturePct}%</p>
              <p className="mt-1 text-xs text-mist/80">{list.find((f) => f._id === r.field)?.name ?? ''} · {fmtDate(r.recordedAt)}</p>
              <p className="mt-2 text-[11px] text-mist/60">{t('dashboard.recordedByYou')}</p></>
          ) : <p className="mt-4 text-sm text-mist/70">{t('dashboard.noData')} <Link to="/farmer/crop-health" className="text-amber underline">{t('dashboard.addReading')}</Link></p>;
        }} />
        <Metric icon={CloudSun} label={`${t('dashboard.weather')} · ${first?.name ?? ''}`} s={weather} idle="—" render={(w) => (
          <><p className="mt-4 text-4xl font-light">{w.temperatureC === null ? '—' : `${Math.round(w.temperatureC)}°C`}</p>
            <p className="mt-1 text-xs capitalize text-mist/80">{w.description ?? '—'}{w.humidity !== null && ` · ${t('dashboard.humidity', { n: w.humidity })}`}</p>
            <SourceNote source={w.source} fetchedAt={w.fetchedAt} stale={w.stale} /></>
        )} />
        <Metric icon={TrendingUp} label={t('dashboard.price', { crop: first?.crop ?? '' })} s={market} idle="—" render={(m) => {
          const r = m.records.find((x) => x.modalPrice !== null);
          return r ? (
            <><p className="mt-4 text-4xl font-light">{fmtPrice(r.modalPrice)}<span className="text-sm text-mist/60"> /q</span></p>
              <p className="mt-1 text-xs text-mist/80">{r.market}, {r.district} · {fmtDate(r.arrivalDate)}</p>
              <SourceNote source={r.source} fetchedAt={m.fetchedAt} stale={m.stale} /></>
          ) : <p className="mt-4 text-sm text-mist/70">{t('dashboard.noMarket', { crop: first.crop, state: user.state })}</p>;
        }} />
      </Reveal>

      {first && (
        <Reveal>
          <h2 className="mb-3 text-lg font-light">{t('dashboard.marketIntelligence')}</h2>
          <MarketChart key={`${first.crop}|${user.state}`} commodity={first.crop} state={user.state} />
        </Reveal>
      )}

      <Reveal as="section" aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-lg font-light">{t('dashboard.yourFields')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, 6).map((f) => (
            <GlassCard key={f._id}><p>{f.name}</p><p className="text-sm text-amber">{f.crop}</p>
              <p className="mt-2 text-xs text-mist/70">{t('dashboard.acresSown', { n: f.areaAcres, date: fmtDate(f.sowingDate) })}</p></GlassCard>
          ))}
        </div>
      </Reveal>

      <Reveal className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-light">{t('dashboard.recentDiary')}</h2>
          {diary.loading ? <GlassSkeleton className="h-40" /> : diary.error ? <GlassCard><p role="alert" className="text-sm text-amber">{diary.error}</p></GlassCard>
            : diaryEntries.length === 0 ? <GlassCard><p className="text-sm text-mist/70">{t('dashboard.noDiaryEntries')}</p></GlassCard>
            : (
              <GlassCard className="p-0">
                <ul className="divide-y divide-white/10">
                  {diaryEntries.map((e) => (
                    <li key={e._id} className="px-4 py-3">
                      <p className="text-sm">{e.activity}</p>
                      <p className="mt-0.5 text-xs text-mist/60">{e.field?.name ?? e.crop} · {fmtDate(e.date)}</p>
                    </li>
                  ))}
                </ul>
                <Link to="/farmer/diary" className="block border-t border-white/10 px-4 py-2.5 text-center text-xs text-amber hover:underline">{t('dashboard.viewDiary')}</Link>
              </GlassCard>
            )}
        </div>
        <div>
          <h2 className="mb-3 text-lg font-light">{t('dashboard.askAssistant')}</h2>
          <GlassCard className="flex h-full flex-col justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber"><Bot className="h-5 w-5" aria-hidden="true" /></span>
              <p className="text-sm text-mist/75">{t('dashboard.askAssistantHint')}</p>
            </div>
            <GlassButton variant="primary" className="mt-4 self-start text-sm" onClick={() => window.dispatchEvent(new Event('assistant:open'))}>
              {t('dashboard.openAssistant')}
            </GlassButton>
          </GlassCard>
        </div>
      </Reveal>
    </div>
  );
}
