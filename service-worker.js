/**
 * Service Worker for Badminton Tournament Planner PWA
 * Enables offline functionality by caching application assets
 */

const CACHE_NAME = 'badminton-tournament-planner-v1';

// Files to cache for offline use
const FILES_TO_CACHE = [
  './',
  './index.html',
  './players.html',
  './tournament.html',
  './css/styles.css',
  './js/app.js',
  './js/localdb.js',
  './js/players.js',
  './js/tournament.js',
  './js/tournament-generator.js',
  './img/icon-192.png',
  './img/icon-512.png',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css'
];

// Install service worker and cache the application shell
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  // Claim clients so page is controlled immediately
  return self.clients.claim();
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  console.log('[ServiceWorker] Fetch', event.request.url);
  
  // Cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response from cache
        if (response) {
          console.log('[ServiceWorker] Returning from cache', event.request.url);
          return response;
        }
        
        // Not in cache - fetch from network
        console.log('[ServiceWorker] Not in cache, fetching', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response since it's a stream that can only be consumed once
            const responseToCache = response.clone();
            
            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[ServiceWorker] Fetch failed; returning offline page', error);
            // If the network is unavailable, return the offline page
            return caches.match('./index.html');
          });
      })
  );
});