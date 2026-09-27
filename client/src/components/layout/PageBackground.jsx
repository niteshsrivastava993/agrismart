import { useEffect, useRef, useState } from 'react';
import { loadManifest, pickBackground, pickVideo, videoPlan } from '../../utils/backgrounds.js';

// Full-screen background behind the page: a looping video (poster first) or a photo,
// only if the page is listed in public/backgrounds/manifest.json.
export default function PageBackground({ name }) {
  const [bg, setBg] = useState(null); // { image, video, plan }
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let live = true;
    setBg(null); setPlaying(false);
    if (name) {
      loadManifest().then((m) => {
        if (!live) return;
        const video = pickVideo(m, name);
        const image = video?.poster || pickBackground(m, name);
        const conn = navigator.connection || {};
        const plan = video ? videoPlan({
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          saveData: conn.saveData, effectiveType: conn.effectiveType, width: window.innerWidth,
        }) : 'poster';
        if (image || video) setBg({ image, video, plan });
      });
    }
    return () => { live = false; };
  }, [name]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    v.muted = true;
    v.play().catch(() => {}); // blocked (e.g. low-power mode): the poster stays
    const onVis = () => (document.hidden ? v.pause() : v.play().catch(() => {}));
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [bg]);

  if (!bg) return null;
  const src = bg.plan === 'poster' ? null : bg.video[bg.plan];
  return (
    <div aria-hidden="true" className={`page-bg page-bg--${name}`} style={bg.image ? { backgroundImage: `url(${bg.image})` } : undefined}>
      {src && (
        <video ref={ref} src={src} className={playing ? 'is-playing' : ''} autoPlay muted loop playsInline preload="auto"
          disablePictureInPicture onPlaying={() => setPlaying(true)} />
      )}
    </div>
  );
}
