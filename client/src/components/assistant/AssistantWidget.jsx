import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { GlassButton } from '../ui/Glass.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { fmtDateTime } from '../../utils/format.js';
import { useI18n } from '../../i18n/index.jsx';

const AssistantOrb = lazy(() => import('../ui/AssistantOrb.jsx'));

export default function AssistantWidget() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);

  useEffect(() => {
    if (open && enabled === null) api('/assistant/status').then((d) => setEnabled(d.enabled)).catch(() => setEnabled(false));
  }, [open, enabled]);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('assistant:open', onOpen);
    return () => window.removeEventListener('assistant:open', onOpen);
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy, open]);

  async function send(text) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next); setInput(''); setBusy(true); setError('');
    try {
      const d = await api('/assistant/chat', { method: 'POST', body: { messages: next.slice(-10).map(({ role, content: c }) => ({ role, content: c })) } });
      setMsgs([...next, { role: 'assistant', content: d.reply, sources: d.sources }]);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const chips = [
    t('assistant.chipPrices', { place: user.district }),
    t('assistant.chipWeather', { place: user.district }),
    ...(user.role === 'farmer' ? [t('assistant.chipFields')] : []),
  ];

  return (
    <div className="assistant-fab fixed right-4 z-20 flex flex-col items-end gap-3">
      {open && (
        <section aria-label={t('assistant.panelLabel')} className="glass fade-in flex h-[55vh] w-[92vw] max-w-sm flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="flex items-center gap-2 text-sm">
              <Suspense fallback={<Sparkles className="h-4 w-4 text-amber" aria-hidden="true" />}><AssistantOrb size={18} /></Suspense>
              {t('assistant.title')}
            </span>
            <button onClick={() => setOpen(false)} aria-label={t('assistant.close')} className="rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </header>

          {enabled === false ? (
            <p className="p-4 text-sm text-mist/80">{t('assistant.notConfigured')}</p>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
                {msgs.length === 0 && (
                  <div>
                    <p className="text-mist/70">{t('assistant.intro')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">{chips.map((c) => <button key={c} onClick={() => send(c)} className="glass-btn rounded-full px-3 py-1.5 text-xs">{c}</button>)}</div>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                    <p className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left ${m.role === 'user' ? 'bg-amber/90 text-obsidian' : 'bg-white/10'}`}>{m.content}</p>
                    {m.sources?.map((s, j) => <p key={j} className="mt-1 text-[10px] text-mist/50">{t('assistant.source', { source: s.source, updated: fmtDateTime(s.fetchedAt) })}{s.stale && ` · ${t('assistant.cached')}`}</p>)}
                  </div>
                ))}
                {busy && <p className="text-xs text-mist/60" role="status">{t('assistant.lookingUp')}</p>}
                {error && <p role="alert" className="text-xs text-amber">{error}</p>}
                <div ref={end} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-white/10 p-3">
                <label htmlFor="assistant-input" className="sr-only">{t('assistant.messageLabel')}</label>
                <input id="assistant-input" className="glass-input" placeholder={t('assistant.placeholder')} maxLength={2000} value={input} onChange={(e) => setInput(e.target.value)} disabled={enabled === null} />
                <GlassButton type="submit" variant="primary" disabled={busy || !input.trim() || enabled === null} aria-label={t('assistant.send')}><Send className="h-4 w-4" /></GlassButton>
              </form>
            </>
          )}
        </section>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? t('assistant.close') : t('assistant.open')} className="glass flex h-12 w-12 items-center justify-center rounded-full transition hover:bg-white/20">
        <Suspense fallback={<Sparkles className="h-5 w-5 text-amber" />}><AssistantOrb size={26} /></Suspense>
      </button>
    </div>
  );
}
