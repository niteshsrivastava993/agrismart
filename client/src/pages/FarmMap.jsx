import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Eraser, LocateFixed, PenLine, Sprout, Undo2, X } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassLinkButton, GlassSkeleton, SourceNote } from '../components/ui/Glass.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { polygonAreaAcres } from '../utils/geo.js';
import { HEALTH_BANDS, healthBand } from '../utils/health.js';
import { satelliteTile } from '../utils/mapbox.js';
import { fmtDate } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

function View({ points, target }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 13);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  useEffect(() => { if (target) map.flyTo(target, 14); }, [map, target]);
  return null;
}

function DrawEvents({ active, onAdd }) {
  useMapEvents({ click(e) { if (active) onAdd([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]); } });
  return null;
}

function FieldSheet({ field, onClose, onDraw, health, soil }) {
  const { t } = useI18n();
  const weather = useApi(`/weather/current?lat=${field.latitude}&lon=${field.longitude}`);
  const diary = useApi(`/diary?field=${field._id}&limit=3`);
  const age = field.sowingDate ? Math.floor((Date.now() - new Date(field.sowingDate)) / 864e5) : null;
  const w = weather.data;
  return (
    <GlassCard className="fade-in fixed inset-x-3 bottom-24 z-30 max-h-[55vh] overflow-y-auto md:static md:max-h-none">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl">{field.name}</h2><p className="text-sm text-amber">{field.crop}</p></div>
        <button onClick={onClose} aria-label={t('p.farmmap.close_details')} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-mist/80">
        <dt>{t('p.farmmap.area')}</dt><dd>{field.areaAcres} acres</dd>
        <dt>{t('p.farmmap.crop_age')}</dt><dd>{age === null ? t('l.na') : age < 0 ? t('l.not_sown') : `${age} days`}</dd>
        <dt>{t('p.farmmap.sown')}</dt><dd>{fmtDate(field.sowingDate)}</dd>
        <dt>{t('p.farmmap.harvest')}</dt><dd>{fmtDate(field.expectedHarvestDate)}</dd>
        <dt>{t('p.farmmap.soil')}</dt><dd>{field.soilType || t('l.s_not_recorded')}</dd>
        <dt>{t('p.farmmap.irrigation')}</dt><dd>{field.irrigationType || t('l.s_not_recorded')}</dd>
        <dt>{t('p.farmmap.crop_health')}</dt><dd>{health ? `${health.healthScore}% · ${fmtDate(health.date)}` : t('l.no_record')}</dd>
        <dt>{t('p.farmmap.soil_moisture')}</dt><dd>{soil ? `${soil.moisturePct}% · ${fmtDate(soil.recordedAt)}` : t('l.no_reading')}</dd>
        <dt>{t('p.farmmap.boundary')}</dt><dd>{field.boundary?.length >= 3 ? `${field.boundary.length} points` : t('l.not_drawn')}</dd>
      </dl>
      <h3 className="mb-1 mt-4 text-xs uppercase tracking-widest text-mist/60">{t('p.farmmap.weather')}</h3>
      {weather.loading ? <GlassSkeleton className="h-10" /> : weather.error ? <p className="text-sm text-amber">{weather.error}</p> : (
        <><p>{Math.round(w.temperatureC)}°C <span className="text-xs capitalize text-mist/70">{w.description}</span></p>
          <SourceNote source={w.source} fetchedAt={w.fetchedAt} stale={w.stale} /></>
      )}
      <h3 className="mb-1 mt-4 text-xs uppercase tracking-widest text-mist/60">{t('p.farmmap.recent_diary')}</h3>
      {diary.loading ? <GlassSkeleton className="h-10" /> : diary.error ? <p className="text-sm text-amber">{diary.error}</p>
        : diary.data.entries.length === 0 ? <p className="text-sm text-mist/70">{t('p.farmmap.no_diary_entries_yet')}</p>
        : <ul className="space-y-1 text-sm">{diary.data.entries.map((e) => <li key={e._id}><span className="text-mist/60">{fmtDate(e.date)}</span> · {e.activity}</li>)}</ul>}
      <div className="mt-4 flex flex-wrap gap-2">
        <GlassButton className="basis-full" onClick={() => onDraw(field)}><PenLine className="h-4 w-4" aria-hidden="true" />{field.boundary?.length >= 3 ? 'Edit boundary' : 'Draw boundary'}</GlassButton>
        <GlassLinkButton to={`/farmer/crop-health?field=${field._id}`} className="w-full basis-full">{t('p.farmmap.view_crop_health')}</GlassLinkButton>
        <GlassLinkButton to={`/farmer/diary?field=${field._id}`} variant="primary" className="w-full flex-1">{t('p.farmmap.open_diary')}</GlassLinkButton>
        <GlassLinkButton to="/farmer/fields" className="w-full flex-1">{t('p.farmmap.manage_fields')}</GlassLinkButton>
      </div>
    </GlassCard>
  );
}

