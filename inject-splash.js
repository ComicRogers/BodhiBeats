const fs = require('fs');
const code = JSON.parse(fs.readFileSync('D:/project/BodhiBeats/splash-code.js', 'utf8'));
let html = fs.readFileSync('D:/project/BodhiBeats/public/index.html', 'utf8');

// 1. 注入 splash CSS — 在 </style> 之前插入
const splashCSSBlock = '\n/* ===== Splash 开场动画 ===== */\n' + code.css + '\n';
html = html.replace('</style>', splashCSSBlock + '</style>');

// 2. 替换 splash HTML — 把简化版 splash 替换为原版
const oldSplashStart = '<!-- Splash -->\n<div id="splash">';
const oldSplashEnd = '</div>\n\n<!-- 主应用 -->';
const idxStart = html.indexOf(oldSplashStart);
const idxEnd = html.indexOf(oldSplashEnd);
if (idxStart >= 0 && idxEnd >= 0) {
  html = html.substring(0, idxStart) + '<!-- Splash -->\n' + code.html + '\n\n<!-- 主应用 -->' + html.substring(idxEnd + oldSplashEnd.length);
} else {
  console.log('WARN: Could not find splash HTML markers');
}

// 3. 注入 splash JS — 在主 script 的开头（var audio = new Audio() 之前）插入
const splashJSBlock = '\n// ===== Splash WebGL 开场动画 =====\nvar splashAnimating = true;\n' + code.js + '\n// ===== 结束 Splash 代码 =====\n\n';
const jsMarker = '// ===== 全局状态 =====';
const jsIdx = html.indexOf(jsMarker);
if (jsIdx >= 0) {
  html = html.substring(0, jsIdx) + splashJSBlock + html.substring(jsIdx);
} else {
  console.log('WARN: Could not find JS marker');
}

// 4. 修改 splash 进入逻辑 — 原版有 splashAnimating 和 dismissSplash
// 替换现有的 splash-enter click handler
html = html.replace(
  "document.getElementById('splash-enter').addEventListener('click', function(){\n  document.getElementById('splash').classList.add('hide');\n  document.getElementById('app').classList.remove('hidden');\n  setTimeout(function(){ document.getElementById('splash').style.display = 'none'; }, 800);\n  loadHome();\n  refreshLoginStatus().then(function(){\n    if (loginStatus.loggedIn) { updateSettingsAccount(); loadHomePlaylists(); }\n  });\n});",
  "function dismissBodhiBeatsSplash(){\n  var s = document.getElementById('splash');\n  if (!s || s.classList.contains('hide') || s.classList.contains('exiting')) return;\n  splashAnimating = false;\n  s.classList.add('exiting');\n  document.getElementById('app').classList.remove('hidden');\n  setTimeout(function(){ s.classList.add('hide'); s.style.display='none'; }, 1180);\n  loadHome();\n  refreshLoginStatus().then(function(){\n    if (loginStatus.loggedIn) { updateSettingsAccount(); loadHomePlaylists(); }\n  });\n}\ndocument.getElementById('splash-enter').addEventListener('click', dismissBodhiBeatsSplash);\ndocument.getElementById('splash').addEventListener('click', function(e){ if (splashReadyToEnter) dismissBodhiBeatsSplash(); });\ndocument.addEventListener('keydown', function(e){ if (!document.getElementById('splash').classList.contains('hide') && (e.key==='Enter'||e.code==='Space')) { e.preventDefault(); if (splashReadyToEnter) dismissBodhiBeatsSplash(); } });\nsplashTimer = setTimeout(function(){ splashReadyToEnter = true; var s=document.getElementById('splash'); if(s){ s.classList.add('ready'); var enter=document.getElementById('splash-enter'); if(enter) enter.style.opacity='1'; } }, 5000);"
);

fs.writeFileSync('D:/project/BodhiBeats/public/index.html', html, 'utf8');
console.log('Splash 代码注入完成, 文件大小:', html.length);
