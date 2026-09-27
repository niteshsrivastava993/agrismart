import { lazy, Suspense, useState } from 'react';
import { AlertTriangle, CloudRain, CloudSun, Flame, LocateFixed, Search, ShieldAlert, Snowflake, Wind } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton, SourceNote } from '../components/ui/Glass.jsx';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/index.jsx';
import { getWeatherAdvisories } from '../utils/weatherAdvisory.js';

const FloatingMotif = lazy(() => import('../components/ui/FloatingMotif.jsx'));

const COORDS = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const hour = (localTime) => { const h = Number(localTime.slice(11, 13)); return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`; };
const dayLabel = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const num = (v, unit = '') => (v === null || v === undefined ? null : `${v}${unit}`);
const ADVISORY_ICON = { frost: Snowflake, heavy_rain: CloudRain, high_wind: Wind, fungal_risk: ShieldAlert, heat: Flame };

export default function Weather() {
  const { t } = useI18n();
  const fields = useApi('/fields');
  const list = fields.data?.fields ?? [];
  const [target, setTarget] = useState(null); // { q } or { lat, lon, label }
  const [text, setText] = useState('');
  const [geoError, setGeoError] = useState('');

  const first = list[0];
  const active = target ?? (first ? { lat: first.latitude, lon: first.longitude, label: first.name } : null);
  const qs = active ? new URLSearchParams(active.q ? { q: active.q } : { lat: String(active.lat), lon: String(active.lon) }).toString() : null;
  const current = useApi(qs ? `/weather/current?${qs}` : null);
  const forecast = useApi(qs ? `/weather/forecast?${qs}` : null);
  const w = current.data;
  const advisories = w ? getWeatherAdvisories({ current: w, forecastDays: forecast.data?.days, forecastNext: forecast.data?.next }) : [];

  function search(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    const m = v.match(COORDS);
    setTarget(m ? { lat: Number(m[1]), lon: Number(m[2]), label: `${m[1]}, ${m[2]}` } : { q: v });
  }

  function locate() {
    setGeoError('');
    if (!navigator.geolocation) return setGeoError('Location is not supported in this browser.');
    navigator.geolocation.getCurrentPosition(
      (p) => setTarget({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'My location' }),
      () => setGeoError('Location permission was not granted.')
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="font-display text-3xl">{t('p.weather.weather')}</h1><p className="text-sm text-mist/70">{t('p.weather.search_a_city_or')}</p></div>
        <Suspense fallback={null}><FloatingMotif icon={CloudSun} className="-mt-2" /></Suspense>
      </div>

      <GlassCard className="space-y-3">
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <GlassInput name="place" label={t('p.weather.place_or_coordinates')} className="flex-1" placeholder={t('p.weather.lucknow')} value={text} onChange={(e) => setText(e.target.value)} />
          <GlassButton type="submit" variant="primary"><Search className="h-4 w-4" aria-hidden="true" />{t('p.weather.search')}</GlassButton>
          <GlassButton type="button" onClick={locate}><LocateFixed className="h-4 w-4" aria-hidden="true" />{t('p.weather.my_location')}</GlassButton>
        </form>
        {geoError && <p role="alert" className="text-sm text-amber">{geoError}</p>}
        {list.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('p.weather.your_fields')}>
            {list.map((f) => <button key={f._id} onClick={() => setTarget({ lat: f.latitude, lon: f.longitude, label: f.name })} className="glass-btn rounded-full px-3 py-1.5 text-xs">{f.name}</button>)}
          </div>
        )}
      </GlassCard>

      {!active ? (
        fields.loading ? <GlassSkeleton className="h-48" /> : <EmptyState icon={CloudSun} title={t('p.weather.search_for_a_place')} hint={t('p.weather.add_a_field_or')} />
      ) : (
        <>
          {current.loading && !w ? <GlassSkeleton className="h-44" /> : current.error ? <GlassCard><p role="alert" className="text-amber">{current.error}</p></GlassCard> : (
            <GlassCard className="fade-in">
              <p className="text-xs uppercase tracking-widest text-mist/60">{w.location ?? active.label ?? 'Selected location'}</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-1">
                <p className="text-6xl font-light">{w.temperatureC === null ? '—' : `${Math.round(w.temperatureC)}°C`}</p>
                <p className="pb-2 capitalize text-mist/80">{w.description ?? 'Condition not available'}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                {[['feels', w.feelsLikeC === null ? null : `${Math.round(w.feelsLikeC)}°C`], ['humidity', num(w.humidity, '%')], ['wind', w.windSpeedMs === null ? null : `${Math.round(w.windSpeedMs * 3.6)} km/h`], ['pressure', num(w.pressureHpa, ' hPa')], ['visibility', w.visibilityM === null ? null : `${(w.visibilityM / 1000).toFixed(1)} km`]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-mist/60">{t(`l.w_${k}`)}</dt><dd>{v ?? t('l.na')}</dd></div>
                ))}
              </dl>
              <SourceNote source={w.source} fetchedAt={w.fetchedAt} stale={w.stale} />
            </GlassCard>
          )}

          {w && (
            <GlassCard>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-mist/60">
                <AlertTriangle className="h-4 w-4 text-amber" aria-hidden="true" />{t('p.weather.advisories')}
              </div>
              {advisories.length === 0 ? (
                <p className="mt-3 text-sm text-mist/70">{t('p.weather.advisory_none')}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {advisories.map((id) => {
                    const Icon = ADVISORY_ICON[id];
                    return (
                      <li key={id} className="flex items-start gap-2 text-sm text-mist/85">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
                        {t(`p.weather.advisory_${id}`)}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-mist/50">{t('p.weather.advisory_disclaimer')}</p>
            </GlassCard>
          )}

          {forecast.loading && !forecast.data ? <GlassSkeleton className="h-56" /> : forecast.error ? null : (
            <>
              <GlassCard>
                <h2 className="mb-3 text-sm uppercase tracking-widest text-mist/60">{t('p.weather.next_24_hours')}</h2>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {forecast.data.next.map((s) => (
                    <div key={s.localTime} className="glass-btn min-w-[4.5rem] shrink-0 rounded-xl p-3 text-center text-sm">
                      <p className="text-xs text-mist/70">{hour(s.localTime)}</p>
                      <p className="my-1 text-lg">{s.tempC === null ? '—' : `${Math.round(s.tempC)}°`}</p>
                      <p className="text-[11px] text-mist/70">{s.rainChancePct === null ? '' : `${s.rainChancePct}% rain`}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <h2 className="mb-2 text-sm uppercase tracking-widest text-mist/60">{t('p.weather.5day_forecast')}</h2>
                <ul className="divide-y divide-white/10 text-sm">
                  {forecast.data.days.map((d) => (
                    <li key={d.date} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 py-2">
                      <span>{dayLabel(d.date)}</span>
                      <span className="text-mist/80">{d.condition ?? '—'}{d.rainChancePct !== null && ` · ${d.rainChancePct}% rain`}{d.rainMm > 0 && ` · ${d.rainMm} mm`}</span>
                      <span>{d.minC === null ? '—' : `${d.minC}°`} / {d.maxC === null ? '—' : `${d.maxC}°`}</span>
                    </li>
                  ))}
                </ul>
                <SourceNote source={forecast.data.source} fetchedAt={forecast.data.fetchedAt} stale={forecast.data.stale} />
              </GlassCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
