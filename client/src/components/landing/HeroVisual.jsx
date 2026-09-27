import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// A layered, softly-animated "field at dusk" composition: blurred gradient
// orbs plus a line-art terrain/leaf motif that drifts gently with the
// pointer. Deliberately not a full 3D engine (Three.js / Spline) — those
// need externally-authored scene assets we don't have here — but it is
// lazy-loaded, GPU-cheap (transform/opacity only) and fully inert under
// prefers-reduced-motion, which is what the heavier alternatives need too.
export default function HeroVisual() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      setTilt({ x, y });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
  }, [reduced]);

  return (
    <div ref={ref} className="relative aspect-square w-full max-w-lg select-none" aria-hidden="true">
      <span className="hero-orb h-56 w-56 bg-amber/25" style={{ top: '4%', left: '8%' }} />
      <span className="hero-orb h-64 w-64 bg-sage/25" style={{ bottom: '2%', right: '4%', animationDelay: '-3s' }} />
      <span className="hero-orb h-40 w-40 bg-softblue/20" style={{ top: '38%', right: '18%', animationDelay: '-6s' }} />

      <motion.svg
        viewBox="0 0 400 400"
        className="relative h-full w-full drop-shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        animate={{ x: tilt.x * 8, y: tilt.y * 8 }}
        transition={{ type: 'spring', stiffness: 60, damping: 14 }}
      >
        <defs>
          <linearGradient id="heroStem" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#7C8874" />
            <stop offset="100%" stopColor="#D9A441" />
          </linearGradient>
        </defs>
        {/* terrain contour lines */}
        {[300, 330, 358].map((y, i) => (
          <path key={y} d={`M20 ${y} Q 200 ${y - 30} 380 ${y}`} fill="none" stroke="rgba(244,240,232,0.14)" strokeWidth={1.5}
            opacity={1 - i * 0.25} />
        ))}
        {/* three stylised stalks of varying height, catching the amber→sage gradient */}
        {[{ x: 150, h: 190 }, { x: 200, h: 240 }, { x: 250, h: 165 }].map((s, i) => (
          <motion.g key={s.x}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <line x1={s.x} y1={310} x2={s.x} y2={310 - s.h} stroke="url(#heroStem)" strokeWidth={3} strokeLinecap="round" />
            <ellipse cx={s.x} cy={310 - s.h} rx={16} ry={10} fill="url(#heroStem)" opacity={0.9}
              transform={`rotate(${-20 + i * 20} ${s.x} ${310 - s.h})`} />
          </motion.g>
        ))}
      </motion.svg>
    </div>
  );
}
