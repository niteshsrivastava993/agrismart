import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

// GET helper. Pass null to skip. Returns { loading, data, error }.
export function useApi(path) {
  const [s, setS] = useState({ loading: Boolean(path), data: null, error: null });
  useEffect(() => {
    if (!path) { setS({ loading: false, data: null, error: null }); return undefined; }
    let live = true;
    setS((x) => ({ ...x, loading: true, error: null }));
    api(path)
      .then((data) => live && setS({ loading: false, data, error: null }))
      .catch((e) => live && setS({ loading: false, data: null, error: e.message }));
    return () => { live = false; };
  }, [path]);
  return s;
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
