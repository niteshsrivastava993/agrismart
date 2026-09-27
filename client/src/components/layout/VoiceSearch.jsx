import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { parseVoiceQuery } from '../../utils/voice.js';

export default function VoiceSearch() {
  const navigate = useNavigate();
  const [s, setS] = useState({ status: 'idle', text: '' });
  const rec = useRef(null);
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (s.status === 'done' || s.status === 'error') { const t = setTimeout(() => setS({ status: 'idle', text: '' }), 6000); return () => clearTimeout(t); }
    return undefined;
  }, [s]);
  useEffect(() => () => rec.current?.abort?.(), []);

  function toggle() {
    if (!Ctor) return setS({ status: 'error', text: 'Voice search is not supported in this browser.' });
    if (s.status === 'listening') return rec.current?.stop();
    const r = new Ctor();
    r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart = () => setS({ status: 'listening', text: 'Listening…' });
    r.onresult = (e) => {
      const said = e.results[0][0].transcript;
      const intent = parseVoiceQuery(said);
      if (!intent) return setS({ status: 'error', text: `Heard “${said}”, but couldn't match a search. Try “Show wheat prices in Lucknow”.` });
      setS({ status: 'done', text: `“${said}”` });
      navigate(intent.type === 'market' ? `/market?${new URLSearchParams(intent.params)}` : intent.to);
    };
    r.onerror = (e) => setS({ status: 'error', text: ['not-allowed', 'service-not-allowed'].includes(e.error) ? 'Microphone permission was not granted.' : e.error === 'no-speech' ? 'No speech detected.' : 'Voice search failed. Try again.' });
    r.onend = () => setS((x) => (x.status === 'listening' ? { status: 'idle', text: '' } : x));
    rec.current = r;
    try { r.start(); } catch { setS({ status: 'error', text: 'Voice search failed. Try again.' }); }
  }

  return (
    <div className="relative">
      <button onClick={toggle} aria-label={s.status === 'listening' ? 'Stop listening' : 'Voice search'} aria-pressed={s.status === 'listening'} className="rounded-xl p-2 text-mist/70 hover:bg-white/10 hover:text-ivory">
        <Mic className={`h-4 w-4 ${s.status === 'listening' ? 'animate-pulse text-amber' : ''}`} />
      </button>
      {s.status !== 'idle' && s.text && (
        <p role="status" className={`glass absolute right-0 top-full z-30 mt-3 w-64 p-3 text-xs ${s.status === 'error' ? 'text-amber' : ''}`}>{s.text}</p>
      )}
    </div>
  );
}
