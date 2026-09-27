import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { GlassButton } from './Glass.jsx';
import AuthImage from './AuthImage.jsx';
import { api } from '../../services/api.js';
import { resizeToJpeg } from '../../utils/image.js';
import { useI18n } from '../../i18n/index.jsx';

export default function ImagePicker({ value, onChange, label = 'Photo' }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const blob = await resizeToJpeg(file);
      const d = await api('/media', { method: 'POST', body: blob });
      onChange(d.id);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="sm:col-span-2">
      <p className="mb-1 text-xs text-mist/80">{label}</p>
      {value && <div className="mb-2"><AuthImage id={value} alt="Attached photo" className="max-h-48 rounded-xl" /></div>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="glass-btn inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm focus-within:outline-2 focus-within:outline-amber">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {busy ? t('common.uploadingPhoto') : value ? t('common.replacePhoto') : t('common.addPhoto')}
          <input type="file" accept="image/*" onChange={pick} disabled={busy} className="sr-only" />
        </label>
        {value && <GlassButton type="button" onClick={() => onChange(null)}>{t('common.removePhoto')}</GlassButton>}
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
