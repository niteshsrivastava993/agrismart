import { motion, useReducedMotion } from 'framer-motion';

// A deliberately quiet decorative element for dashboard/interior headers —
// not a full 3D scene (see HeroVisual for the landing page's version), just
// enough presence to avoid feeling like a flat admin template. Never place
// more than one per page.
export default function FloatingMotif({ icon: Icon, className = '' }) {
  const reduced = useReducedMotion();
  return (
    <div className={`pointer-events-none relative hidden select-none sm:block ${className}`} aria-hidden="true">
      <span className="hero-orb h-24 w-24 bg-amber/20" style={{ top: 0, left: 4 }} />
      <span className="hero-orb h-16 w-16 bg-sage/20" style={{ bottom: -4, right: 6, animationDelay: '-4s' }} />
      <motion.div
        className="relative grid h-20 w-20 place-items-center"
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="h-10 w-10 text-amber/70" strokeWidth={1.25} aria-hidden="true" />
      </motion.div>
    </div>
  );
}