export default function FarmMap() {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const fields = useApi(`/fields?r=${tick}`);
  const latestHealth = useApi('/crop-health/latest');
  const latestSoil = useApi('/soil/latest');
  const healthByField = useMemo(() => new Map((latestHealth.data?.latest ?? []).map((h) => [h.field, h])), [latestHealth.data]);
  const soilByField = useMemo(() => new Map((latestSoil.data?.latest ?? []).map((s) => [s.field, s])), [latestSoil.data]);
  const band = (id) => healthBand(healthByField.get(id)?.healthScore);
  const [crop, setCrop] = useState('');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [me, setMe] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [drawing, setDrawing] = useState(null); // { id, name, points }
  const [setArea, setSetArea] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawError, setDrawError] = useState('');
  const [layer, setLayer] = useState('street');
  const [satError, setSatError] = useState(false);
  const sat = satelliteTile(import.meta.env.VITE_MAPBOX_TOKEN);

  const all = useMemo(() => fields.data?.fields ?? [], [fields.data]);
  const crops = useMemo(() => [...new Set(all.map((f) => f.crop))].sort(), [all]);
  const shown = useMemo(() => all.filter((f) =>
    (!crop || f.crop === crop) && (!q.trim() || `${f.name} ${f.crop}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, crop, q]);
  const points = useMemo(() => shown.map((f) => [f.latitude, f.longitude]), [shown]);
  const selected = all.find((f) => f._id === selectedId);
  const drawnArea = drawing ? polygonAreaAcres(drawing.points) : 0;

  function locate() {
    setGeoError('');
    if (!navigator.geolocation) return setGeoError('Location is not supported in this browser.');
    navigator.geolocation.getCurrentPosition((p) => setMe([p.coords.latitude, p.coords.longitude]), () => setGeoError('Location permission was not granted.'));
  }

  const startDraw = (f) => { setDrawing({ id: f._id, name: f.name, points: (f.boundary ?? []).map((p) => [...p]) }); setSetArea(false); setDrawError(''); };

  async function saveBoundary() {
    setSaving(true); setDrawError('');
    try {
      await api(`/fields/${drawing.id}`, { method: 'PATCH', body: { boundary: drawing.points, ...(setArea && drawnArea > 0 && { areaAcres: Number(drawnArea.toFixed(2)) }) } });
      setDrawing(null); setTick((t) => t + 1);
    } catch (e) { setDrawError(e.details?.[0]?.message || e.message); }
    finally { setSaving(false); }
  }

  if (fields.loading && !fields.data) return <GlassSkeleton className="h-[60vh]" />;
  if (fields.error) return <GlassCard><p role="alert" className="text-amber">{fields.error}</p></GlassCard>;
  if (all.length === 0) {
    return <EmptyState icon={Sprout} title={t('p.farmmap.no_fields_added_yet')} hint={t('p.farmmap.add_your_first_field')}>
      <GlassLinkButton to="/farmer/fields" variant="primary">{t('p.farmmap.add_a_field')}</GlassLinkButton></EmptyState>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">{t('p.farmmap.farm_map')}</h1>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <GlassInput name="search" label={t('p.farmmap.search_fields')} placeholder={t('p.farmmap.name_or_crop')} value={q} onChange={(e) => setQ(e.target.value)} />
        <GlassInput as="select" name="crop" label={t('p.farmmap.crop')} value={crop} onChange={(e) => setCrop(e.target.value)}>
          <option value="">{t('p.farmmap.all_crops')}</option>{crops.map((c) => <option key={c}>{c}</option>)}
        </GlassInput>
        <GlassButton onClick={locate}><LocateFixed className="h-4 w-4" aria-hidden="true" />{t('p.farmmap.my_location')}</GlassButton>
      </div>
      {geoError && <p role="alert" className="text-sm text-amber">{geoError}</p>}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('l.map_layer')}>
        {[['street', t('l.map_street')], ['satellite', t('l.map_satellite')]].map(([k, label]) => (
          <GlassButton key={k} aria-pressed={layer === k} disabled={k === 'satellite' && !sat} onClick={() => { setLayer(k); setSatError(false); }} className={`px-3 py-1.5 text-xs ${layer === k ? '!bg-white/25' : ''}`}>{label}</GlassButton>
        ))}
        {!sat && <span className="text-xs text-mist/60">{t('l.map_sat_token')}</span>}
        {layer === 'satellite' && satError && <span role="alert" className="text-xs text-amber">{t('l.map_sat_error')}</span>}
      </div>

      {drawing && (
        <GlassCard className="fade-in space-y-3">
          <p className="text-sm">{t('p.farmmap.drawing_boundary_for')} <strong className="font-medium">{drawing.name}</strong>{t('p.farmmap.tap_or_click_the')} <span className="text-mist/70">({drawing.points.length} points{drawing.points.length >= 3 && ` · about ${drawnArea.toFixed(2)} acres`})</span></p>
          {drawing.points.length > 0 && drawing.points.length < 3 && <p className="text-xs text-amber">{t('p.farmmap.add_at_least_3')}</p>}
          {drawing.points.length >= 3 && (
            <label className="flex items-center gap-2 text-xs text-mist/80">
              <input type="checkbox" checked={setArea} onChange={(e) => setSetArea(e.target.checked)} /> Also set this field's area to {drawnArea.toFixed(2)} acres
            </label>
          )}
          {drawError && <p role="alert" className="text-sm text-red-300">{drawError}</p>}
          <div className="flex flex-wrap gap-2">
            <GlassButton onClick={() => setDrawing((d) => ({ ...d, points: d.points.slice(0, -1) }))} disabled={!drawing.points.length}><Undo2 className="h-4 w-4" aria-hidden="true" />{t('p.farmmap.undo')}</GlassButton>
            <GlassButton onClick={() => setDrawing((d) => ({ ...d, points: [] }))} disabled={!drawing.points.length}><Eraser className="h-4 w-4" aria-hidden="true" />{t('p.farmmap.clear')}</GlassButton>
            <GlassButton variant="primary" loading={saving} onClick={saveBoundary} disabled={drawing.points.length === 1 || drawing.points.length === 2}>{t('p.farmmap.save_boundary')}</GlassButton>
            <GlassButton onClick={() => setDrawing(null)}>{t('p.farmmap.cancel')}</GlassButton>
          </div>
        </GlassCard>
      )}

      <div className={`grid gap-4 ${selected && !drawing ? 'md:grid-cols-[1fr_22rem]' : ''}`}>
        <div className={`glass isolate overflow-hidden p-0 ${drawing ? 'drawing' : ''} ${layer === 'satellite' && sat ? 'satellite' : ''}`}>
          <MapContainer center={[22.5, 79]} zoom={5} className="h-[60vh] min-h-[360px] w-full" aria-label={t('p.farmmap.map_of_your_fields')}>
            {layer === 'satellite' && sat ? (
              <TileLayer key="satellite" attribution={sat.attribution} url={sat.url} eventHandlers={{ tileerror: () => setSatError(true) }} />
            ) : (
              <TileLayer key="street" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            )}
            <View points={points} target={me} />
            <DrawEvents active={Boolean(drawing)} onAdd={(p) => setDrawing((d) => ({ ...d, points: [...d.points, p] }))} />
            {shown.filter((f) => f.boundary?.length >= 3 && f._id !== drawing?.id).map((f) => (
              <Polygon key={`b-${f._id}`} positions={f.boundary} pathOptions={{ color: f._id === selectedId ? '#F4F0E8' : '#D9A441', weight: 2, fillColor: '#D9A441', fillOpacity: 0.15 }} />
            ))}
            {drawing && drawing.points.length >= 3 && <Polygon positions={drawing.points} pathOptions={{ color: '#8EA9B8', weight: 2, dashArray: '6 4', fillColor: '#8EA9B8', fillOpacity: 0.2 }} />}
            {drawing && drawing.points.length === 2 && <Polyline positions={drawing.points} pathOptions={{ color: '#8EA9B8', weight: 2, dashArray: '6 4' }} />}
            {drawing?.points.map((p, i) => <CircleMarker key={`v-${i}`} center={p} radius={5} pathOptions={{ color: '#F4F0E8', fillColor: '#8EA9B8', fillOpacity: 1, weight: 2 }} />)}
            {shown.map((f) => (
              <CircleMarker key={f._id} center={[f.latitude, f.longitude]} radius={f._id === selectedId ? 14 : 10}
                pathOptions={{ color: f._id === selectedId ? '#F4F0E8' : band(f._id).color, fillColor: band(f._id).color, fillOpacity: 0.6, weight: 2 }}
                eventHandlers={{ click: () => { if (!drawing) setSelectedId(f._id); } }}>
                <Tooltip>{f.name} · {f.crop} · {t(`l.hb_${band(f._id).key}`)}</Tooltip>
              </CircleMarker>
            ))}
            {me && <CircleMarker center={me} radius={8} pathOptions={{ color: '#8EA9B8', fillColor: '#8EA9B8', fillOpacity: 0.7 }}><Tooltip>{t('p.farmmap.you_are_here')}</Tooltip></CircleMarker>}
          </MapContainer>
        </div>
        {selected && !drawing && <FieldSheet key={selected._id} field={selected} onClose={() => setSelectedId(null)} onDraw={startDraw} health={healthByField.get(selected._id)} soil={soilByField.get(selected._id)} />}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mist/70" aria-label={t('p.farmmap.marker_colour_legend')}>
        <li className="w-full">{t('p.farmmap.marker_colour_shows_the')}</li>
        {['good', 'fair', 'poor', 'unknown'].map((k) => (
          <li key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: HEALTH_BANDS[k].color }} aria-hidden="true" />{t(`l.hb_${k}`)} {HEALTH_BANDS[k].range}</li>
        ))}
      </ul>
      {shown.length === 0 && <p className="text-sm text-mist/70">{t('p.farmmap.no_fields_match_this')}</p>}
    </div>
  );
}
