import { useState } from 'react';
import { CloudSun, Map, ShieldCheck, ShoppingBasket, Sprout, TrendingUp, UserCheck, Users } from 'lucide-react';
import { GlassButton, GlassCard, GlassSkeleton, GlassStatCard } from '../components/ui/Glass.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { fmtDateTime } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

const Status = ({ label, ok, text }) => (
  <div className="flex items-center justify-between py-2 text-sm"><span>{label}</span><span className={ok ? 'text-emerald-300' : 'text-amber'}>● {text}</span></div>
);

export default function Admin() {
  const { user: me } = useAuth();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const stats = useApi(`/admin/stats?r=${tick}`);
  const users = useApi(`/admin/users?page=${page}&r=${tick}`);
  const logs = useApi(`/admin/audit?r=${tick}`);
  const s = stats.data;

  async function toggle(u) {
    setError('');
    try { await api(`/admin/users/${u._id}/active`, { method: 'PATCH', body: { isActive: !u.isActive } }); setTick((t2) => t2 + 1); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
        <div><h1 className="font-display text-3xl">{t('admin.title')}</h1><p className="text-sm text-mist/70">{t('admin.subtitle')}</p></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      {stats.loading ? <GlassSkeleton className="h-40" /> : stats.error ? <GlassCard><p role="alert" className="text-amber">{stats.error}</p></GlassCard> : (
        <>
          <Reveal className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <GlassStatCard icon={Users} label={t('admin.totalUsers')} value={s.users.total} />
            <GlassStatCard icon={Sprout} label={t('admin.farmers')} value={s.users.farmers} />
            <GlassStatCard icon={ShoppingBasket} label={t('admin.buyers')} value={s.users.buyers} />
            <GlassStatCard icon={UserCheck} label={t('admin.activeUsers')} value={s.users.active} />
            <GlassStatCard icon={Map} label={t('admin.fields')} value={s.fields} />
            <GlassStatCard icon={TrendingUp} label={t('admin.marketSearches')} value={s.marketSearches} />
            <GlassStatCard icon={CloudSun} label={t('admin.weatherRequests')} value={s.weatherRequests} />
          </Reveal>
          <Reveal delay={0.05}>
            <GlassCard className="max-w-md">
              <h2 className="mb-1 text-sm uppercase tracking-widest text-mist/60">{t('admin.system')}</h2>
              <Status label={t('admin.database')} ok={s.database === 'connected'} text={s.database === 'connected' ? t('admin.connected') : t('admin.unavailable')} />
              <Status label={t('admin.weatherApi')} ok={s.weatherApiConfigured} text={s.weatherApiConfigured ? t('admin.credentialsSet') : t('admin.credentialsMissing')} />
              <Status label={t('admin.marketApi')} ok={s.marketApiConfigured} text={s.marketApiConfigured ? t('admin.credentialsSet') : t('admin.credentialsMissing')} />
              <Status label={t('admin.emailResend')} ok={s.emailConfigured} text={s.emailConfigured ? t('admin.credentialsSet') : t('admin.notConfigured')} />
              <Status label={t('admin.aiAssistant')} ok={s.assistantConfigured} text={s.assistantConfigured ? t('admin.credentialsSet') : t('admin.notConfigured')} />
              <p className="mt-2 text-[11px] text-mist/50">{t('admin.systemNote')}</p>
            </GlassCard>
          </Reveal>
        </>
      )}

      <Reveal as="section" aria-labelledby="users-h">
        <h2 id="users-h" className="mb-3 text-lg font-light">{t('admin.users')}</h2>
        {users.loading ? <GlassSkeleton className="h-48" /> : users.error ? <p role="alert" className="text-amber">{users.error}</p> : (
          <GlassCard className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-mist/60">
                  <tr>{[t('admin.colName'), t('admin.colEmail'), t('admin.colRole'), t('admin.colLastLogin'), t('admin.colStatus')].map((h) => <th key={h} scope="col" className="px-4 py-3 font-normal">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {users.data.users.map((u) => (
                    <tr key={u._id} className="border-t border-white/10">
                      <td className="px-4 py-3">{u.fullName}</td><td className="px-4 py-3 text-mist/80">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td><td className="px-4 py-3 text-mist/80">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : t('admin.never')}</td>
                      <td className="px-4 py-3">
                        <GlassButton disabled={u._id === me._id} onClick={() => toggle(u)} className="px-3 py-1.5 text-xs">{u.isActive ? t('admin.deactivate') : t('admin.activate')}</GlassButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs text-mist/70">
              <span>{t('admin.pageOf', { page, total: users.data.total })}</span>
              <div className="flex gap-2">
                <GlassButton disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs">{t('admin.previous')}</GlassButton>
                <GlassButton disabled={page * 25 >= users.data.total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs">{t('admin.next')}</GlassButton>
              </div>
            </div>
          </GlassCard>
        )}
      </Reveal>

      <Reveal as="section" aria-labelledby="audit-h">
        <h2 id="audit-h" className="mb-3 text-lg font-light">{t('admin.recentActivity')}</h2>
        {logs.loading ? <GlassSkeleton className="h-48" /> : logs.error ? <p role="alert" className="text-amber">{logs.error}</p>
          : logs.data.logs.length === 0 ? <p className="text-sm text-mist/70">{t('admin.noActivity')}</p> : (
            <GlassCard className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-white/10 text-sm">
                {logs.data.logs.map((l) => (
                  <li key={l._id} className="flex flex-wrap justify-between gap-x-4 py-2">
                    <span><span className="text-amber">{l.action}</span> · {l.user?.fullName ?? t('admin.unknownUser')}</span>
                    <span className="text-xs text-mist/60">{fmtDateTime(l.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
      </Reveal>
    </div>
  );
}
