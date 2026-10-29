/* Metrön : fonctionne hors ligne, et affiche le rappel doux.
   Stratégie : réseau d'abord, copie en cache si le réseau manque (pas de version périmée en développement). */

const CACHE = 'metron-v1';
const SHELL = ['./', 'index.html', 'style.css', 'tokens.css', 'app.js', 'icon.svg', 'logo.svg', 'manifest.webmanifest', 'widgets.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

// Toucher le rappel ouvre Metrön (ou ramène l'app déjà ouverte au premier plan)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'index.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.includes('index.html') || w.url.endsWith('/'));
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
