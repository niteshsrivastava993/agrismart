import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { GlassButton, GlassCard, GlassInput } from '../components/ui/Glass.jsx';
import AuthImage from '../components/ui/AuthImage.jsx';
import ImagePicker from '../components/ui/ImagePicker.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../services/api.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState({ fullName: user.fullName, mobile: user.mobile, state: user.state, district: user.district, avatarId: user.avatarId ?? null });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg({ ok: '', error: '' }); setFieldErrors({});
    try {
      setUser((await api('/users/me', { method: 'PATCH', body: form })).user);
      setMsg({ ok: t('profile.updated'), error: '' });
    } catch (err) {
      setMsg({ ok: '', error: err.message });
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        {form.avatarId ? (
          <AuthImage id={form.avatarId} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-amber/15 text-amber"><UserRound className="h-8 w-8" aria-hidden="true" /></span>
        )}
        <div>
          <h1 className="font-display text-3xl">{t('profile.title')}</h1>
          <p className="text-sm text-mist/60">{user.fullName} · <span className="capitalize">{user.role}</span></p>
        </div>
      </div>
      <GlassCard>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
          <ImagePicker value={form.avatarId} onChange={(id) => setForm((f) => ({ ...f, avatarId: id }))} label={t('profile.photo')} />
          <GlassInput name="fullName" label={t('auth.fullName')} className="sm:col-span-2" value={form.fullName} onChange={set} error={fieldErrors.fullName} />
          <GlassInput name="mobile" label={t('auth.mobile')} type="tel" value={form.mobile} onChange={set} error={fieldErrors.mobile} />
          <GlassInput name="email" label={t('auth.email')} value={user.email} readOnly disabled />
          <GlassInput name="state" label={t('auth.state')} value={form.state} onChange={set} error={fieldErrors.state} />
          <GlassInput name="district" label={t('auth.district')} value={form.district} onChange={set} error={fieldErrors.district} />
          <GlassInput name="role" label={t('profile.role')} className="sm:col-span-2" value={user.role} readOnly disabled />
          {msg.error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{msg.error}</p>}
          {msg.ok && <p role="status" className="text-sm text-emerald-300 sm:col-span-2">{msg.ok}</p>}
          <GlassButton type="submit" variant="primary" loading={busy} className="sm:col-span-2">{t('common.saveChanges')}</GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
