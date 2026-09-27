import { useState } from 'react';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import { GlassButton, GlassCard, GlassInput, GlassSkeleton } from '../ui/Glass.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../services/api.js';
import { fmtDate } from '../../utils/format.js';
import { useI18n } from '../../i18n/index.jsx';

const blank = () => ({ recordedAt: new Date().toISOString().slice(0, 10), moisturePct: '', ph: '', temperatureC: '', notes: '' });
const orNull = (v) => (v === '' ? null : Number(v));

export default function SoilReadings({ fieldId }) {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const list = useApi(fieldId ? `/soil?field=${fieldId}&limit=10&r=${tick}` : null);
  const readings = list.data?.readings ?? [];
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    const body = { field: fieldId, recordedAt: form.recordedAt, moisturePct: form.moisturePct === '' ? undefined : Number(form.moisturePct), ph: orNull(form.ph), temperatureC: orNull(form.temperatureC), notes: form.notes };
    try { await api('/soil', { method: 'POST', body }); setForm(null); setTick((t) => t + 1); }
    catch (err) { setError(err.message); setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message]))); }
    finally { setBusy(false); }
  }

  async function remove(r) {
    if (!window.confirm(`Delete the reading from ${fmtDate(r.recordedAt)}?`)) return;
    try { await api(`/soil/${r._id}`, { method: 'DELETE' }); setTick((t) => t + 1); } catch (err) { setError(err.message); }
  }

  return (
    <section aria-labelledby="soil-h" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="soil-h" className="text-lg font-light">{t('p.soilreadings.soil_readings')}</h2><p className="text-xs text-mist/60">{t('p.soilreadings.entered_by_you_from')}</p></div>
        {!form && fieldId && <GlassButton onClick={() => { setForm(blank()); setError(''); setFieldErrors({}); }}><Plus className="h-4 w-4" aria-hidden="true" />{t('p.soilreadings.add_reading')}</GlassButton>}
      </div>

      {form && (
        <GlassCard className="fade-in">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" noValidate>
            <GlassInput name="recordedAt" type="date" label={t('p.soilreadings.date')} required value={form.recordedAt} onChange={set} error={fieldErrors.recordedAt} />
            <GlassInput name="moisturePct" type="number" min="0" max="100" step="any" label={t('p.soilreadings.moisture')} required value={form.moisturePct} onChange={set} error={fieldErrors.moisturePct} />
            <GlassInput name="ph" type="number" min="0" max="14" step="any" label={t('p.soilreadings.ph_optional')} value={form.ph} onChange={set} error={fieldErrors.ph} />
            <GlassInput name="temperatureC" type="number" step="any" label={t('p.soilreadings.soil_temp_c_optional')} value={form.temperatureC} onChange={set} error={fieldErrors.temperatureC} />
            <GlassInput name="notes" label={t('p.soilreadings.notes')} className="sm:col-span-2 lg:col-span-4" value={form.notes} onChange={set} error={fieldErrors.notes} />
            {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2 lg:col-span-4">{error}</p>}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <GlassButton type="submit" variant="primary" loading={busy}>{t('p.soilreadings.save_reading')}</GlassButton>
              <GlassButton type="button" onClick={() => setForm(null)}>{t('p.soilreadings.cancel')}</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {list.loading && !list.data ? <GlassSkeleton className="h-24" /> : list.error ? <p role="alert" className="text-sm text-amber">{list.error}</p>
        : readings.length === 0 ? <GlassCard className="flex items-center gap-3 text-sm text-mist/70"><Droplets className="h-5 w-5 text-sage" aria-hidden="true" />{t('p.soilreadings.no_soil_readings_yet')}</GlassCard>
        : (
          <GlassCard className="p-0">
            <p className="px-5 pt-4 text-xs uppercase tracking-widest text-mist/60">{t('p.soilreadings.latest_moisture')}</p>
            <p className="px-5 text-4xl font-light">{readings[0].moisturePct}%<span className="ml-2 text-xs text-mist/60">{fmtDate(readings[0].recordedAt)}</span></p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-mist/60"><tr>{[t('p.soilreadings.date'), t('l.s_moisture'), 'pH', t('l.s_temp'), ''].map((h, i) => <th key={i} scope="col" className="px-5 py-2 font-normal">{h || <span className="sr-only">{t('p.soilreadings.actions')}</span>}</th>)}</tr></thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r._id} className="border-t border-white/10">
                      <td className="px-5 py-2">{fmtDate(r.recordedAt)}</td>
                      <td className="px-5 py-2">{r.moisturePct}%</td>
                      <td className="px-5 py-2">{r.ph ?? t('l.s_not_recorded')}</td>
                      <td className="px-5 py-2">{r.temperatureC === null ? t('l.s_not_recorded') : `${r.temperatureC}°C`}</td>
                      <td className="px-5 py-2 text-right"><button aria-label={`Delete reading from ${fmtDate(r.recordedAt)}`} onClick={() => remove(r)} className="rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
    </section>
  );
}
