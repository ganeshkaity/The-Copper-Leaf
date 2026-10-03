const CACHE_NAME = 'copper-leaf-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/brand/logo.png',
  '/brand/logo-full.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache Firebase, Firestore, RTDB, API or mutating routes
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('firestore') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through to network directly
  }

  // Network-first for static shell assets with offline fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
