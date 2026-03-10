const CACHE_NAME = 'bjj-v3';
const ASSETS = [
  '/bjj/',
  '/bjj/index.html',
  '/bjj/styles.css',
  '/bjj/app.js',
  '/bjj/loader.js',
  '/bjj/data/half_guard.json',
  '/bjj/data/standing.json',
  '/bjj/manifest.json',
  '/bjj/icon-192.png',
  '/bjj/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
