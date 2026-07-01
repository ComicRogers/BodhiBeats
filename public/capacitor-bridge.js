// Mineradio Capacitor Bridge — 由 Android WebView 在页面加载前注入
// 提供 desktopWindow 兼容层 + InAppBrowser 登录桥接 + 文件导入导出
(function(){
  if (window.__mineradioCapacitorBridge) return;
  window.__mineradioCapacitorBridge = true;

  var Capacitor = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins : {};
  var isCapacitorNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var InAppLogin = Capacitor.InAppLogin || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppLogin ? window.Capacitor.Plugins.InAppLogin : null);

  // 仅当当前不是桌面 Electron 环境时才注入 desktopWindow 兼容 shim
  // (桌面端 window.desktopWindow 已由 preload.js 注入, 保留原样)
  var isDesktopElectron = !!(window.desktopWindow && window.desktopWindow.isDesktop);
  if (!isDesktopElectron) {
  window.desktopWindow = {
    isDesktop: false,
    isCapacitorNative: isCapacitorNative,
    minimize: function(){ return Promise.resolve({ ok: true }); },
    toggleMaximize: function(){ return Promise.resolve({ ok: true }); },
    toggleFullscreen: function(){
      if (!document.fullscreenElement) {
        return document.documentElement.requestFullscreen().catch(function(){});
      }
      return document.exitFullscreen();
    },
    exitFullscreenWindowed: function(){
      if (document.fullscreenElement) return document.exitFullscreen();
      return Promise.resolve({ ok: true });
    },
    getState: function(){
      return Promise.resolve({
        isMaximized: false,
        isNativeFullScreen: !!document.fullscreenElement,
        isHtmlFullScreen: false,
        isWindowFullScreen: false,
        isFullScreen: !!document.fullscreenElement,
        isMinimized: document.hidden,
        isVisible: !document.hidden,
        isFocused: document.hasFocus(),
        isPrimaryDisplay: true,
        hasDisplayOnLeft: false,
        hasDisplayOnRight: false,
        displayBounds: null
      });
    },
    close: function(){
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp && window.Capacitor.Plugins.App.exitApp();
      }
      return Promise.resolve({ ok: true });
    },
    // 登录: 原生环境用 InAppLogin 插件打开 WebView 抓 cookie; 否则降级
    openNeteaseMusicLogin: function(){
      if (InAppLogin && isCapacitorNative) return InAppLogin.openNeteaseLogin();
      return Promise.resolve({ ok: false, error: 'USE_QR_FALLBACK' });
    },
    clearNeteaseMusicLogin: function(){
      if (InAppLogin && isCapacitorNative) return InAppLogin.clearNeteaseLogin();
      return Promise.resolve({ ok: true });
    },
    openQQMusicLogin: function(){
      if (InAppLogin && isCapacitorNative) return InAppLogin.openQQLogin();
      return Promise.resolve({ ok: false, error: 'USE_QR_FALLBACK' });
    },
    clearQQMusicLogin: function(){
      if (InAppLogin && isCapacitorNative) return InAppLogin.clearQQLogin();
      return Promise.resolve({ ok: true });
    },
    // 更新: 移动端无桌面安装包概念, 引导到下载页
    openUpdateInstaller: function(filePath){
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
        window.Capacitor.Plugins.Browser.open({ url: 'https://github.com/XxHuberrr/Mineradio/releases' });
      }
      return Promise.resolve({ ok: false, error: 'USE_BROWSER_DOWNLOAD' });
    },
    restartApp: function(){
      // Android 无运行时重启, 退出让用户重开
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp && window.Capacitor.Plugins.App.exitApp();
      }
      return Promise.resolve({ ok: true });
    },
    // 全局热键: 移动端不支持, 返回未注册
    configureGlobalHotkeys: function(){ return Promise.resolve({ ok: true, results: [] }); },
    onGlobalHotkey: function(){ return function(){}; },
    // 导入导出: 用 Filesystem + Share
    exportJsonFile: function(payload){ return exportJson(payload); },
    importJsonFile: function(){ return importJson(); },
    // 桌面歌词/壁纸: 移动端用通知栏(已在 MediaSession 处理), 这里 no-op
    setDesktopLyricsEnabled: function(){ return Promise.resolve({ ok: true }); },
    updateDesktopLyrics: function(){ return Promise.resolve({ ok: true }); },
    onDesktopLyricsLockState: function(){ return function(){}; },
    onDesktopLyricsEnabledState: function(){ return function(){}; },
    setDesktopLyricsPointerCapture: function(){ return Promise.resolve({ ok: true }); },
    setDesktopLyricsHotBounds: function(){ return Promise.resolve({ ok: true }); },
    setDesktopLyricsLockState: function(){ return Promise.resolve({ ok: true, locked: true }); },
    setDesktopLyricsMoveBy: function(){ return Promise.resolve({ ok: true }); },
    setWallpaperMode: function(){ return Promise.resolve({ ok: true }); },
    updateWallpaperMode: function(){ return Promise.resolve({ ok: true }); },
    onStateChange: function(callback){
      // 用 visibilitychange 模拟窗口状态变化
      document.addEventListener('visibilitychange', function(){
        callback({
          isMinimized: document.hidden,
          isVisible: !document.hidden,
          isFocused: document.hasFocus(),
          isFullScreen: !!document.fullscreenElement
        });
      });
    }
  };
  } // end if (!isDesktopElectron)

  // InAppBrowser 登录桥
  function openLoginInBrowser(provider){
    var url = provider === 'qq' ? 'https://y.qq.com/n/ryqq/profile' : 'https://music.163.com/#/login';
    var Browser = Capacitor.Browser;
    if (!Browser) return Promise.resolve({ ok: false, error: 'NO_INAPPBROWSER' });
    // Capacitor Browser 插件无法直接读 cookie, 需自定义插件补充
    // 这里返回标记, 前端 fallback 会走二维码/手动导入
    return Promise.resolve({ ok: false, error: 'USE_QR_FALLBACK', provider: provider });
  }

  function clearLoginSession(provider){
    // 清除对应域名 cookie (WebView 内)
    try {
      var domains = provider === 'qq'
        ? ['.qq.com', 'qq.com', 'y.qq.com']
        : ['.163.com', '163.com', 'music.163.com'];
      domains.forEach(function(d){ /* cookie 清理由 WebView 分区处理 */ });
    } catch (e) {}
    return Promise.resolve({ ok: true });
  }

  function exportJson(payload){
    var Filesystem = Capacitor.Filesystem;
    var Share = Capacitor.Share;
    if (!Filesystem) {
      // fallback: Blob 下载
      var text = typeof payload.text === 'string' ? payload.text : JSON.stringify(payload.data || {}, null, 2);
      var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = payload.defaultName || 'mineradio-export.json'; a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
      return Promise.resolve({ ok: true });
    }
    var fileName = (payload.defaultName || 'mineradio-export.json').replace(/[\\/:*?"<>|]+/g, '-');
    var text = typeof payload.text === 'string' ? payload.text : JSON.stringify(payload.data || {}, null, 2);
    return Filesystem.writeFile({
      path: 'Mineradio/' + fileName,
      data: btoa(unescape(encodeURIComponent(text))),
      directory: 'DOCUMENTS',
      recursive: true
    }).then(function(res){
      if (Share && res && res.uri) {
        return Share.share({ files: [res.uri] }).then(function(){ return { ok: true, filePath: res.uri }; });
      }
      return { ok: true, filePath: res && res.uri };
    }).catch(function(e){ return { ok: false, error: e.message || 'EXPORT_FAILED' }; });
  }

  function importJson(){
    var Filesystem = Capacitor.Filesystem;
    if (!Filesystem) {
      // fallback: input file
      return new Promise(function(resolve){
        var input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json';
        input.onchange = function(){
          var file = input.files && input.files[0];
          if (!file) return resolve({ ok: false, canceled: true });
          var reader = new FileReader();
          reader.onload = function(){ resolve({ ok: true, text: reader.result, filePath: file.name }); };
          reader.readAsText(file);
        };
        input.click();
      });
    }
    // Capacitor: 用 FilePicker 插件 (需额外安装 @capacitor-community/file-picker)
    // 这里先 fallback 到 input file
    return new Promise(function(resolve){
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = function(){
        var file = input.files && input.files[0];
        if (!file) return resolve({ ok: false, canceled: true });
        var reader = new FileReader();
        reader.onload = function(){ resolve({ ok: true, text: reader.result, filePath: file.name }); };
        reader.readAsText(file);
      };
      input.click();
    });
  }
})();
