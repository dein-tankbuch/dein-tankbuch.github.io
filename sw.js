/* Tankbuch: hält die App-Dateien für den Offline-Betrieb bereit.
   Einträge liegen nicht hier, sondern im Browser-Speicher der Seite.
   Bei jeder neuen Version VERSION erhöhen, dann räumt der Browser den alten Speicher auf. */
'use strict';
const VERSION = 'v7';
const CACHE = 'tankbuch-' + VERSION;
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/barlow-400.woff2',
  './fonts/barlow-500.woff2',
  './fonts/barlow-600.woff2',
  './fonts/barlow-condensed-600.woff2',
  './fonts/barlow-condensed-700.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tankbuch-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Zuerst aus dem Speicher antworten (schnell und offline), im Hintergrund die Datei auffrischen.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const treffer = (await cache.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const netz = fetch(req)
      .then((res) => { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; })
      .catch(() => null);
    if (treffer) { e.waitUntil(netz); return treffer; }
    const res = await netz;
    return res || new Response('Offline und noch nicht gespeichert.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
