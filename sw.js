// Offline support: keeps the app shell on the phone so it opens without signal.
// Bump VERSION whenever you change files so phones pick up the update.
const VERSION = 'betel-v2';
const SHELL = [
  './', 'index.html', 'app.css', 'config.js', 'i18n.js', 'app.js',
  'manifest.webmanifest', 'logo-mark.png', 'icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // YouTube, fonts, Supabase: straight to network
  if (url.pathname === '/yt-feed') return; // live data: always network

  // Network first, fall back to cache (so updates show quickly, offline still works)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
