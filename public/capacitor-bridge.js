(function(){
  if (window.__bodhiBeatsBridge) return;
  window.__bodhiBeatsBridge = true;
  var isDesktop = !!(window.desktopWindow && window.desktopWindow.isDesktop);
  var isCap = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var InAppLogin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppLogin ? window.Capacitor.Plugins.InAppLogin : null;
  if (isDesktop) return;
  window.desktopWindow = {
    isDesktop: false,
    isCapacitorNative: isCap,
    openNeteaseMusicLogin: function(){ if (InAppLogin && isCap) return InAppLogin.openNeteaseLogin(); return Promise.resolve({ ok: false, error: 'USE_QR_FALLBACK' }); },
    clearNeteaseMusicLogin: function(){ if (InAppLogin && isCap) return InAppLogin.clearNeteaseLogin(); return Promise.resolve({ ok: true }); },
    openQQMusicLogin: function(){ if (InAppLogin && isCap) return InAppLogin.openQQLogin(); return Promise.resolve({ ok: false, error: 'USE_QR_FALLBACK' }); },
    clearQQMusicLogin: function(){ if (InAppLogin && isCap) return InAppLogin.clearQQLogin(); return Promise.resolve({ ok: true }); },
    openUpdateInstaller: function(){ return Promise.resolve({ ok: false }); },
    restartApp: function(){ if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) { window.Capacitor.Plugins.App.exitApp && window.Capacitor.Plugins.App.exitApp(); } return Promise.resolve({ ok: true }); },
    configureGlobalHotkeys: function(){ return Promise.resolve({ ok: true, results: [] }); },
    onGlobalHotkey: function(){ return function(){}; },
    exportJsonFile: function(p){ var t = typeof p.text === 'string' ? p.text : JSON.stringify(p.data||{},null,2); var b = new Blob([t],{type:'application/json'}); var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href=u; a.download=p.defaultName||'bodhibeats.json'; a.click(); setTimeout(function(){URL.revokeObjectURL(u);},1000); return Promise.resolve({ok:true}); },
    importJsonFile: function(){ return new Promise(function(r){ var i=document.createElement('input'); i.type='file'; i.accept='.json'; i.onchange=function(){ var f=i.files&&i.files[0]; if(!f) return r({ok:false,canceled:true}); var rd=new FileReader(); rd.onload=function(){ r({ok:true,text:rd.result,filePath:f.name}); }; rd.readAsText(f); }; i.click(); }); },
    setDesktopLyricsEnabled: function(){ return Promise.resolve({ok:true}); },
    updateDesktopLyrics: function(){ return Promise.resolve({ok:true}); },
    setWallpaperMode: function(){ return Promise.resolve({ok:true}); },
    updateWallpaperMode: function(){ return Promise.resolve({ok:true}); },
    onStateChange: function(cb){ document.addEventListener('visibilitychange', function(){ cb({isMinimized:document.hidden,isVisible:!document.hidden,isFullScreen:!!document.fullscreenElement}); }); },
    onDesktopLyricsLockState: function(){ return function(){}; },
    onDesktopLyricsEnabledState: function(){ return function(){}; },
    toggleFullscreen: function(){ if(!document.fullscreenElement) return document.documentElement.requestFullscreen().catch(function(){}); return document.exitFullscreen(); },
    exitFullscreenWindowed: function(){ if(document.fullscreenElement) return document.exitFullscreen(); return Promise.resolve({ok:true}); },
    getState: function(){ return Promise.resolve({isFullScreen:!!document.fullscreenElement,isMinimized:document.hidden,isVisible:!document.hidden,isFocused:document.hasFocus()}); },
    minimize: function(){ return Promise.resolve({ok:true}); },
    close: function(){ if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){window.Capacitor.Plugins.App.exitApp&&window.Capacitor.Plugins.App.exitApp();} return Promise.resolve({ok:true}); }
  };
})();
