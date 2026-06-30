// sw.js - Service Worker for Offline Gym Use

// Increment the version number to trigger the update
const CACHE_NAME = 'gym-log-v2'; 
const ASSETS = [
  './',
  './workout_tracker.html',
  './styles.css',
  './app.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://img.icons8.com/color/192/000000/barbell.png'
];

// The 'install' event is fired when the service worker is first installed.
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
});

// The 'activate' event is fired when the service worker is activated.
// This is the perfect place to clean up old caches.
self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activating...');
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // If a cache key is not the current CACHE_NAME, delete it.
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // This line ensures the new service worker takes control immediately.
  return self.clients.claim();
});

// The 'fetch' event intercepts network requests.
self.addEventListener('fetch', (e) => {
  console.log('[Service Worker] Fetching:', e.request.url);
  e.respondWith(
    // Try to find the request in the cache first.
    caches.match(e.request).then((response) => {
      // If it's in the cache, return it. Otherwise, fetch it from the network.
      return response || fetch(e.request);
    })
  );
});
