const VERSION = 'v1';
const CORE_CACHE = `emad-core-${VERSION}`;
const RUNTIME_CACHE = `emad-runtime-${VERSION}`;

const CORE_ASSETS = [
  './',
  'blog/',
  'news/',
  'projects/',
  'about/',
  'search/',
  'talk/',
  'rss.xml',
  'sitemap.xml',
  'favicon.svg',
  'favicon.ico',
  'og-default.svg',
  'manifest.webmanifest'
];

const toAbsoluteUrl = (path) => new URL(path, self.registration.scope).toString();
const isHtmlRequest = (request) =>
  request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS.map(toAbsoluteUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![CORE_CACHE, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return caches.match(toAbsoluteUrl('./'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => cached);
    })
  );
});
