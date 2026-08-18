const CACHE = 'skatequest-shell-v4';
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const scopedPath = path => `${SCOPE_PATH.replace(/\/$/, '')}${path}`;
const SHELL = [
  scopedPath('/'),
  scopedPath('/manifest.webmanifest'),
  scopedPath('/icon-192.svg'),
  scopedPath('/icon-512.svg'),
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Always prefer the newest page/app code. Fall back to cache only when offline.
  if (request.mode === 'navigate' || ['script', 'style'].includes(request.destination)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(scopedPath('/'))))
    );
    return;
  }

  // Images/fonts are safe to cache-first for speed.
  if (['font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(response => {
            if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
            return response;
          })
      )
    );
  }
});
