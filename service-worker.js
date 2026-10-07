/* =====================================================================
   Warehouse Swiss Knife — service worker (offline support)
   ---------------------------------------------------------------------
   - Own files: network first, so changes pushed to GitHub show up as
     soon as you are online; the saved copy is used when offline.
   - Libraries and fonts from CDNs: saved after first use, then served
     from the phone (they never change at a fixed version URL).
   When you add a NEW page or file, add it to PRECACHE and raise VERSION.
   ===================================================================== */
const VERSION = 'wsk-v7';
const CDN_CACHE = 'wsk-cdn-v1';

const PRECACHE = [
  './',
  './index.html',
  './login.html',
  './session.js',
  './WSK_master_workbook.xlsx',
  './picking.html',
  './inbound.html',
  './outbound.html',
  './form.html',
  './abc.html',
  './inventory.html',
  './locations.html',
  './layout.html',
  './qr.html',
  './mod.html',
  './stopwatch.html',
  './style.css',
  './i18n.js',
  './warehouse.js',
  './xlsx.full.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k !== VERSION && k !== CDN_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Own files: network first, fall back to the saved copy
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // CDN libraries and fonts: saved copy first, download once
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CDN_CACHE).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }))
      )
    );
  }
});
