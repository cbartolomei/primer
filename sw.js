const CACHE = 'primer-v22';

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
  './topics/cicd.html',
  './topics/data-processing.html',
  './topics/linux.html',
  './topics/search.html',
  './topics/system-design-interviews.html',
  './topics/go-http.html',
  './topics/go-api.html',
  './docs.html',
  './library.html',
  './js/markdown.js',
  './docs/effective_go.md',
  './docs/sre-book/ch03-embracing-risk.md',
  './docs/sre-book/ch04-service-level-objectives.md',
  './docs/sre-book/ch05-eliminating-toil.md',
  './docs/sre-book/ch06-monitoring-distributed-systems.md',
  './docs/sre-book/ch08-release-engineering.md',
  './docs/sre-book/ch10-practical-alerting.md',
  './docs/sre-book/ch12-effective-troubleshooting.md',
  './docs/sre-book/ch15-postmortem-culture.md',
  './docs/sre-book/ch17-testing-reliability.md',
  './docs/sre-book/ch21-handling-overload.md',
  './docs/sre-book/ch22-cascading-failures.md',
  './docs/sre-book/ch23-distributed-consensus.md',
  './docs/k8s/deployments.md',
  './docs/k8s/services.md',
  './docs/k8s/resource-management.md',
  './docs/k8s/statefulsets.md',
  './docs/k8s/hpa.md',
  './topics/go-stdlib.html',
  './topics/go-testing.html',
  './docs/go/slog.md',
  './docs/go/testing.md',
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
