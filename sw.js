// Offline support for the installed app. Network first, so players always get
// the latest version when online; the cache is only used when offline.
const CACHE = 'ashgrove-v1';
const CDNS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ashgrove-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return; // leave streamed audio/video alone
  const url = new URL(req.url);
  const same = url.origin === location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);
  if (!same && !CDNS.includes(url.hostname)) return; // multiplayer servers etc. go straight to the network
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: url.origin === location.origin && req.mode === 'navigate' })
      .then(hit => hit || Response.error()))
  );
});
