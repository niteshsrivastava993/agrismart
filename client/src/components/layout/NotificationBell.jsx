import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';

export default function NotificationBell() {
  const [tick, setTick] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('notifications:changed', bump);
    return () => window.removeEventListener('notifications:changed', bump);
  }, []);
  const { data } = useApi(`/notifications?limit=1&r=${tick}&p=${encodeURIComponent(pathname)}`);
  const n = data?.unreadCount ?? 0;
  return (
    <Link to="/notifications" aria-label={n ? `Notifications, ${n} unread` : 'Notifications'} className="relative rounded-xl p-2 text-mist/70 hover:bg-white/10 hover:text-ivory">
      <Bell className="h-4 w-4" />
      {n > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-semibold text-obsidian">{n > 9 ? '9+' : n}</span>}
    </Link>
  );
}
