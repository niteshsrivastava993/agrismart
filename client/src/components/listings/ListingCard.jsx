import { useState } from 'react';
import { Heart, MapPin, MessageSquare } from 'lucide-react';
import { GlassButton, GlassCard, GlassInput } from '../ui/Glass.jsx';
import { api } from '../../services/api.js';
import { fmtDate, fmtPrice } from '../../utils/format.js';
import { useI18n } from '../../i18n/index.jsx';

export default function ListingCard({ listing: l, onToggleSave }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function send(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api(`/listings/${l._id}/inquiries`, { method: 'POST', body: { message } }); setSent(true); setOpen(false); setMessage(''); }
    catch (err) { setError(err.details?.[0]?.message || err.message); }
    finally { setBusy(false); }
  }

  return (
    <GlassCard className="fade-in flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg">
            {l.crop}
            {l.isDemo && (
              <span title={t('l.demo_badge_title')} className="rounded-full border border-amber/40 bg-amber/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber">
                {t('l.demo_badge')}
              </span>
            )}
          </h2>
          <p className="text-xs text-mist/60">{t(`l.cat_${l.category}`)}{l.status !== 'active' && ` · ${t(`p.listings.${l.status}`)}`}</p>
        </div>
        <button onClick={() => onToggleSave(l)} aria-pressed={l.saved} aria-label={l.saved ? `Remove ${l.crop} from saved` : `Save ${l.crop}`} className="rounded-lg p-2 hover:bg-white/10">
          <Heart className={`h-5 w-5 ${l.saved ? 'fill-amber text-amber' : ''}`} />
        </button>
      </div>
      <p className="mt-3 text-3xl font-light">{fmtPrice(l.pricePerUnit)}<span className="text-sm text-mist/60"> / {l.unit}</span></p>
      <p className="mt-1 text-sm text-mist/80">{l.quantity} {l.unit} available</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-mist/70"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{l.district}, {l.state}</p>
      {l.description && <p className="mt-2 text-sm text-mist/80">{l.description}</p>}
      <p className="mt-2 text-[11px] text-mist/50">Listed by {l.sellerName} · {fmtDate(l.createdAt)}</p>

      <div className="mt-auto pt-4">
        {sent && <p role="status" className="mb-2 text-xs text-emerald-300">{t('p.listingcard.message_sent_the_seller')}</p>}
        {open ? (
          <form onSubmit={send} className="space-y-2">
            <GlassInput as="textarea" rows={3} name={`msg-${l._id}`} label={t('p.listingcard.message_to_seller')} value={message} onChange={(e) => setMessage(e.target.value)} error={error} required />
            <p className="text-[11px] text-mist/60">{t('p.listingcard.sending_shares_your_name')}</p>
            <div className="flex gap-2">
              <GlassButton type="submit" variant="primary" loading={busy}>{t('p.listingcard.send')}</GlassButton>
              <GlassButton type="button" onClick={() => setOpen(false)}>{t('p.listingcard.cancel')}</GlassButton>
            </div>
          </form>
        ) : l.status === 'active' && <GlassButton className="w-full" onClick={() => { setOpen(true); setSent(false); }}><MessageSquare className="h-4 w-4" aria-hidden="true" />{t('p.listingcard.contact_seller')}</GlassButton>}
      </div>
    </GlassCard>
  );
}
