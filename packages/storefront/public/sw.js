/* King Food storefront SW — shell only (no API cache, no OneSignal) */
const CACHE = 'king-food-storefront-v1';
const PRECACHE = ['/', '/manifest.json', '/menu', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(req));
    return;
  }

  const isNav = req.mode === 'navigate';
  const accept = req.headers.get('accept') || '';
  const isHtml = accept.includes('text/html');

  if (isNav || isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
