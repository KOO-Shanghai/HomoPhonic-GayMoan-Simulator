importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded');

  // Cache the index.html and manifest
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'document' || request.destination === 'manifest',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'app-shell',
    })
  );

  // Cache CSS and JS files
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets',
    })
  );

  // Cache Audio files with a Cache-First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'audio' || request.url.includes('.mp3') || request.url.includes('.wav'),
    new workbox.strategies.CacheFirst({
      cacheName: 'audio-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Cache icons
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
    })
  );
} else {
  console.log('Workbox failed to load');
}
