// Caches the app's own static shell (HTML/CSS/JS/icons) for fast repeat
// loads and basic resilience to a flaky connection. Deliberately does NOT
// touch Firebase SDK requests or Firestore's own network traffic - every
// screen still needs a live connection to actually read/write data; this
// only makes the UI itself load fast and stay viewable if the network
// briefly drops.

const CACHE_NAME = 'helth-static-v1';

const PRECACHE_URLS = [
  './',
  'index.html',
  'settings.html',
  'blood-pressure.html',
  'blood-pressure-report.html',
  'weight.html',
  'weight-report.html',
  'training.html',
  'training-reports.html',
  'running.html',
  'running-report.html',
  'walking.html',
  'walking-report.html',
  'pulldown.html',
  'pulldown-report.html',
  'bench-press.html',
  'bench-press-report.html',
  'reports.html',
  'styles.css',
  'db.js',
  'i18n.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // don't fail install over one missing/renamed file
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for our own static files only: serve the cached
// copy instantly if there is one, refresh it in the background, and fall
// back to cache if the network is unavailable.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
