// Simple Caching Service Worker

const CACHE_NAME = 'offshoresync-cache-v1';
const MAIN_COMPONENTS = [
  '/dashboard',
  '/sync',
  '/friends',
  '/settings'
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

// Install event - prepare cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
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

// Fetch event - cache main components
self.addEventListener('fetch', (event) => {
  // Only cache GET requests for main components
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses for main components
        if (networkResponse.ok && 
            MAIN_COMPONENTS.some(path => event.request.url.includes(path))) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // No cache available
        throw error;
      }
    })()
  );
});
