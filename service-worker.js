// Bump CACHE on every deploy so installed copies pick up the new build.
const CACHE = 'topdownracer-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/ai.js',
  './js/audio.js',
  './js/camera.js',
  './js/car.js',
  './js/collision.js',
  './js/config.js',
  './js/drive.js',
  './js/effects.js',
  './js/input.js',
  './js/main.js',
  './js/menus.js',
  './js/race.js',
  './js/session.js',
  './js/storage.js',
  './js/touch.js',
  './js/track.js',
  './js/tracks.js',
  './js/trackMesh.js',
  './js/ui.js',
  './lib/three.module.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for the app shell; anything else goes to the network.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (hit) => hit || fetch(e.request).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
