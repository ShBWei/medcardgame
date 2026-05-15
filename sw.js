/**
 * MediCard Speed Engine — Service Worker
 * ========================================
 * Offline caching for question banks, CSS, and JS assets.
 * Cache-first for versioned static files, network-first for HTML.
 * Registered by speed-engine.js (gracefully degrades if SW unsupported).
 */

var CACHE_NAME = 'medicard-v1';

// Static assets to pre-cache on install
var PRE_CACHE = [
  '/',
  '/index.html'
];

// URL patterns for runtime caching (question banks, CSS, JS)
var RUNTIME_PATTERNS = [
  /\/src\/modules\/question-bank\/subjects\/.*\.js(\?|$)/,   // question bank files
  /\/src\/css\/.*\.css(\?|$)/,                                // all CSS
  /\/src\/modules\/.*\.js(\?|$)/,                             // all JS modules
  /\/src\/lib\/.*\.js(\?|$)/                                  // external libs
];

// Install: pre-cache shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRE_CACHE).catch(function() {
        // Individual failures are OK — cache what we can
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Helper: does a URL match any runtime cache pattern?
function _matchesRuntime(url) {
  for (var i = 0; i < RUNTIME_PATTERNS.length; i++) {
    if (RUNTIME_PATTERNS[i].test(url)) return true;
  }
  return false;
}

// Helper: is this an HTML navigation request?
function _isHtmlRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept') &&
     request.headers.get('accept').indexOf('text/html') >= 0);
}

// Fetch: cache-first for static assets, network-first for HTML
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;
  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // HTML navigation: network-first
  if (_isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cloned);
          });
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || new Response('Offline — please check your connection.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
        })
    );
    return;
  }

  // Static assets matching runtime patterns: cache-first
  if (_matchesRuntime(url.href)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) {
          // Stale-while-revalidate: return cached, update in background
          var fetchPromise = fetch(event.request).then(function(response) {
            if (response.ok) {
              var cloned = response.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, cloned);
              });
            }
            return response;
          });
          // Don't block on revalidation
          return cached;
        }
        // Not in cache — fetch and cache
        return fetch(event.request).then(function(response) {
          if (!response.ok) return response;
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cloned);
          });
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, no caching
  event.respondWith(fetch(event.request));
});
