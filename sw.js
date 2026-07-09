const CACHE_NAME = 'workout-tracker-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/exercises.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png'
];

// Install event: caches all the essential local assets for offline use.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching Files');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: intercepts network requests.
self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Strategy for third-party scripts (e.g., Chart.js from CDN)
    // Use Network Falling Back to Cache
    if (event.request.url.startsWith('https://cdnjs.cloudflare.com')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                try {
                    // 1. Try to fetch from the network first.
                    const networkResponse = await fetch(event.request);
                    // 2. If successful, cache a copy and return the network response.
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    // 3. If the network fails, try to serve from the cache.
                    const cachedResponse = await cache.match(event.request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // 4. If not in cache either, return a basic error response.
                    return new Response(null, { status: 404, statusText: 'Not Found' });
                }
            })
        );
        return; // IMPORTANT: Stop execution for this specific case.
    }
    
    // Strategy for local assets
    // Use Cache First, Falling Back to Network
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                // 1. If the asset is in the cache, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 2. If not in cache, fetch from the network.
                return fetch(event.request).then((networkResponse) => {
                    // 3. If fetched successfully, cache it and return the response.
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // 4. If network fails and it was a page navigation, return the offline page.
                    if (event.request.destination === 'document') {
                       return caches.match('/index.html');
                    }
                    // For other failed assets (images, etc.), return a standard error.
                    return Response.error();
                });
            });
        })
    );
});
