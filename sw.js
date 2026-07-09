const CACHE_NAME = 'elusgram-cache-v1';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './reels.js',
  './communications.js',
  './Avatar_Elu.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
