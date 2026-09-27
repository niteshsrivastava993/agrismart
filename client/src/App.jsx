import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import { GlassSkeleton } from './components/ui/Glass.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard.jsx'));
const Fields = lazy(() => import('./pages/Fields.jsx'));
const FarmMap = lazy(() => import('./pages/FarmMap.jsx'));
const CropHealth = lazy(() => import('./pages/CropHealth.jsx'));
const Diary = lazy(() => import('./pages/Diary.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Listings = lazy(() => import('./pages/Listings.jsx'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Weather = lazy(() => import('./pages/Weather.jsx'));
const Market = lazy(() => import('./pages/Market.jsx'));

const HOME = { farmer: '/farmer/dashboard', buyer: '/buyer/dashboard', admin: '/admin/dashboard' };
const home = (user) => (!user ? '/login' : HOME[user.role] || '/market');

// Client-side guard for UX only; the API enforces roles independently.
function Guard({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <GlassSkeleton className="m-6 h-40" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={home(user)} replace />;
  return <Outlet />;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Suspense fallback={<GlassSkeleton className="m-6 h-40" />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to={home(user)} replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to={home(user)} replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Guard />}>
          <Route element={<AppShell />}>
            <Route path="/market" element={<Market />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<Guard roles={['buyer']} />}>
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            </Route>
            <Route element={<Guard roles={['admin']} />}>
              <Route path="/admin/dashboard" element={<Admin />} />
            </Route>
            <Route element={<Guard roles={['farmer']} />}>
              <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
              <Route path="/farmer/farm-map" element={<FarmMap />} />
              <Route path="/farmer/fields" element={<Fields />} />
              <Route path="/farmer/crop-health" element={<CropHealth />} />
              <Route path="/farmer/diary" element={<Diary />} />
              <Route path="/farmer/weather" element={<Weather />} />
              <Route path="/farmer/listings" element={<Listings />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={loading ? null : <Navigate to={home(user)} replace />} />
      </Routes>
    </Suspense>
  );
}
