import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmtDateTime } from '../../utils/format.js';

export const GlassCard = ({ className = '', ...p }) => <div className={`glass p-5 ${className}`} {...p} />;

const BUTTON_VARIANTS = {
  primary: 'bg-amber text-obsidian hover:brightness-110',
  danger: 'border border-red-300/30 bg-red-400/10 text-red-200 hover:bg-red-400/20',
  default: 'glass-btn',
};
// Shared with GlassLinkButton so a button-styled link never has to nest an
// actual <button> inside an <a> (invalid HTML, breaks keyboard/SR focus order).
export const glassButtonClasses = (variant = 'default', className = '') =>
  `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[.98] disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`;

export function GlassButton({ variant = 'default', loading = false, className = '', children, ...p }) {
  return (
    <button {...p} disabled={p.disabled || loading} className={glassButtonClasses(variant, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// Navigates like a Link but looks like a GlassButton — use this instead of
// wrapping <Link><GlassButton>…</GlassButton></Link>.
export function GlassLinkButton({ variant = 'default', className = '', children, ...p }) {
  return <Link {...p} className={glassButtonClasses(variant, className)}>{children}</Link>;
}

export function GlassInput({ label, error, className = '', as: Tag = 'input', children, ...p }) {
  const id = p.id || p.name;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-mist/80">{label}</label>
      <Tag id={id} className="glass-input" aria-invalid={Boolean(error)} {...p}>{children}</Tag>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export const GlassSkeleton = ({ className = '' }) => <div className={`glass animate-pulse ${className}`} aria-hidden="true" />;

export function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <GlassCard className="flex flex-col items-center py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-sage" aria-hidden="true" />}
      <p className="text-lg">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-mist/70">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}

export function GlassStatCard({ icon: Icon, label, value, hint, className = '' }) {
  return (
    <GlassCard className={`flex items-start gap-3 ${className}`}>
      {Icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-mist/60">{label}</p>
        <p className="truncate font-display text-2xl leading-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-mist/60">{hint}</p>}
      </div>
    </GlassCard>
  );
}

export const SourceNote = ({ source, fetchedAt, stale }) => (
  <p className="mt-2 text-[11px] leading-snug text-mist/60">
    Source: {source} · Last updated: {fmtDateTime(fetchedAt)}
    {stale && <span className="text-amber"> · Showing cached data</span>}
  </p>
);
