const CACHE_NAME = 'lift-tracker-cache-v1';
const urlsToCache = [
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
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
