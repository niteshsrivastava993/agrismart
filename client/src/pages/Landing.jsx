import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, BookOpen, CloudSun, Languages, ShieldCheck, Sprout, TrendingUp, Users,
} from 'lucide-react';
import { GlassCard, GlassLinkButton, GlassStatCard, glassButtonClasses } from '../components/ui/Glass.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import { useI18n } from '../i18n/index.jsx';

// Lazy: keeps the animated hero visual out of the critical first-paint bundle.
const HeroVisual = lazy(() => import('../components/landing/HeroVisual.jsx'));

function FeatureSection({ id, eyebrow, title, body, icon: Icon, reverse }) {
  return (
    <section id={id} className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 md:py-20">
      <Reveal className={reverse ? 'md:order-2' : ''}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber">{eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{title}</h2>
        <p className="mt-4 max-w-prose text-mist/75">{body}</p>
      </Reveal>
      <Reveal delay={0.1} className={reverse ? 'md:order-1' : ''}>
        <GlassCard className="flex aspect-[4/3] items-center justify-center">
          <Icon className="h-20 w-20 text-amber/70" strokeWidth={1.25} aria-hidden="true" />
        </GlassCard>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  const { t } = useI18n();

  const features = [
    { id: 'market-intelligence', icon: TrendingUp, eyebrow: t('landing.market.eyebrow'), title: t('landing.market.title'), body: t('landing.market.body') },
    { id: 'crop-health', icon: Sprout, eyebrow: t('landing.health.eyebrow'), title: t('landing.health.title'), body: t('landing.health.body'), reverse: true },
    { id: 'weather', icon: CloudSun, eyebrow: t('landing.weather.eyebrow'), title: t('landing.weather.title'), body: t('landing.weather.body') },
    { id: 'diary', icon: BookOpen, eyebrow: t('landing.diary.eyebrow'), title: t('landing.diary.title'), body: t('landing.diary.body'), reverse: true },
    { id: 'assistant', icon: Bot, eyebrow: t('landing.assistant.eyebrow'), title: t('landing.assistant.title'), body: t('landing.assistant.body') },
    { id: 'voice', icon: Languages, eyebrow: t('landing.voice.eyebrow'), title: t('landing.voice.title'), body: t('landing.voice.body'), reverse: true },
  ];

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber focus:px-4 focus:py-2 focus:text-obsidian">
        Skip to content
      </a>

      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold tracking-[0.35em]">AGRISMART</span>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-xl px-3 py-2 text-sm text-mist/80 hover:text-ivory sm:inline-block">
              {t('landing.nav.signIn')}
            </Link>
            <GlassLinkButton to="/login" variant="primary" className="text-sm">{t('landing.nav.getStarted')}</GlassLinkButton>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-2 md:items-center md:pt-20">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber">{t('landing.hero.eyebrow')}</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">{t('landing.hero.headline')}</h1>
            <p className="mt-5 max-w-prose text-lg text-mist/75">{t('landing.hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GlassLinkButton to="/login" variant="primary" className="text-sm">
                {t('landing.hero.ctaPrimary')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </GlassLinkButton>
              <a href="#market-intelligence" className={glassButtonClasses('default', 'text-sm')}>{t('landing.hero.ctaSecondary')}</a>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              <GlassStatCard label={t('landing.hero.stat1Label')} value={t('landing.hero.stat1Value')} />
              <GlassStatCard label={t('landing.hero.stat2Label')} value={t('landing.hero.stat2Value')} />
              <GlassStatCard label={t('landing.hero.stat3Label')} value={t('landing.hero.stat3Value')} />
            </div>
          </Reveal>
          <Reveal delay={0.1} className="flex justify-center md:justify-end">
            <Suspense fallback={<div className="aspect-square w-full max-w-lg animate-pulse rounded-[2rem] bg-white/5" />}>
              <HeroVisual />
            </Suspense>
          </Reveal>
        </section>

        {features.map((f) => <FeatureSection key={f.id} {...f} />)}

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber">{t('landing.ecosystem.eyebrow')}</p>
            <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{t('landing.ecosystem.title')}</h2>
            <p className="mt-4 max-w-prose text-mist/75">{t('landing.ecosystem.body')}</p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              [Sprout, t('landing.ecosystem.roleFarmer'), t('landing.ecosystem.roleFarmerHint')],
              [Users, t('landing.ecosystem.roleBuyer'), t('landing.ecosystem.roleBuyerHint')],
              [ShieldCheck, t('landing.ecosystem.roleAdmin'), t('landing.ecosystem.roleAdminHint')],
            ].map(([Icon, label, hint], i) => (
              <Reveal key={label} delay={i * 0.08}>
                <GlassStatCard icon={Icon} label={label} value={hint} className="h-full" />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 md:py-24">
          <Reveal>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">{t('landing.cta.title')}</h2>
            <p className="mx-auto mt-4 max-w-prose text-mist/75">{t('landing.cta.body')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <GlassLinkButton to="/login?mode=register" variant="primary" className="text-sm">{t('landing.cta.primary')}</GlassLinkButton>
              <GlassLinkButton to="/login" className="text-sm">{t('landing.cta.secondary')}</GlassLinkButton>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-mist/50 sm:px-6">
        <p className="tracking-[0.2em]">AGRISMART</p>
        <p className="mt-1">{t('landing.footer.tagline')}</p>
      </footer>
    </div>
  );
}
