const CACHE = 'pocketia-v3';
const CORE = ['./', 'manifest.json', 'icon.svg', 'img/m1.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  const p = u.pathname;
  const isLive = p.endsWith('index.html') || p.endsWith('/') || p.endsWith('version.json') || p.endsWith('sw.js');
  if (isLive) {
    // Toujours le réseau d'abord : la mise à jour auto doit continuer de fonctionner.
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {}); }
        return r;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('./')))
    );
    return;
  }
  // Le reste (images, m1.js) : cache d'abord, mais revalidé en arrière-plan.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(m => {
      const net = fetch(e.request).then(r => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {}); }
        return r;
      }).catch(() => m);
      return m || net;
    })
  );
});
