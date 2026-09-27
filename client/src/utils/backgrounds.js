// Turns entries from public/backgrounds/manifest.json into safe URLs. Only plain file names in that folder are accepted.
const IMAGE = /^[\w-]+\.(jpe?g|webp|png|avif)$/i;
const VIDEO = /^[\w-]+\.(mp4|webm)$/i;
const url = (file, re) => (typeof file === 'string' && re.test(file) ? `/backgrounds/${file}` : null);
const entry = (manifest, name) => (manifest && typeof manifest === 'object' && Object.hasOwn(manifest, name) ? manifest[name] : null);

// "login": "login.webp"  ->  image URL, or null.
export function pickBackground(manifest, name) {
  return url(entry(manifest, name), IMAGE);
}

// "login": { "hd": "login-hd.mp4", "sd": "login-sd.mp4", "poster": "login-poster.webp" }  ->  { hd, sd, poster }, or null.
export function pickVideo(manifest, name) {
  const e = entry(manifest, name);
  if (!e || typeof e !== 'object') return null;
  const hd = url(e.hd, VIDEO);
  const sd = url(e.sd, VIDEO);
  if (!hd && !sd) return null;
  return { hd: hd || sd, sd: sd || hd, poster: url(e.poster, IMAGE) };
}

// Decides what to play: nothing (poster only), the light file, or the full-size file.
export function videoPlan({ reducedMotion, saveData, effectiveType, width }) {
  if (reducedMotion || saveData || /^(slow-2g|2g)$/.test(effectiveType || '')) return 'poster';
  return width >= 900 && effectiveType !== '3g' ? 'hd' : 'sd';
}

let manifestPromise;
export const loadManifest = () => {
  manifestPromise ??= fetch('/backgrounds/manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return manifestPromise;
};
