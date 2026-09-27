import { motion, useReducedMotion } from 'framer-motion';

// Fades/slides content in once it scrolls into view. When the user prefers
// reduced motion we still fade (cheap, non-spatial) but skip the translate.
export default function Reveal({ as = 'div', delay = 0, y = 20, className = '', children, ...rest }) {
  const reduced = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduced ? 0.2 : 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
