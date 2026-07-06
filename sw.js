const CACHE_NAME = 'lifttracker-v2'; // UPDATED: Forces the browser to activate the new service worker
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // REMOVED: './chart.js' is no longer pre-cached locally
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - UPDATED: Implements a Network-First, Cache-Fallback strategy for dynamic resources (like CDN libraries)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // 1. Try to fetch from the network first
      return fetch(event.request).then((networkResponse) => {
        // If successful, cache the new response for offline use and return it
        console.log('[Service Worker] Caching new resource:', event.request.url);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }).catch(() => {
        // 2. If the user is offline, grab it from the cache
        return cache.match(event.request);
      });
    })
  );
});
