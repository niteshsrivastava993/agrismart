import PageBackground from '../components/layout/PageBackground.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GlassButton, GlassCard, GlassInput } from '../components/ui/Glass.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../services/api.js';

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Remove the token from the address bar once it has been read.
  useEffect(() => { if (token) navigate('/reset-password', { replace: true }); }, [token, navigate]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try { await api('/auth/reset-password', { method: 'POST', body: { token, ...form } }); setDone(true); }
    catch (err) {
      setError(err.details?.some((d) => d.path === 'token') ? t('auth.resetMissing') : err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PageBackground name="login" />
      <GlassCard className="fade-in w-full max-w-md p-7">
        <h1 className="text-center text-sm font-semibold tracking-[0.35em]">AGRISMART</h1>
        <h2 className="mb-1 mt-6 text-xl font-light">{t('auth.resetTitle')}</h2>
        {done ? (
          <p role="status" className="mt-3 text-sm text-emerald-300">{t('auth.resetDone')}</p>
        ) : !token ? (
          <p role="alert" className="mt-3 text-sm text-amber">{t('auth.resetMissing')}</p>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
            <GlassInput name="password" type="password" autoComplete="new-password" label={t('settings.newPassword')} required value={form.password} onChange={set} error={fieldErrors.password} />
            <GlassInput name="confirmPassword" type="password" autoComplete="new-password" label={t('auth.confirmPassword')} required value={form.confirmPassword} onChange={set} error={fieldErrors.confirmPassword} />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <GlassButton type="submit" variant="primary" loading={busy} className="w-full">{t('auth.resetButton')}</GlassButton>
          </form>
        )}
        <Link to={done || !token ? '/login' : '/forgot-password'} className="mt-5 block text-center text-xs text-mist/70 underline hover:text-ivory">
          {done || !token ? t('auth.backToSignIn') : t('auth.forgotPassword')}
        </Link>
      </GlassCard>
    </div>
  );
}
