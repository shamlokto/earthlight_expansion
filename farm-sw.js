// Sato's Harvest offline service worker (2026-11-23). It only answers for the farm game's own files, so the other
// games on the site are untouched. Code (farm.html, js, css, json) is network-first, so an update arrives as soon as
// there is a connection, with the cached copy when there is none. Art (pictures, models, music, fonts) is cache-first:
// once fetched it never needs the internet again. The title screen's "Play offline" button fetches every file the
// game can use, so a whole session works with no connection at all.
const CODE = 'farm-code-v1', ART = 'farm-art-v1';
const FARM = /\/(farm\.html|farm-sw\.js|farm\.webmanifest|css\/farm[^/]*\.css|fonts\/farm\/|js\/farm\/|js\/vendor\/three\/|js\/expansion\/(portraits|villain)\.js|art\/farm\/)/;
const isCode = (p) => /\.(html|js|css|json|webmanifest)$/.test(p) || p.endsWith('/');
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CODE).then((c) => c.addAll(['farm.html', 'css/farm.css', 'css/farm-fonts.css', 'js/farm/main.js'])).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('farm-') && k !== CODE && k !== ART).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin || !FARM.test(u.pathname)) return;
  const key = u.origin + u.pathname;   // query strings and cache-busting are ignored for the cache
  if (isCode(u.pathname)) {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CODE).then((ca) => ca.put(key, c)); } return res; })
      .catch(() => caches.match(key).then((hit) => hit || (r.mode === 'navigate' ? caches.match(u.origin + u.pathname.replace(/[^/]*$/, 'farm.html')) : Response.error()))));
  } else {
    e.respondWith(caches.match(key).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(ART).then((ca) => ca.put(key, c)); } return res; })));
  }
});
