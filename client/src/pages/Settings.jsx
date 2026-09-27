import { useCallback, useEffect, useState } from 'react';
import { GlassButton, GlassCard, GlassInput } from '../components/ui/Glass.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api, setToken } from '../services/api.js';
import { getThemePref, setThemePref } from '../theme.js';

export default function Settings() {
  const { t, lang, changeLanguage } = useI18n();
  const [theme, setTheme] = useState(getThemePref());
  const [loc, setLoc] = useState('unknown');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const readLocation = useCallback(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((r) => setLoc(r.state)).catch(() => setLoc('unknown'));
  }, []);
  useEffect(readLocation, [readLocation]);

  function requestLocation() {
    navigator.geolocation?.getCurrentPosition(readLocation, readLocation);
  }

  async function changePassword(e) {
    e.preventDefault();
    setBusy(true); setMsg({ ok: '', error: '' }); setFieldErrors({});
    try {
      const d = await api('/users/me/password', { method: 'POST', body: pw });
      if (d.token) setToken(d.token); // other sessions are signed out; keep this one
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMsg({ ok: t('settings.passwordChanged'), error: '' });
    } catch (err) {
      setMsg({ ok: '', error: err.details?.length ? '' : err.message });
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }
  const setP = (e) => setPw((p) => ({ ...p, [e.target.name]: e.target.value }));
  const locLabel = { granted: 'settings.locGranted', denied: 'settings.locDenied', prompt: 'settings.locPrompt' }[loc] || 'settings.locUnknown';

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-3xl">{t('settings.title')}</h1>

      <GlassCard>
        <GlassInput as="select" name="language" label={t('settings.language')} value={lang} onChange={(e) => changeLanguage(e.target.value)}>
          <option value="en">English</option><option value="hi">हिन्दी</option>
        </GlassInput>
        <p className="mt-2 text-xs text-mist/60">{t('settings.languageHint')}</p>
      </GlassCard>

      <GlassCard>
        <p className="mb-2 text-xs text-mist/80">{t('settings.theme')}</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('settings.theme')}>
          {['system', 'light', 'dark'].map((p) => (
            <GlassButton key={p} aria-pressed={theme === p} onClick={() => { setThemePref(p); setTheme(p); }} className={theme === p ? '!bg-white/25' : ''}>{t(`settings.${p}`)}</GlassButton>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-xs text-mist/80">{t('settings.location')}</p>
        <p className="mt-1">{t(locLabel)}</p>
        {loc !== 'granted' && loc !== 'denied' && <GlassButton onClick={requestLocation} className="mt-3">{t('settings.locRequest')}</GlassButton>}
        <p className="mt-2 text-xs text-mist/60">{t('settings.locNote')}</p>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-3 text-lg font-light">{t('settings.password')}</h2>
        <form onSubmit={changePassword} className="space-y-3" noValidate>
          <GlassInput name="currentPassword" type="password" autoComplete="current-password" label={t('settings.currentPassword')} value={pw.currentPassword} onChange={setP} error={fieldErrors.currentPassword} />
          <GlassInput name="newPassword" type="password" autoComplete="new-password" label={t('settings.newPassword')} value={pw.newPassword} onChange={setP} error={fieldErrors.newPassword} />
          <GlassInput name="confirmPassword" type="password" autoComplete="new-password" label={t('auth.confirmPassword')} value={pw.confirmPassword} onChange={setP} error={fieldErrors.confirmPassword} />
          {msg.error && <p role="alert" className="text-sm text-red-300">{msg.error}</p>}
          {msg.ok && <p role="status" className="text-sm text-emerald-300">{msg.ok}</p>}
          <GlassButton type="submit" variant="primary" loading={busy}>{t('settings.password')}</GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
