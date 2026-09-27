import { useEffect, useState } from 'react';
import { getToken } from '../../services/api.js';

// Images are private, so they are fetched with the sign-in token and shown from a temporary object URL.
export default function AuthImage({ id, alt, className = '' }) {
  const [state, setState] = useState({ src: null, error: false });

  useEffect(() => {
    let live = true;
    let url = null;
    setState({ src: null, error: false });
    fetch(`/api/media/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => { if (!r.ok) throw new Error('failed'); return r.blob(); })
      .then((blob) => { if (!live) return; url = URL.createObjectURL(blob); setState({ src: url, error: false }); })
      .catch(() => { if (live) setState({ src: null, error: true }); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [id]);

  if (state.error) return <p className="text-xs text-mist/60">Image unavailable.</p>;
  if (!state.src) return <div className="glass h-32 w-full max-w-xs animate-pulse" aria-hidden="true" />;
  return <img src={state.src} alt={alt} className={className} />;
}
