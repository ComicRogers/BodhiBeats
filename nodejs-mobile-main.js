// BodhiBeats nodejs-mobile 入口 — Android 端通过 nodejs-mobile 启动本地 server.js
// 监听 127.0.0.1, 由 WebView 通过 http://127.0.0.1:PORT 访问
process.env.BodhiBeats_PLATFORM = 'android';
process.env.HOST = '127.0.0.1';
process.env.PORT = process.env.PORT || '3000';

// 在 Android app 数据目录下持久化 cookie 和缓存
var path = require('path');
var fs = require('fs');

function resolveDataDir() {
  // nodejs-mobile 提供的 cwd 通常是 app 数据目录
  var candidates = [
    process.env.BodhiBeats_DATA_DIR,
    process.env.APP_DATA_DIR,
    process.cwd(),
    path.dirname(process.execPath)
  ];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (c && fs.existsSync(c) && fs.accessSync && true) {
      try { fs.accessSync(c, fs.W_OK); return c; } catch (e) {}
    }
  }
  return process.cwd();
}

var dataDir = resolveDataDir();
process.env.COOKIE_FILE = process.env.COOKIE_FILE || path.join(dataDir, '.cookie');
process.env.QQ_COOKIE_FILE = process.env.QQ_COOKIE_FILE || path.join(dataDir, '.qq-cookie');
process.env.BodhiBeats_UPDATE_DIR = process.env.BodhiBeats_UPDATE_DIR || path.join(dataDir, 'updates');
process.env.BodhiBeats_BEAT_CACHE_DIR = process.env.BodhiBeats_BEAT_CACHE_DIR || path.join(dataDir, 'cache', 'beatmaps');

try { require('./server.js'); } catch (e) {
  console.error('[bodhibeats nodejs-mobile] server.js failed:', e && e.stack || e);
}
