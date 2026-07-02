const fs = require('fs');
let code = JSON.parse(fs.readFileSync('D:/project/BodhiBeats/splash-code.js', 'utf8'));
code.html = code.html.split('rad<span class="splash-word-i" aria-hidden="true"></span><span class="splash-word-o">o</span>').join('Beats');
code.html = code.html.split('aria-label="radio"').join('aria-label="Beats"');
fs.writeFileSync('D:/project/BodhiBeats/splash-code.js', JSON.stringify(code));
console.log('HTML fixed:');
console.log(code.html);
