// Simple Caching Service Worker

const CACHE_NAME = 'offshoresync-cache-v2';
const MAIN_COMPONENTS = [
  '/dashboard',
  '/sync',
  '/friends',
  '/settings'
];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const API_ROUTES = [
  '/api/auth/profile',
  '/api/auth/friends',
  '/api/auth/friend-requests'
];

// Broadcast Channel for online/offline status
const statusChannel = new BroadcastChannel('offshoresync-status');

// Broadcast online/offline status
self.addEventListener('online', () => {
  statusChannel.postMessage({ type: 'online' });
});

self.addEventListener('offline', () => {
  statusChannel.postMessage({ type: 'offline' });
});

// Install event - prepare cache and pre-cache main components
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        ...STATIC_ASSETS
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - advanced caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Never cache version endpoint
  if (url.pathname.includes('/api/version')) {
    // Pass through to network, never cache
    event.respondWith(fetch(event.request));
    return;
  }
  
  const isStaticAsset = STATIC_ASSETS.some(asset => url.pathname.includes(asset));
  const isMainComponent = MAIN_COMPONENTS.some(path => url.pathname.includes(path));
  const isAuthApiRoute = url.pathname.startsWith('/api/auth/');

  // Cache first for static assets and main components
  if (isStaticAsset || isMainComponent) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
      )
    );
    return;
  }

  // Network first for authenticated API GET requests
  if (isAuthApiRoute) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, try to serve from cache (using the full original request, including headers)
          return caches.open(CACHE_NAME).then((cache) =>
            cache.match(event.request).then((cachedResponse) => {
              return cachedResponse || new Response('Offline', { status: 503 });
            })
          );
        })
    );
    return;
  }

  // Default: just fetch from network
  event.respondWith(fetch(event.request));
});
