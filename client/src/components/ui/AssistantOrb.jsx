import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// The assistant's one small 3D-ish touch: two softly pulsing glow rings
// behind the icon. Lazy-loaded from AssistantWidget (which is mounted on
// every authenticated page) so framer-motion never lands in the main bundle.
export default function AssistantOrb({ size = 20 }) {
  const reduced = useReducedMotion();
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      {!reduced && (
        <>
          <motion.span className="absolute inset-0 rounded-full bg-amber/40 blur-md"
            animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0.1, 0.55] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.span className="absolute inset-0 rounded-full bg-sage/30 blur-md"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />
        </>
      )}
      <Sparkles className="relative text-amber" style={{ width: size * 0.6, height: size * 0.6 }} aria-hidden="true" />
    </span>
  );
}
