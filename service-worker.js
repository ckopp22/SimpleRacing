// Bump CACHE on every deploy so installed copies pick up the new build.
const CACHE = 'topdownracer-v21';

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
  './js/ghost.js',
  './js/input.js',
  './js/main.js',
  './js/menus.js',
  './js/net.js',
  './js/online.js',
  './js/onlineSession.js',
  './js/race.js',
  './js/scenery.js',
  './js/session.js',
  './js/storage.js',
  './js/touch.js',
  './js/track.js',
  './js/tracks.js',
  './js/trackMesh.js',
  './js/ui.js',
  './lib/three.module.min.js',
  './lib/peerjs.min.js',
  './assets/cars/car01.png',
  './assets/cars/car03.png',
  './assets/cars/car04.png',
  './assets/cars/car06.png',
  './assets/cars/car08.png',
  './assets/cars/car09.png',
  './assets/cars/car10.png',
  './assets/cars/car11.png',
  './assets/cars/car12.png',
  './assets/cars/car13.png',
  './assets/cars/car14.png',
  './assets/cars/car15.png',
  './assets/cars/car16.png',
  './assets/cars/car17.png',
  './assets/cars/car18.png',
  './assets/cars/car19.png',
  './assets/cars/car20.png',
  './assets/cars/car21.png',
  './assets/cars/car22.png',
  './assets/cars/car23.png',
  './assets/cars/car24.png',
  './assets/cars/car25.png',
  './assets/cars/car26.png',
  './assets/cars/car27.png',
  './assets/cars/car28.png',
  './assets/cars/car29.png',
  './assets/cars/car30.png',
  './assets/cars/car31.png',
  './assets/cars/car32.png',
  './assets/cars/car33.png',
  './assets/cars/car34.png',
  './assets/cars/car35.png',
  './assets/cars/car36.png',
  './assets/cars/car37.png',
  './assets/cars/car38.png',
  './assets/cars/car40.png',
  './assets/cars/car41.png',
  './assets/cars/car42.png',
  './assets/cars/car43.png',
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
