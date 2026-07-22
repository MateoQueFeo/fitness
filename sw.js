const CACHE_NAME = 'lift-tracker-cache-v2';
const STATIC_ASSETS = [
    './index.html', // Explicitly list start_url
    './style.css',
    './manifest.json',
    './workouts.json',
    './icon-192.png',
    './icon-512.png',
    './icon-512-maskable.png',
    './favicon-32x32.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Use a Network-first strategy for dynamic data that changes frequently.
    if (event.request.url.includes('workouts.json')) {
        event.respondWith(
            fetch(event.request).then(fetchedResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, fetchedResponse.clone());
                    return fetchedResponse;
                });
            }).catch(() => {
                // If the network fails, serve from cache.
                return caches.match(event.request);
            })
        );
        return;
    }

    // Use a Cache-first strategy for all other static assets.
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // If the resource is in the cache, return it.
            if (cachedResponse) {
                return cachedResponse;
            }
            // If not in cache, fetch it from the network, cache it, and return it.
            return fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    if (networkResponse && networkResponse.status === 200) {
                       cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            });
        })
    );
});
