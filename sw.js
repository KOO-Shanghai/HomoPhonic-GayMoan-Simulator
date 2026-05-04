const CACHE_NAME = 'audio-pwa-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './audio-engine.js',
  './audio/sprite.json',
  './audio/sprite.mp3',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 强制立即接管
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // 开发阶段使用 Network First 策略
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 更新缓存
        if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时回退到缓存
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    clients.claim().then(() => {
      const cacheWhitelist = [CACHE_NAME];
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});
