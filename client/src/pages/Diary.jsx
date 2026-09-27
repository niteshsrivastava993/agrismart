import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import AuthImage from '../components/ui/AuthImage.jsx';
import ImagePicker from '../components/ui/ImagePicker.jsx';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton } from '../components/ui/Glass.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { fmtDate } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

const TEXT = ['irrigation', 'fertilizer', 'pesticide', 'observation', 'notes'];
const blank = (field = '') => ({ field, date: new Date().toISOString().slice(0, 10), activity: '', irrigation: '', fertilizer: '', pesticide: '', observation: '', notes: '', imageId: null });

export default function Diary() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [fieldFilter, setFieldFilter] = useState(params.get('field') || '');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [order, setOrder] = useState('desc');
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => { const t = setTimeout(() => setDq(q), 350); return () => clearTimeout(t); }, [q]);

  const fields = useApi('/fields');
  const qs = new URLSearchParams({ order, ...(dq && { q: dq }), ...(fieldFilter && { field: fieldFilter }) });
  const list = useApi(`/diary?${qs}&r=${tick}`);
  const fieldList = fields.data?.fields ?? [];
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const open = (entry) => {
    setEditingId(entry?._id ?? null); setError(''); setFieldErrors({});
    setForm(entry ? { ...blank(), ...Object.fromEntries(['activity', ...TEXT].map((k) => [k, entry[k] ?? ''])), field: entry.field?._id ?? '', date: entry.date.slice(0, 10), imageId: entry.imageId ?? null } : blank(fieldFilter || fieldList[0]?._id || ''));
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      await api(editingId ? `/diary/${editingId}` : '/diary', { method: editingId ? 'PATCH' : 'POST', body: form });
      setForm(null); setTick((t) => t + 1);
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }

  async function remove(entry) {
    if (!window.confirm(`Delete “${entry.activity}”?`)) return;
    try { await api(`/diary/${entry._id}`, { method: 'DELETE' }); setTick((t) => t + 1); } catch (err) { setError(err.message); }
  }

  const entries = list.data?.entries ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">{t('p.diary.crop_diary')}</h1><p className="text-sm text-mist/70">{t('p.diary.a_running_journal_of')}</p></div>
        {!form && fieldList.length > 0 && <GlassButton variant="primary" onClick={() => open(null)}><Plus className="h-4 w-4" aria-hidden="true" />{t('p.diary.new_entry')}</GlassButton>}
      </div>

      {form && (
        <GlassCard className="fade-in">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
            <GlassInput as="select" name="field" label={t('p.diary.field')} required value={form.field} onChange={set} error={fieldErrors.field}>
              {fieldList.map((f) => <option key={f._id} value={f._id}>{f.name} · {f.crop}</option>)}
            </GlassInput>
            <GlassInput name="date" type="date" label={t('p.diary.date')} required value={form.date} onChange={set} error={fieldErrors.date} />
            <GlassInput name="activity" label={t('p.diary.activity_eg_sowing_weeding')} required className="sm:col-span-2" value={form.activity} onChange={set} error={fieldErrors.activity} />
            {TEXT.map((k) => (
              <GlassInput key={k} as={k === 'notes' || k === 'observation' ? 'textarea' : 'input'} rows={2} name={k}
                label={t(`l.d_${k}`)} value={form[k]} onChange={set} error={fieldErrors[k]} />
            ))}
            <ImagePicker value={form.imageId} onChange={(id) => setForm((f) => ({ ...f, imageId: id }))} />
            {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <GlassButton type="submit" variant="primary" loading={busy}>{editingId ? t('common.saveChanges') : t('l.add_entry')}</GlassButton>
              <GlassButton type="button" onClick={() => setForm(null)}>{t('p.diary.cancel')}</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      <GlassCard className="grid gap-3 sm:grid-cols-3">
        <GlassInput name="q" label={t('p.diary.search')} placeholder={t('p.diary.activity_crop_notes')} value={q} onChange={(e) => setQ(e.target.value)} />
        <GlassInput as="select" name="fieldFilter" label={t('p.diary.field')} value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
          <option value="">{t('p.diary.all_fields')}</option>{fieldList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </GlassInput>
        <GlassInput as="select" name="order" label={t('p.diary.sort_by_date')} value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="desc">{t('p.diary.newest_first')}</option><option value="asc">{t('p.diary.oldest_first')}</option>
        </GlassInput>
      </GlassCard>

      {list.loading || fields.loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-24" />)}</div>
      ) : list.error ? <GlassCard><p role="alert" className="text-amber">{list.error}</p></GlassCard>
      : fieldList.length === 0 ? <EmptyState icon={BookOpen} title={t('p.diary.no_fields_added_yet')} hint={t('p.diary.add_a_field_first')} />
      : entries.length === 0 ? <EmptyState icon={BookOpen} title={t('p.diary.no_diary_entries_yet')} hint={dq || fieldFilter ? 'Nothing matches these filters.' : 'Log your first activity to start the journal.'} />
      : (
        <ol className="relative space-y-4 border-l border-white/15 pl-5">
          {entries.map((e) => (
            <li key={e._id} className="fade-in relative">
              <span className="absolute -left-[1.6rem] top-5 h-2.5 w-2.5 rounded-full bg-amber" aria-hidden="true" />
              <GlassCard>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs text-mist/60">{fmtDate(e.date)} · {e.field?.name ?? 'Deleted field'} · {e.crop}</p><h2 className="text-lg">{e.activity}</h2></div>
                  <div className="flex shrink-0 gap-1">
                    <button aria-label={`Edit ${e.activity}`} onClick={() => open(e)} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                    <button aria-label={`Delete ${e.activity}`} onClick={() => remove(e)} className="rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {e.imageId && <AuthImage id={e.imageId} alt={`Photo for ${e.activity}`} className="mt-3 max-h-56 rounded-xl" />}
                <dl className="mt-2 space-y-0.5 text-sm text-mist/80">
                  {TEXT.filter((k) => e[k]).map((k) => <div key={k}><dt className="inline capitalize text-mist/50">{t(`l.d_${k}`)}: </dt><dd className="inline">{e[k]}</dd></div>)}
                </dl>
              </GlassCard>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
