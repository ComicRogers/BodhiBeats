var CACHE_NAME = 'bodhibeats-v1';
var PRECACHE_URLS = ['./', './index.html', './vendor/three.r128.min.js', './vendor/gsap.min.js', './manifest.webmanifest'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE_NAME).then(function(c){ return c.addAll(PRECACHE_URLS).catch(function(){}); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ if (k !== CACHE_NAME) return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('/api/') === 0) return;
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(function(cached){ var net = fetch(req).then(function(res){ if (res && res.status === 200) { var cl = res.clone(); caches.open(CACHE_NAME).then(function(c){ c.put(req, cl).catch(function(){}); }); } return res; }).catch(function(){ return cached; }); return cached || net; }));
  }
});
