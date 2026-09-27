import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, CloudSun, HeartPulse, LayoutDashboard, LogOut, Map as MapIcon, MoreHorizontal, ShieldCheck, ShoppingBasket, Settings, Sprout, Store, TrendingUp, UserRound, WifiOff } from 'lucide-react';
import AssistantWidget from '../assistant/AssistantWidget.jsx';
import AuthImage from '../ui/AuthImage.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import PageBackground from './PageBackground.jsx';
import NotificationBell from './NotificationBell.jsx';
import VoiceSearch from './VoiceSearch.jsx';
import { useI18n } from '../../i18n/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOnline } from '../../hooks/useApi.js';

const MARKET = { to: '/market', label: 'nav.market', icon: TrendingUp };
const NAV = {
  farmer: [
    { to: '/farmer/dashboard', label: 'nav.home', icon: LayoutDashboard },
    { to: '/farmer/farm-map', label: 'nav.map', icon: MapIcon },
    { to: '/farmer/fields', label: 'nav.fields', icon: Sprout },
    { to: '/farmer/crop-health', label: 'nav.health', icon: HeartPulse },
    { to: '/farmer/weather', label: 'nav.weather', icon: CloudSun },
    { to: '/farmer/diary', label: 'nav.diary', icon: BookOpen },
    { to: '/farmer/listings', label: 'nav.sell', icon: Store },
    MARKET,
  ],
  buyer: [{ to: '/buyer/dashboard', label: 'nav.browse', icon: ShoppingBasket }, MARKET],
  admin: [{ to: '/admin/dashboard', label: 'nav.admin', icon: ShieldCheck }, MARKET],
};
const MAX_BOTTOM = 5;
const BG = { '/farmer/dashboard': 'dashboard', '/farmer/weather': 'weather', '/buyer/dashboard': 'marketplace', '/market': 'marketplace' };

export default function AppShell() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const online = useOnline();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);

  const items = NAV[user.role] || [MARKET];
  const overflow = items.length > MAX_BOTTOM;
  const bottom = overflow ? items.slice(0, MAX_BOTTOM - 1) : items;
  const more = overflow ? items.slice(MAX_BOTTOM - 1) : [];
  const link = ({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-white/15 text-ivory' : 'text-mist/70 hover:text-ivory'}`;
  const tab = ({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${isActive ? 'bg-white/15 text-ivory' : 'text-mist/70'}`;

  return (
    <div className="min-h-screen pb-28 md:pb-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <PageBackground name={BG[pathname]} />
      <header className="glass sticky top-3 z-20 mx-3 mt-3 flex max-w-6xl items-center justify-between px-4 py-2.5 md:mx-auto">
        <span className="text-[11px] font-semibold tracking-[0.2em] sm:text-sm sm:tracking-[0.3em]">AGRISMART</span>
        <nav aria-label="Main" className="hidden gap-1 md:flex">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={link}><Icon className="h-4 w-4" aria-hidden="true" />{t(label)}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <VoiceSearch />
          <NotificationBell />
          <Link to="/profile" className="hidden items-center gap-2 text-xs text-mist/70 hover:text-ivory sm:flex">
            {user.avatarId ? <AuthImage id={user.avatarId} alt="" className="h-6 w-6 rounded-full object-cover" />
              : <UserRound className="h-4 w-4" aria-hidden="true" />}
            {user.fullName} · {user.role}
          </Link>
          <Link to="/settings" aria-label={t('nav.settings')} className="rounded-xl p-2 text-mist/70 hover:bg-white/10 hover:text-ivory"><Settings className="h-4 w-4" /></Link>
          <button onClick={logout} aria-label={t('nav.signOut')} className="rounded-xl p-2 text-mist/70 hover:bg-white/10 hover:text-ivory"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      {!online && (
        <p role="status" className="mx-auto mt-3 flex max-w-6xl items-center justify-center gap-2 text-xs text-amber">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> {t('common.offline')}
        </p>
      )}

      <main className="fade-in mx-auto max-w-6xl px-4 pt-8"><Outlet /></main>

      <AssistantWidget />

      {moreOpen && (
        <div className="glass fixed inset-x-3 z-30 grid gap-1 p-2 md:hidden" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          {more.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={link}><Icon className="h-4 w-4" aria-hidden="true" />{t(label)}</NavLink>)}
        </div>
      )}
      <nav aria-label="Mobile" className="glass fixed inset-x-3 z-20 flex justify-around p-1.5 md:hidden" style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {bottom.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={tab}><Icon className="h-5 w-5" aria-hidden="true" />{t(label)}</NavLink>
        ))}
        {overflow && (
          <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${moreOpen ? 'bg-white/15 text-ivory' : 'text-mist/70'}`}>
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />{t('nav.more')}
          </button>
        )}
      </nav>
    </div>
  );
}
