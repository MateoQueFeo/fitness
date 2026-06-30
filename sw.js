// sw.js - Service Worker for Offline Gym Use
const CACHE_NAME = 'gym-log-v1';
const ASSETS = [
  './',
  './workout_tracker.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://img.icons8.com/color/192/000000/barbell.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
