// Mineradio Service Worker — 缓存静态资源, API 请求始终走网络
var CACHE_NAME = 'mineradio-v1.1.1-pwa-v1';
var PRECACHE_URLS = [
  './',
  './index.html',
  './vendor/three.r128.min.js',
  './vendor/music-tempo.min.js',
  './vendor/gsap.min.js',
  './manifest.webmanifest'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS).catch(function(){});
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // API 请求和媒体代理永远走网络
  if (url.pathname.indexOf('/api/') === 0 || url.pathname === '/api') return;
  if (url.pathname === '/api/cover' || url.pathname === '/api/audio') return;
  // 同源静态资源: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function(cached){
        var network = fetch(req).then(function(res){
          if (res && res.status === 200 && res.type === 'basic') {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function(cache){ cache.put(req, clone).catch(function(){}); });
          }
          return res;
        }).catch(function(){ return cached; });
        return cached || network;
      })
    );
  }
  // 跨域 (字体/封面/音源) 直接走网络, 不拦截
});
