const fs = require('fs');
const src = fs.readFileSync('D:/project/Mineradio-main/public/index.html', 'utf8');
const lines = src.split('\n');

var splashCSS = lines.slice(165, 196).join('\n')
  .replace(/splash-word-mine/g, 'splash-word-bodhi')
  .replace(/splash-word-radio/g, 'splash-word-beats')
  .replace(/splash-mine-in/g, 'splash-bodhi-in')
  .replace(/splash-radio-in/g, 'splash-beats-in');

var splashHTML = lines.slice(1953, 1968).join('\n')
  .replace(/Mineradio/g, 'BodhiBeats')
  .replace(/splash-word-mine/g, 'splash-word-bodhi')
  .replace('Mine<', 'Bodhi<')
  .replace(/splash-word-radio/g, 'splash-word-beats')
  .replace('aria-label="radio"', 'aria-label="Beats"')
  .replace('rad<span class="splash-word-i" aria-hidden="true"></span><span class="splash-word-o">o</span>', 'Beats')
  .replace('private visual radio', 'private visual beats');

// 提取到 26240 行 (包含 playBodhiBeatsIntroSound 的闭合 })
var splashJS = lines.slice(25720, 26240).join('\n')
  .replace(/Mineradio/g, 'BodhiBeats')
  .replace(/mineradio/g, 'bodhibeats');

fs.writeFileSync('D:/project/BodhiBeats/splash-code.js', JSON.stringify({ css: splashCSS, html: splashHTML, js: splashJS }));
console.log('JS length:', splashJS.length);
console.log('JS last 80 chars:', splashJS.substring(splashJS.length - 80));
