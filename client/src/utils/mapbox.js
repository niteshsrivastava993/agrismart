// Mapbox satellite tiles. Only PUBLIC tokens (pk.…) are accepted: a secret token (sk.…) must never ship to a browser.
export function satelliteTile(token) {
  const t = String(token ?? '').trim();
  if (!/^pk\.[\w-]+\.[\w-]+$/.test(t)) return null;
  return {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${t}`,
    attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}
