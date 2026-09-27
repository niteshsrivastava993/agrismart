import { useState } from 'react';
import { Bell, CheckCheck, CloudSun, Info, Sprout, Trash2, TrendingUp } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassSkeleton } from '../components/ui/Glass.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { fmtDateTime } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

const ICONS = { weather: CloudSun, market: TrendingUp, crop_reminder: Sprout, system: Info };

export default function Notifications() {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const res = useApi(`/notifications?r=${tick}`);
  const items = res.data?.notifications ?? [];

  async function act(path, method) {
    setError('');
    try { await api(path, { method }); setTick((t) => t + 1); window.dispatchEvent(new Event('notifications:changed')); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">{t('p.notifications.notifications')}</h1>
          <p className="text-sm text-mist/70">{res.data ? `${res.data.unreadCount} unread` : ' '}</p></div>
        {res.data?.unreadCount > 0 && <GlassButton onClick={() => act('/notifications/read-all', 'POST')}><CheckCheck className="h-4 w-4" aria-hidden="true" />{t('p.notifications.mark_all_as_read')}</GlassButton>}
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      {res.loading && !res.data ? <div className="space-y-3">{[0, 1, 2].map((i) => <GlassSkeleton key={i} className="h-20" />)}</div>
        : res.error ? <GlassCard><p role="alert" className="text-amber">{res.error}</p></GlassCard>
        : items.length === 0 ? <EmptyState icon={Bell} title={t('p.notifications.youre_all_caught_up')} hint={t('p.notifications.reminders_and_system_messages')} />
        : (
          <ul className="space-y-3">
            {items.map((n) => {
              const Icon = ICONS[n.type] || Info;
              return (
                <li key={n._id} className="fade-in">
                  <GlassCard className={`flex items-start gap-3 ${n.read ? 'opacity-70' : ''}`}>
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${n.read ? 'text-mist/50' : 'text-amber'}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className={n.read ? '' : 'font-medium'}>{n.title}</p>
                      <p className="text-sm text-mist/80">{n.message}</p>
                      <p className="mt-1 text-[11px] text-mist/50">{fmtDateTime(n.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!n.read && <button aria-label={t('p.notifications.mark_as_read')} onClick={() => act(`/notifications/${n._id}/read`, 'PATCH')} className="rounded-lg p-2 hover:bg-white/10"><CheckCheck className="h-4 w-4" /></button>}
                      <button aria-label={t('p.notifications.delete_notification')} onClick={() => act(`/notifications/${n._id}`, 'DELETE')} className="rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </GlassCard>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
