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

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      const url = new URL(event.request.url);

      // Check if request is for a static asset, main component, or API route
      const isStaticAsset = STATIC_ASSETS.some(asset => url.pathname.includes(asset));
      const isMainComponent = MAIN_COMPONENTS.some(path => url.pathname.includes(path));
      const isApiRoute = API_ROUTES.some(route => url.pathname.includes(route));

      // Cache first strategy for static assets and main components
      if (isStaticAsset || isMainComponent) {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }

      // Network first strategy for API and other routes
      return fetch(event.request).then((networkResponse) => {
        // Cache API routes with original request headers
        if (isApiRoute) {
          const responseToCache = networkResponse.clone();
          const cachedRequest = new Request(event.request, {
            headers: new Headers(event.request.headers)
          });
          cache.put(cachedRequest, responseToCache);
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache if network fails
        // Attempt to serve cached response with original headers
        const cachedRequest = new Request(event.request, {
          headers: new Headers(event.request.headers)
        });
        return cache.match(cachedRequest).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      });
    })
  );
});
