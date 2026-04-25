/**
 * Mr. Guide Service Worker — PWA offline support.
 *
 * Interview talking point:
 *   "The service worker caches the app shell and static assets on first load.
 *    Tourists in areas with poor connectivity (common in rural Sri Lanka) can
 *    still access saved trips and guide profiles offline. This is a key PWA
 *    capability — installable on Android/iOS home screens, works offline,
 *    and loads instantly from cache on repeat visits."
 *
 * Strategy:
 *   - App shell (HTML/JS/CSS/icons) → Cache-First
 *   - Google Maps tiles              → Cache-First (30-day TTL)
 *   - API calls                      → Network-First with offline fallback
 *   - Navigate requests              → serve cached index.html (SPA fallback)
 */

const CACHE_VERSION  = 'mrguide-v1';
const API_CACHE      = 'mrguide-api-v1';
const MAPS_CACHE     = 'mrguide-maps-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/logo192.png',
  '/favicon.ico'
];

// ─── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())  // don't block install if a file 404s in dev
  );
});

// ─── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_VERSION, API_CACHE, MAPS_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: routing strategy ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Google Maps tiles — Cache-First, long TTL
  if (url.hostname.includes('maps.googleapis.com') ||
      url.hostname.includes('maps.gstatic.com')) {
    event.respondWith(cacheFirst(request, MAPS_CACHE, 30 * 24 * 60 * 60));
    return;
  }

  // API calls — Network-First, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // SPA navigation — always serve index.html from cache (React Router handles routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html') || caches.match('/offline.html')
      )
    );
    return;
  }

  // Static assets — Cache-First
  event.respondWith(cacheFirst(request, CACHE_VERSION));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName, maxAgeSeconds = null) {
  const cached = await caches.match(request);
  if (cached) {
    if (maxAgeSeconds) {
      const dateHeader = cached.headers.get('date');
      if (dateHeader) {
        const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
        if (age > maxAgeSeconds) return fetchAndCache(request, cacheName);
      }
    }
    return cached;
  }
  return fetchAndCache(request, cacheName);
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetchAndCache(request, cacheName);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(
      JSON.stringify({ error: 'You are offline. Please check your connection.', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response.ok && response.status < 400) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// ─── Background sync placeholder ──────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncPendingReviews());
  }
});

async function syncPendingReviews() {
  // TODO: read pending reviews from IndexedDB and POST when back online
  console.log('[SW] Background sync: reviews');
}
