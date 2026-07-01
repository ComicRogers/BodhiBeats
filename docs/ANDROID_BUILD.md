# Mineradio Android 构建说明

本文档说明如何把 Mineradio 构建为 Android APK/AAB。前置条件：Node.js 18+、JDK 17、Android SDK。

## 一次性初始化

```bash
# 1. 安装依赖 (含 Capacitor CLI 和插件)
npm install

# 2. 添加 Android 平台 (生成 android/ 工程目录)
npx cap add android

# 3. 同步 web 资源到 Android 工程
npx cap sync android
```

## nodejs-mobile 集成

server.js 依赖 `NeteaseCloudMusicApi`(Node 原生模块), 需要 nodejs-mobile 把 Node 运行时打进 APK:

```bash
# 安装 nodejs-mobile-cordova (Capacitor 兼容封装)
npm install nodejs-mobile-cordova --save

# 或使用 juice 风格的 Capacitor 插件
# 参考实现: 在 android/app/src/main/java/.../MainActivity.java 中启动 Node 引擎
# 入口脚本: nodejs-mobile-main.js (已创建, 会 spawn server.js 监听 127.0.0.1)
```

nodejs-mobile 启动后, WebView 通过 `http://127.0.0.1:3000` 访问本地 API。
前端 `capacitor-bridge.js` 已处理 `desktopWindow` 兼容层, 无需额外注入。

## 登录窗口 — InAppLogin 自定义插件 (扫码即登录)

已提供自定义 Capacitor 插件 `InAppLoginPlugin.java`，用原生 Android WebView 打开 music.163.com / y.qq.com 登录页，轮询 CookieManager 抓 `MUSIC_U` / `qm_keyst`，扫码成功后自动回传 cookie。体验等同桌面版。

### 集成步骤

`npx cap add android` 后，把 `android-plugin/` 里的两个 Java 文件复制到 Android 工程：

```bash
# 假设包名 com.mineradio.app (见 capacitor.config.json)
cp android-plugin/InAppLoginPlugin.java android/app/src/main/java/com/mineradio/app/
cp android-plugin/MainActivity.java android/app/src/main/java/com/mineradio/app/  # 覆盖默认 MainActivity
```

> 如果 `npx cap add android` 生成的 MainActivity 路径不同，找到 `android/app/src/main/java/.../MainActivity.java`，手动加一行 `registerPlugin(InAppLoginPlugin.class);`（在 super.onCreate 之前），参考 `android-plugin/MainActivity.java`。

插件会自动注册为 `Capacitor.Plugins.InAppLogin`，前端 `capacitor-bridge.js` 已调用它。打包后网易云/QQ 登录按钮直接打开官方网页扫码，无需手动导入 cookie。

## 构建运行

```bash
# 打开 Android Studio 工程
npx cap open android

# 或命令行直接构建
cd android && ./gradlew assembleDebug
# 产物: android/app/build/outputs/apk/debug/app-debug.apk

# Release 构建 (需签名配置)
cd android && ./gradlew assembleRelease
# 产物: android/app/build/outputs/apk/release/app-release.apk
```

## PWA 形态 (无需打包)

不打包 APK 也能用: 把 server.js 部署到任意 Node 主机, 然后用手机浏览器访问:
```
http://<server-ip>:3000/index.html
```
浏览器会提示"添加到主屏幕", 即可作为 PWA 使用。Service Worker 会缓存静态资源。

## 权限说明

AndroidManifest.xml 需要:
- `INTERNET` - 访问网易云/QQ/Open-Meteo API
- `FOREGROUND_SERVICE` - 后台播放 + 通知栏歌词 (MediaSession)
- `WAKE_LOCK` - 播放时保持 CPU

不需要: 桌面快捷方式、壁纸嵌入(WorkerW)、悬浮窗(SYSTEM_ALERT_WINDOW) — 这些是桌面端特性。
