const CACHE_NAME = 'skatequest-cache-v9';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/pwa.js',
  '/manifest.json',
  '/icons/skatequest-icon-192.png',
  '/icons/skatequest-icon-512.png',
  '/icons/skatequest-icon-192.svg',
  '/icons/skatequest-icon-512.svg',
  '/parks.json',
];

// Cache essential files during service worker installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      // addAll can fail if any URL is cross-origin or unavailable; add individually with safety
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err => {
            console.warn('Failed to cache', url, err);
          })
        )
      );
    })
  );
});

// Respond with cached files when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
