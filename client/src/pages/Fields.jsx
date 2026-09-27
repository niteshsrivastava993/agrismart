import { useCallback, useEffect, useState } from 'react';
import { LocateFixed, Pencil, Plus, Sprout, Trash2 } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton } from '../components/ui/Glass.jsx';
import { api } from '../services/api.js';
import { fmtDate } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

const EMPTY = { name: '', crop: '', areaAcres: '', latitude: '', longitude: '', sowingDate: '', expectedHarvestDate: '', soilType: '', irrigationType: '', notes: '' };
const NUMERIC = ['areaAcres', 'latitude', 'longitude'];
const toPayload = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '').map(([k, v]) => [k, NUMERIC.includes(k) ? Number(v) : v]));
const toForm = (f) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, k.endsWith('Date') ? (f[k] || '').slice(0, 10) : f[k] ?? '']));

export default function Fields() {
  const { t } = useI18n();
  const [list, setList] = useState({ loading: true, items: [], error: '' });
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(() =>
    api('/fields').then((d) => setList({ loading: false, items: d.fields, error: '' }))
      .catch((e) => setList({ loading: false, items: [], error: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const open = (field) => { setEditingId(field?._id ?? null); setForm(field ? toForm(field) : EMPTY); setError(''); setFieldErrors({}); };
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function locate() {
    if (!navigator.geolocation) return setError('Location is not supported in this browser.');
    navigator.geolocation.getCurrentPosition(
      (p) => setForm((f) => ({ ...f, latitude: p.coords.latitude.toFixed(5), longitude: p.coords.longitude.toFixed(5) })),
      () => setError('Location permission was not granted.')
    );
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      await api(editingId ? `/fields/${editingId}` : '/fields', { method: editingId ? 'PATCH' : 'POST', body: toPayload(form) });
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }

  async function remove(f) {
    if (!window.confirm(`Delete field "${f.name}"?`)) return;
    try { await api(`/fields/${f._id}`, { method: 'DELETE' }); await load(); } catch (err) { setList((l) => ({ ...l, error: err.message })); }
  }

  const text = [['name', t('l.f_name'), 'text'], ['crop', t('l.f_crop'), 'text'], ['areaAcres', t('l.f_areaAcres'), 'number'],
    ['latitude', t('l.f_latitude'), 'number'], ['longitude', t('l.f_longitude'), 'number'], ['sowingDate', t('l.f_sowingDate'), 'date'],
    ['expectedHarvestDate', t('l.f_expectedHarvestDate'), 'date'], ['soilType', t('l.f_soilType'), 'text'], ['irrigationType', t('l.f_irrigationType'), 'text']];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">{t('p.fields.fields')}</h1><p className="text-sm text-mist/70">{t('p.fields.every_field_you_track')}</p></div>
        {!form && <GlassButton variant="primary" onClick={() => open(null)}><Plus className="h-4 w-4" aria-hidden="true" />{t('p.fields.add_field')}</GlassButton>}
      </div>

      {form && (
        <GlassCard className="fade-in">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
            {text.map(([name, label, type]) => (
              <GlassInput key={name} name={name} label={label} type={type} step={type === 'number' ? 'any' : undefined}
                required={['name', 'crop', 'areaAcres', 'latitude', 'longitude'].includes(name)}
                value={form[name]} onChange={set} error={fieldErrors[name]} />
            ))}
            <GlassInput as="textarea" rows={2} name="notes" label={t('p.fields.notes')} className="sm:col-span-2 lg:col-span-3" value={form.notes} onChange={set} />
            {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2 lg:col-span-3">{error}</p>}
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              <GlassButton type="submit" variant="primary" loading={busy}>{editingId ? t('common.saveChanges') : t('l.create_field')}</GlassButton>
              <GlassButton type="button" onClick={locate}><LocateFixed className="h-4 w-4" aria-hidden="true" />{t('p.fields.use_my_location')}</GlassButton>
              <GlassButton type="button" onClick={() => setForm(null)}>{t('p.fields.cancel')}</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {list.error && <p role="alert" className="text-sm text-red-300">{list.error}</p>}
      {list.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-40" />)}</div>
      ) : list.items.length === 0 && !list.error ? (
        <EmptyState icon={Sprout} title={t('p.fields.no_fields_added_yet')} hint={t('p.fields.add_your_first_field')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((f) => (
            <GlassCard key={f._id} className="fade-in">
              <div className="flex items-start justify-between">
                <div><h2 className="text-lg">{f.name}</h2><p className="text-sm text-amber">{f.crop}</p></div>
                <div className="flex gap-1">
                  <button aria-label={`Edit ${f.name}`} onClick={() => open(f)} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${f.name}`} onClick={() => remove(f)} className="rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-mist/80">
                <dt>{t('p.fields.area')}</dt><dd>{f.areaAcres} acres</dd>
                <dt>{t('p.fields.location')}</dt><dd>{f.latitude.toFixed(3)}, {f.longitude.toFixed(3)}</dd>
                <dt>{t('p.fields.sown')}</dt><dd>{fmtDate(f.sowingDate)}</dd>
                <dt>{t('p.fields.harvest')}</dt><dd>{fmtDate(f.expectedHarvestDate)}</dd>
              </dl>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
