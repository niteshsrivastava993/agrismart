import { useState } from 'react';
import { Inbox, Pencil, Plus, Store, Trash2 } from 'lucide-react';
import { EmptyState, GlassButton, GlassCard, GlassInput, GlassSkeleton } from '../components/ui/Glass.jsx';
import { CATEGORIES, UNITS } from '../constants/categories.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../services/api.js';
import { fmtDateTime, fmtPrice } from '../utils/format.js';
import { useI18n } from '../i18n/index.jsx';

export default function Listings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const blank = () => ({ crop: '', category: 'grains', quantity: '', unit: 'quintal', pricePerUnit: '', state: user.state, district: user.district, description: '', status: 'active' });
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const mine = useApi(`/listings/mine?r=${tick}`);
  const inbox = useApi(`/listings/inquiries/received?r=${tick}`);
  const listings = mine.data?.listings ?? [];
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const open = (l) => {
    setEditingId(l?._id ?? null); setError(''); setFieldErrors({});
    setForm(l ? { crop: l.crop, category: l.category, quantity: String(l.quantity), unit: l.unit, pricePerUnit: String(l.pricePerUnit), state: l.state, district: l.district, description: l.description ?? '', status: l.status } : blank());
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    const { status, ...rest } = form;
    const body = { ...rest, quantity: rest.quantity === '' ? undefined : Number(rest.quantity), pricePerUnit: rest.pricePerUnit === '' ? undefined : Number(rest.pricePerUnit), ...(editingId && { status }) };
    try {
      await api(editingId ? `/listings/${editingId}` : '/listings', { method: editingId ? 'PATCH' : 'POST', body });
      setForm(null); setTick((t) => t + 1);
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.path, d.message])));
    } finally { setBusy(false); }
  }

  async function remove(l) {
    if (!window.confirm(`Delete your ${l.crop} listing? Its inquiries are removed too.`)) return;
    try { await api(`/listings/${l._id}`, { method: 'DELETE' }); setTick((t) => t + 1); } catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">{t('p.listings.sell_produce')}</h1><p className="text-sm text-mist/70">Buyers see your first name and location only. They can message you; you see their name and mobile when they do.</p></div>
        {!form && <GlassButton variant="primary" onClick={() => open(null)}><Plus className="h-4 w-4" aria-hidden="true" />{t('p.listings.new_listing')}</GlassButton>}
      </div>

      {form && (
        <GlassCard className="fade-in">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
            <GlassInput name="crop" label={t('p.listings.crop')} required value={form.crop} onChange={set} error={fieldErrors.crop} />
            <GlassInput as="select" name="category" label={t('p.listings.category')} value={form.category} onChange={set}>{CATEGORIES.map(([k]) => <option key={k} value={k}>{t(`l.cat_${k}`)}</option>)}</GlassInput>
            <GlassInput as="select" name="unit" label={t('p.listings.unit')} value={form.unit} onChange={set}>{UNITS.map((u) => <option key={u}>{u}</option>)}</GlassInput>
            <GlassInput name="quantity" type="number" min="0" step="any" label={t('p.listings.quantity')} required value={form.quantity} onChange={set} error={fieldErrors.quantity} />
            <GlassInput name="pricePerUnit" type="number" min="0" step="any" label={t('p.listings.asking_price_per_unit')} required value={form.pricePerUnit} onChange={set} error={fieldErrors.pricePerUnit} />
            {editingId && <GlassInput as="select" name="status" label={t('p.listings.status')} value={form.status} onChange={set}><option value="active">{t('p.listings.active')}</option><option value="sold">{t('p.listings.sold')}</option><option value="closed">{t('p.listings.closed')}</option></GlassInput>}
            <GlassInput name="state" label={t('p.listings.state')} required value={form.state} onChange={set} error={fieldErrors.state} />
            <GlassInput name="district" label={t('p.listings.district')} required value={form.district} onChange={set} error={fieldErrors.district} />
            <GlassInput as="textarea" rows={2} name="description" label={t('p.listings.description')} className="sm:col-span-2 lg:col-span-3" value={form.description} onChange={set} error={fieldErrors.description} />
            {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2 lg:col-span-3">{error}</p>}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <GlassButton type="submit" variant="primary" loading={busy}>{editingId ? t('common.saveChanges') : t('l.publish')}</GlassButton>
              <GlassButton type="button" onClick={() => setForm(null)}>{t('p.listings.cancel')}</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      <section aria-labelledby="mine-h">
        <h2 id="mine-h" className="mb-3 text-lg font-light">{t('p.listings.your_listings')}</h2>
        {mine.loading && !mine.data ? <GlassSkeleton className="h-40" /> : mine.error ? <p role="alert" className="text-amber">{mine.error}</p>
          : listings.length === 0 ? <EmptyState icon={Store} title={t('p.listings.no_listings_yet')} hint={t('p.listings.create_a_listing_so')} />
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <GlassCard key={l._id} className="fade-in">
                  <div className="flex items-start justify-between">
                    <div><h3 className="flex items-center gap-2 text-lg">
                      {l.crop}
                      {l.isDemo && <span title={t('l.demo_badge_title')} className="rounded-full border border-amber/40 bg-amber/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber">{t('l.demo_badge')}</span>}
                    </h3><p className="text-xs text-mist/60">{t(`l.cat_${l.category}`)} · {t(`p.listings.${l.status}`)}</p></div>
                    <div className="flex gap-1">
                      <button aria-label={`Edit ${l.crop} listing`} onClick={() => open(l)} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                      <button aria-label={`Delete ${l.crop} listing`} onClick={() => remove(l)} className="rounded-lg p-2 text-red-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-light">{fmtPrice(l.pricePerUnit)}<span className="text-sm text-mist/60"> / {l.unit}</span></p>
                  <p className="text-sm text-mist/80">{l.quantity} {l.unit} · {l.district}, {l.state}</p>
                  <p className="mt-2 text-xs text-amber">{l.inquiryCount} {l.inquiryCount === 1 ? 'inquiry' : 'inquiries'}</p>
                </GlassCard>
              ))}
            </div>
          )}
      </section>

      <section aria-labelledby="inbox-h">
        <h2 id="inbox-h" className="mb-3 text-lg font-light">{t('p.listings.inquiries_received')}</h2>
        {inbox.loading && !inbox.data ? <GlassSkeleton className="h-24" /> : inbox.error ? <p role="alert" className="text-amber">{inbox.error}</p>
          : inbox.data.inquiries.length === 0 ? <EmptyState icon={Inbox} title={t('p.listings.no_inquiries_yet')} hint={t('p.listings.buyer_messages_about_your')} />
          : (
            <ul className="space-y-3">
              {inbox.data.inquiries.map((q) => (
                <li key={q._id}><GlassCard>
                  <p className="text-xs text-mist/60">{q.listing?.crop ?? 'Removed listing'} · {fmtDateTime(q.createdAt)}</p>
                  <p className="mt-1">{q.buyerName} · <a className="text-amber underline" href={`tel:${q.buyerMobile}`}>{q.buyerMobile}</a></p>
                  <p className="mt-1 text-sm text-mist/80">{q.message}</p>
                </GlassCard></li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
