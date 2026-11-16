// Offline-first service worker. Bump VERSION when you want every phone to refetch everything.
const VERSION = 'v2';
const CORE = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/engine.js', 'js/kit.js', 'js/play.js', 'js/gfx.js', 'js/art.js', 'js/config.js', 'js/catalog.json', 'manifest.webmanifest', 'assets/art/manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'js/games/circuit-path.js','js/games/fraction-duel.js','js/games/index.js','js/games/mirror-maze.js','js/games/number-line-navigator.js','js/games/number-lock.js','js/games/pack-judgment.js','js/games/pack-language.js','js/games/pack-logic.js','js/games/pack-planning.js','js/games/pack-spatial.js','js/games/rotation-match.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// Stale-while-revalidate: instant from cache, refreshed in the background for next launch.
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
