import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (getToken()) {
      api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
    }
    const expire = () => setUser(null);
    window.addEventListener('auth:expired', expire);
    return () => window.removeEventListener('auth:expired', expire);
  }, []);

  const authenticate = useCallback(async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* token is discarded regardless */ }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login: (b) => authenticate('/auth/login', b), register: (b) => authenticate('/auth/register', b), logout }),
    [user, loading, authenticate, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
