import PageBackground from '../components/layout/PageBackground.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GlassButton, GlassCard, GlassInput } from '../components/ui/Glass.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../services/api.js';

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/auth/forgot-password', { method: 'POST', body: { email } }); setSent(true); }
    catch (err) { setError(err.details?.[0]?.message || err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PageBackground name="login" />
      <GlassCard className="fade-in w-full max-w-md p-7">
        <h1 className="text-center text-sm font-semibold tracking-[0.35em]">AGRISMART</h1>
        <h2 className="mb-1 mt-6 text-xl font-light">{t('auth.forgotTitle')}</h2>
        {sent ? (
          <p role="status" className="mt-3 text-sm text-emerald-300">{t('auth.linkSent')}</p>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
            <p className="text-sm text-mist/70">{t('auth.forgotHint')}</p>
            <GlassInput name="email" type="email" autoComplete="email" label={t('auth.email')} required value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <GlassButton type="submit" variant="primary" loading={busy} className="w-full">{t('auth.sendLink')}</GlassButton>
          </form>
        )}
        <Link to="/login" className="mt-5 block text-center text-xs text-mist/70 underline hover:text-ivory">{t('auth.backToSignIn')}</Link>
      </GlassCard>
    </div>
  );
}
