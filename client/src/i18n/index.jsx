import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const DICTS = { en, hi };
const STORE = 'agrismart_lang';
const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }) {
  const { user, setUser } = useAuth();
  const [lang, setLang] = useState(() => (DICTS[localStorage.getItem(STORE)] ? localStorage.getItem(STORE) : 'en'));

  useEffect(() => { if (user?.language && DICTS[user.language]) setLang(user.language); }, [user?.language]);
  useEffect(() => { document.documentElement.lang = lang; localStorage.setItem(STORE, lang); }, [lang]);

  // Falls back to English, then to the key itself, so untranslated strings never render blank.
  const t = useCallback((key, vars) => {
    let s = DICTS[lang][key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  }, [lang]);

  const changeLanguage = useCallback(async (l) => {
    if (!DICTS[l]) return;
    setLang(l);
    if (user) {
      try { setUser((await api('/users/me', { method: 'PATCH', body: { language: l } })).user); } catch { /* the UI language still changes locally */ }
    }
  }, [user, setUser]);

  const value = useMemo(() => ({ t, lang, changeLanguage }), [t, lang, changeLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
