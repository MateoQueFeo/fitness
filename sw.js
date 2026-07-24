const STATIC_CACHE_NAME = 'workout-tracker-static-v2';
const DATA_CACHE_NAME = 'workout-tracker-data-v2';

const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-512-maskable.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== STATIC_CACHE_NAME && cacheName !== DATA_CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith('workouts.json')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } 
    else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
