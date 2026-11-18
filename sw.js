// Offline-first service worker. Bump VERSION when you want every phone to refetch everything.
const VERSION = 'prismind2-v10';
const CORE = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/engine.js', 'js/audio.js', 'js/kit.js', 'js/play.js', 'js/gfx.js', 'js/art.js', 'js/config.js', 'js/track.js', 'js/online.js', 'js/catalog.json', 'manifest.webmanifest', 'assets/art/manifest.json', 'icons/favicon-48.png', 'icons/icon-192.png', 'js/games/circuit-path.js','js/games/fraction-duel.js','js/games/index.js','js/games/mirror-maze.js','js/games/number-line-navigator.js','js/games/number-lock.js','js/games/pack-judgment.js','js/games/pack-language.js','js/games/pack-logic.js','js/games/pack-planning.js','js/games/pack-spatial.js','js/games/rotation-match.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// Stale-while-revalidate: instant from cache, refreshed in the background for next launch.
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin || r.headers.has('range') || r.url.includes('/assets/music/')) return; // music streams from the network
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then((res) => { if (res.status === 200) c.put(r, res.clone()).catch(() => {}); return res; }).catch(() => hit);
    return hit || net;
  }));
});
