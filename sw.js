const CACHE_NAME = 'workout-tracker-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/chart.js',
  '/manifest.json',
  '/exercises.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((fetchResponse) => {
        if (fetchResponse.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(event.request, fetchResponse.clone()));
        }
        return fetchResponse;
      }).catch(() => {
        return new Response('You are offline.', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});
