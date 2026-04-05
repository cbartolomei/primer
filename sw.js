const CACHE = 'primer-v14';

const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/highlight.js',
  './manifest.json',
  './icons/icon.svg',
  './topics/observability.html',
  './topics/http-networking.html',
  './topics/databases.html',
  './topics/caching.html',
  './topics/system-design.html',
  './topics/security.html',
  './topics/infrastructure.html',
  './topics/message-queues.html',
  './topics/api-design.html',
  './backend.html',
  './go.html',
  './topics/go-fundamentals.html',
  './topics/go-concurrency.html',
  './topics/go-patterns.html',
  './topics/go-control-data.html',
  './topics/go-idioms.html',
  './topics/go-http.html',
  './topics/go-api.html',
  './docs.html',
  './js/markdown.js',
  './docs/effective_go.md',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(
        PRECACHE.map(url =>
          c.add(new Request(url, { cache: 'reload' }))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
