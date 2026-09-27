import { lazy, Suspense, useState } from 'react';
import { ScanEye, Sparkles, Trash2 } from 'lucide-react';
import AuthImage from '../ui/AuthImage.jsx';
import ImagePicker from '../ui/ImagePicker.jsx';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton } from '../ui/Glass.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../services/api.js';
import { fmtDate } from '../../utils/format.js';
import { useI18n } from '../../i18n/index.jsx';

const FloatingMotif = lazy(() => import('../ui/FloatingMotif.jsx'));

const SEVERITY_STYLE = { low: 'text-sage', moderate: 'text-amber', high: 'text-red-300', unknown: 'text-mist/70' };

function SeverityBadge({ severity, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.unknown}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

function AnalysisResult({ record, t }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg">{record.possibleIssue}</h3>
        <SeverityBadge severity={record.severity} label={t(`l.severity_${record.severity}`)} />
      </div>
      <p className="text-sm text-mist/85">{record.explanation}</p>
      {record.recommendedActions?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-mist/60">{t('p.cropanalysis.recommended_actions')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-mist/85">
            {record.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {record.preventiveMeasures?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-mist/60">{t('p.cropanalysis.preventive_measures')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-mist/85">
            {record.preventiveMeasures.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {record.whenToSeekHelp && (
        <p className="text-sm text-mist/85"><span className="text-mist/60">{t('p.cropanalysis.when_to_seek_help')}: </span>{record.whenToSeekHelp}</p>
      )}
      {(record.contextUsed?.soilMoisturePct != null || record.contextUsed?.weatherCondition) && (
        <p className="text-xs text-mist/60">
          {t('p.cropanalysis.context_used')}:{' '}
          {[
            record.contextUsed.soilMoisturePct != null && `${t('p.cropanalysis.soil_moisture')} ${record.contextUsed.soilMoisturePct}%`,
            record.contextUsed.weatherCondition && `${record.contextUsed.weatherCondition}${record.contextUsed.weatherTemperatureC != null ? ` ${record.contextUsed.weatherTemperatureC}\u00b0C` : ''}`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}
      <p className="border-t border-white/10 pt-2 text-xs text-mist/60">{record.disclaimer}</p>
    </div>
  );
}

export default function CropHealthAssistant({ fieldId, crop }) {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const [imageId, setImageId] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [openId, setOpenId] = useState(null);

  const list = useApi(fieldId ? `/crop-health/analyses?field=${fieldId}&limit=10&r=${tick}` : null);
  const analyses = list.data?.records ?? [];

  async function analyze(e) {
    e.preventDefault();
    if (!imageId) { setError(t('p.cropanalysis.add_a_photo_first')); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const { record } = await api('/crop-health/analyze', { method: 'POST', body: { field: fieldId, imageId, crop, symptoms: symptoms || undefined } });
      setResult(record);
      setImageId(null); setSymptoms(''); setTick((n) => n + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!window.confirm(t('p.cropanalysis.delete_this_analysis'))) return;
    try { await api(`/crop-health/analyses/${id}`, { method: 'DELETE' }); setTick((n) => n + 1); if (openId === id) setOpenId(null); }
    catch (err) { setError(err.message); }
  }

  return (
    <section aria-labelledby="crop-analysis-h" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="crop-analysis-h" className="flex items-center gap-2 text-lg font-light"><Sparkles className="h-4 w-4 text-amber" aria-hidden="true" />{t('p.cropanalysis.ai_photo_analysis')}</h2>
          <p className="text-xs text-mist/60">{t('p.cropanalysis.upload_a_clear_photo')}</p>
        </div>
        <Suspense fallback={null}><FloatingMotif icon={ScanEye} className="-mt-3 scale-75 origin-top-right" /></Suspense>
      </div>

      <GlassCard className="fade-in">
        <form onSubmit={analyze} className="grid gap-3 sm:grid-cols-2" noValidate>
          <ImagePicker value={imageId} onChange={setImageId} label={t('p.cropanalysis.crop_photo')} />
          <GlassInput as="textarea" rows={2} name="symptoms" label={t('p.cropanalysis.symptoms_optional')} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <GlassButton type="submit" variant="primary" loading={busy} disabled={!fieldId}>
              <ScanEye className="h-4 w-4" aria-hidden="true" />{t('p.cropanalysis.analyze_photo')}
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {result && <GlassCard className="fade-in"><AnalysisResult record={result} t={t} /></GlassCard>}

      {list.loading && !list.data ? <GlassSkeleton className="h-24" /> : list.error ? <p role="alert" className="text-sm text-amber">{list.error}</p>
        : analyses.length === 0 ? <EmptyState icon={ScanEye} title={t('p.cropanalysis.no_analyses_yet')} hint={t('p.cropanalysis.analyze_a_photo_to')} />
        : (
          <ol className="relative space-y-3 border-l border-white/15 pl-5" aria-label={t('p.cropanalysis.analysis_history')}>
            {analyses.map((r) => (
              <li key={r._id} className="fade-in relative">
                <span className="absolute -left-[1.6rem] top-5 h-2.5 w-2.5 rounded-full bg-amber" aria-hidden="true" />
                <GlassCard>
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setOpenId(openId === r._id ? null : r._id)} aria-expanded={openId === r._id} className="flex-1 text-left">
                      <p className="text-xs text-mist/60">{fmtDate(r.createdAt)}</p>
                      <p className="text-base">{r.possibleIssue} <SeverityBadge severity={r.severity} label={t(`l.severity_${r.severity}`)} /></p>
                    </button>
                    <button type="button" aria-label={`Delete analysis from ${fmtDate(r.createdAt)}`} onClick={() => remove(r._id)} className="shrink-0 rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {openId === r._id && (
                    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                      {r.imageId && <AuthImage id={r.imageId} alt={`Photo analyzed on ${fmtDate(r.createdAt)}`} className="max-h-56 rounded-xl" />}
                      <AnalysisResult record={r} t={t} />
                    </div>
                  )}
                </GlassCard>
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}
