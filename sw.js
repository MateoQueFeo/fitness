// sw.js - Service Worker for Offline Gym Use

// Increment the version number to trigger the update
const CACHE_NAME = 'gym-log-v5'; // Version updated
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  // Caching all icon sizes specified in manifest.json for full PWA support
  'https://img.icons8.com/color/48/000000/barbell.png',
  'https://img.icons8.com/color/72/000000/barbell.png',
  'https://img.icons8.com/color/96/000000/barbell.png',
  'https://img.icons8.com/color/144/000000/barbell.png',
  'https://img.icons8.com/color/192/000000/barbell.png',
  'https://img.icons8.com/color/512/000000/barbell.png'
];

const CDN_URLS = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js'
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
self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activating...');
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// The 'fetch' event intercepts network requests.
self.addEventListener('fetch', (e) => {
    // IMPROVEMENT: Use Stale-While-Revalidate for CDN assets.
    if (CDN_URLS.some(url => e.request.url.startsWith(url))) {
        e.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(e.request).then(cachedResponse => {
                    const fetchPromise = fetch(e.request).then(networkResponse => {
                        cache.put(e.request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Return cached response immediately, and update cache in background.
                    return cachedResponse || fetchPromise;
                });
            })
        );
    } else {
        // IMPROVEMENT: Use Cache-First for all other (local) assets.
        e.respondWith(
            caches.match(e.request).then((response) => {
                return response || fetch(e.request);
            })
        );
    }
});
