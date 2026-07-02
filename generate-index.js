const fs = require('fs');
const splashCode = JSON.parse(fs.readFileSync('D:/project/BodhiBeats/splash-code.js', 'utf8'));

// 读取模板文件的各个部分
const parts = {
  head: fs.readFileSync('D:/project/BodhiBeats/parts/head.html', 'utf8'),
  css: fs.readFileSync('D:/project/BodhiBeats/parts/css.html', 'utf8'),
  body: fs.readFileSync('D:/project/BodhiBeats/parts/body.html', 'utf8'),
  mainjs: fs.readFileSync('D:/project/BodhiBeats/parts/main.js', 'utf8')
};

const html = parts.head + '\n' +
  '<style>\n' + parts.css + '\n' +
  '/* ===== Splash CSS ===== */\n' + splashCode.css + '\n' +
  '.splash-word-bodhi,.splash-word-beats{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);white-space:nowrap;will-change:opacity,transform}\n' +
  '.splash-word-bodhi{opacity:0;animation:splash-bodhi-in 5200ms cubic-bezier(.22,1,.36,1) forwards;text-shadow:-2px 0 0 rgba(255,83,103,.24),2px 0 0 rgba(122,215,194,.18),0 22px 72px rgba(0,0,0,.58),0 0 34px rgba(244,210,138,.10)}\n' +
  '.splash-word-beats{opacity:0;letter-spacing:-.018em;background:linear-gradient(94deg,rgba(255,255,255,.06),#fff 26%,rgba(244,210,138,.98) 48%,rgba(122,215,194,.90) 68%,rgba(255,255,255,.82));background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:splash-beats-in 5200ms cubic-bezier(.22,1,.36,1) forwards}\n' +
  '</style>\n</head>\n<body>\n' +
  '<div id="canvas-container"></div>\n' +
  '<!-- Splash -->\n' + splashCode.html + '\n\n' +
  parts.body + '\n' +
  '<script>\n' +
  'var splashAnimating = true;\n' + splashCode.js + '\n' +
  parts.mainjs + '\n' +
  '</script>\n</body>\n</html>\n';

fs.writeFileSync('D:/project/BodhiBeats/public/index.html', html, 'utf8');
console.log('Done, size:', html.length);
