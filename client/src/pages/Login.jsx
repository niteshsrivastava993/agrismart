import PageBackground from '../components/layout/PageBackground.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GlassButton, GlassCard, GlassInput } from '../components/ui/Glass.jsx';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const REGISTER_FIELDS = [
  ['fullName', 'auth.fullName', 'text', 'name'],
  ['email', 'auth.email', 'email', 'email'],
  ['mobile', 'auth.mobile', 'tel', 'tel'],
  ['password', 'auth.password', 'password', 'new-password'],
  ['confirmPassword', 'auth.confirmPassword', 'password', 'new-password'],
  ['state', 'auth.state', 'text', 'off'],
  ['district', 'auth.district', 'text', 'off'],
];

export default function Login() {
  const { login, register } = useAuth();
  const { t, lang, changeLanguage } = useI18n();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({ role: 'farmer', language: lang });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      await (mode === 'login' ? login({ email: form.email, password: form.password }) : register(form));
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PageBackground name="login" />
      <GlassCard className="fade-in w-full max-w-md p-7">
        <h1 className="text-center text-sm font-semibold tracking-[0.35em]">AGRISMART</h1>
        <p className="mb-6 mt-1 text-center text-xs text-mist/70">{t('auth.tagline')}</p>

        <div role="tablist" className="glass-btn mb-5 grid grid-cols-2 rounded-xl p-1 text-sm">
          {[['login', t('auth.signIn')], ['register', t('auth.signUp')]].map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} type="button"
              onClick={() => { setMode(m); setError(''); setFieldErrors({}); }}
              className={`rounded-lg py-2 transition ${mode === m ? 'bg-white/20' : 'text-mist/70'}`}>{label}</button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          {(mode === 'login' ? REGISTER_FIELDS.slice(1, 2).concat([REGISTER_FIELDS[3]]) : REGISTER_FIELDS).map(([name, label, type, ac]) => (
            <GlassInput key={name} name={name} label={t(label)} type={type} autoComplete={ac} required
              value={form[name] || ''} onChange={set} error={fieldErrors[name]} />
          ))}
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <GlassInput as="select" name="role" label={t('auth.iAm')} value={form.role} onChange={set}>
                <option value="farmer">{t('auth.farmer')}</option><option value="buyer">{t('auth.buyer')}</option>
              </GlassInput>
              <GlassInput as="select" name="language" label={t('auth.language')} value={form.language} onChange={(e) => { set(e); changeLanguage(e.target.value); }}>
                <option value="en">English</option><option value="hi">हिन्दी</option>
              </GlassInput>
            </div>
          )}
          {mode === 'login' && <Link to="/forgot-password" className="block text-right text-xs text-mist/70 underline hover:text-ivory">{t('auth.forgotPassword')}</Link>}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <GlassButton type="submit" variant="primary" loading={busy} className="w-full">
            {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
          </GlassButton>
        </form>
        <p className="mt-5 text-center text-[11px] text-mist/50">{t('auth.socialNote')}</p>
      </GlassCard>
    </div>
  );
}
