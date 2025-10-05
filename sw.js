self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open('wendrops-static-v1');
    await cache.addAll([
      '/',
      '/index.html',
      '/points-system-v4.html',
      '/wallet-analysis-v4.html',
      '/terms.html',
      '/favicon.svg',
      '/favicon.ico',
      '/favicon-96x96.png',
      '/apple-touch-icon.png',
      '/site.webmanifest'
    ]);
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open('wendrops-static-v1');
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const network = await fetch(request);
      if (network && network.ok && request.url.startsWith(self.location.origin)) {
        cache.put(request, network.clone());
      }
      return network;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});


