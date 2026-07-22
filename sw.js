const CACHE_NAME = 'lift-tracker-cache-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
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
    if (event.request.url.includes('workouts.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request).then(fetchedResponse => {
                    cache.put(event.request, fetchedResponse.clone());
                    return fetchedResponse;
                }).catch(() => {
                    return cache.match(event.request);
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse) {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
