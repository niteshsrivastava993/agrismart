import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HeartPulse, Pencil, Plus, Trash2 } from 'lucide-react';
import AuthImage from '../components/ui/AuthImage.jsx';
import ImagePicker from '../components/ui/ImagePicker.jsx';
import SoilReadings from '../components/crop/SoilReadings.jsx';
import CropHealthAssistant from '../components/crop/CropHealthAssistant.jsx';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton } from '../components/ui/Glass.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { fmtDate } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

const ISSUES = { none: 'No issue', disease: 'Disease', pest: 'Pest', nutrient: 'Nutrient deficiency', water: 'Water stress', other: 'Other' };
const blank = () => ({ date: new Date().toISOString().slice(0, 10), healthScore: '', growthStage: '', issueType: 'none', observation: '', notes: '', imageId: null });
const short = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function CropHealth() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [fieldId, setFieldId] = useState(params.get('field') || '');
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fields = useApi('/fields');
  const fieldList = fields.data?.fields ?? [];
  const active = fieldId || fieldList[0]?._id || '';
  const activeField = fieldList.find((f) => f._id === active);
  const list = useApi(active ? `/crop-health?field=${active}&order=asc&limit=100&r=${tick}` : null);
  const records = useMemo(() => list.data?.records ?? [], [list.data]);
  const latest = records[records.length - 1];
  const chartData = useMemo(() => records.map((r) => ({ date: short(r.date), score: r.healthScore })), [records]);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const open = (r) => {
    setEditingId(r?._id ?? null); setError(''); setFieldErrors({});
    setForm(r ? { date: r.date.slice(0, 10), healthScore: String(r.healthScore), growthStage: r.growthStage ?? '', issueType: r.issueType, observation: r.observation ?? '', notes: r.notes ?? '', imageId: r.imageId ?? null } : blank());
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    const body = { ...form, field: active, healthScore: form.healthScore === '' ? undefined : Number(form.healthScore) };
    try {
      await api(editingId ? `/crop-health/${editingId}` : '/crop-health', { method: editingId ? 'PATCH' : 'POST', body });
      setForm(null); setTick((t) => t + 1);
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }

  async function remove(r) {
    if (!window.confirm(`Delete the record from ${fmtDate(r.date)}?`)) return;
    try { await api(`/crop-health/${r._id}`, { method: 'DELETE' }); setTick((t) => t + 1); } catch (err) { setError(err.message); }
  }

  if (fields.loading) return <GlassSkeleton className="h-64" />;
  if (fields.error) return <GlassCard><p role="alert" className="text-amber">{fields.error}</p></GlassCard>;
  if (fieldList.length === 0) return <EmptyState icon={HeartPulse} title={t('p.crophealth.no_fields_added_yet')} hint={t('p.crophealth.add_a_field_first')} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl">{t('p.crophealth.crop_health')}</h1><p className="text-sm text-mist/70">{t('p.crophealth.scores_are_entered_by')}</p></div>
        {!form && <GlassButton variant="primary" onClick={() => open(null)}><Plus className="h-4 w-4" aria-hidden="true" />{t('p.crophealth.new_record')}</GlassButton>}
      </div>

      <GlassInput as="select" name="field" label={t('p.crophealth.field')} className="max-w-xs" value={active} onChange={(e) => setFieldId(e.target.value)}>
        {fieldList.map((f) => <option key={f._id} value={f._id}>{f.name} · {f.crop}</option>)}
      </GlassInput>

      {form && (
        <GlassCard className="fade-in">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
            <GlassInput name="date" type="date" label={t('p.crophealth.date')} required value={form.date} onChange={set} error={fieldErrors.date} />
            <GlassInput name="healthScore" type="number" min="0" max="100" step="1" label={t('p.crophealth.health_score_0100')} required value={form.healthScore} onChange={set} error={fieldErrors.healthScore} />
            <GlassInput name="growthStage" label={t('p.crophealth.growth_stage_eg_tillering')} value={form.growthStage} onChange={set} error={fieldErrors.growthStage} />
            <GlassInput as="select" name="issueType" label={t('p.crophealth.issue_observed')} value={form.issueType} onChange={set}>
              {Object.entries(ISSUES).map(([k]) => <option key={k} value={k}>{t(`l.issue_${k}`)}</option>)}
            </GlassInput>
            <GlassInput as="textarea" rows={2} name="observation" label={t('p.crophealth.observation')} value={form.observation} onChange={set} error={fieldErrors.observation} />
            <GlassInput as="textarea" rows={2} name="notes" label={t('p.crophealth.notes')} value={form.notes} onChange={set} error={fieldErrors.notes} />
            <ImagePicker value={form.imageId} onChange={(id) => setForm((f) => ({ ...f, imageId: id }))} />
            {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <GlassButton type="submit" variant="primary" loading={busy}>{editingId ? t('common.saveChanges') : t('l.add_record')}</GlassButton>
              <GlassButton type="button" onClick={() => setForm(null)}>{t('p.crophealth.cancel')}</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {list.loading ? <GlassSkeleton className="h-64" /> : list.error ? <GlassCard><p role="alert" className="text-amber">{list.error}</p></GlassCard>
        : records.length === 0 ? <EmptyState icon={HeartPulse} title={t('p.crophealth.no_health_records_yet')} hint={t('p.crophealth.add_your_first_observation')} />
        : (
          <>
            <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
              <GlassCard>
                <p className="text-xs uppercase tracking-widest text-mist/60">{t('p.crophealth.latest_score')}</p>
                <p className="mt-2 text-5xl font-light">{latest.healthScore}%</p>
                <p className="mt-2 text-xs text-mist/80">{fmtDate(latest.date)}{latest.growthStage && ` · ${latest.growthStage}`}</p>
              </GlassCard>
              <GlassCard>
                <p className="mb-2 text-xs uppercase tracking-widest text-mist/60">{t('p.crophealth.health_history')}</p>
                {records.length < 2 ? <p className="py-8 text-sm text-mist/70">{t('p.crophealth.add_another_record_to')}</p> : (
                  <div className="h-56" role="img" aria-label={t('p.crophealth.line_chart_of_recorded')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                        <YAxis domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                        <Tooltip contentStyle={{ background: 'rgba(17,19,16,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#F4F0E8' }} />
                        <Line type="monotone" dataKey="score" name="Score" stroke="#D9A441" strokeWidth={2} dot={{ r: 3, fill: '#D9A441' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>
            </div>

            <ol className="relative space-y-4 border-l border-white/15 pl-5" aria-label={t('p.crophealth.health_timeline')}>
              {[...records].reverse().map((r) => (
                <li key={r._id} className="fade-in relative">
                  <span className="absolute -left-[1.6rem] top-5 h-2.5 w-2.5 rounded-full bg-amber" aria-hidden="true" />
                  <GlassCard>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-mist/60">{fmtDate(r.date)}{r.growthStage && ` · ${r.growthStage}`}</p>
                        <p className="text-lg">{r.healthScore}% <span className="text-sm text-mist/70">{r.issueType !== 'none' && `· ${t(`l.issue_${r.issueType}`)}`}</span></p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button aria-label={`Edit record from ${fmtDate(r.date)}`} onClick={() => open(r)} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                        <button aria-label={`Delete record from ${fmtDate(r.date)}`} onClick={() => remove(r)} className="rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {r.observation && <p className="mt-2 text-sm text-mist/80">{r.observation}</p>}
                    {r.notes && <p className="mt-1 text-sm text-mist/60">{r.notes}</p>}
                    {r.imageId && <AuthImage id={r.imageId} alt={`Field photo from ${fmtDate(r.date)}`} className="mt-3 max-h-56 rounded-xl" />}
                  </GlassCard>
                </li>
              ))}
            </ol>
          </>
        )}
      <CropHealthAssistant fieldId={active} crop={activeField?.crop ?? ''} />
      <SoilReadings fieldId={active} />
    </div>
  );
}
