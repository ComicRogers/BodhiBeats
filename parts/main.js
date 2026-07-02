// ===== 全局状态 =====
var audio = new Audio(); audio.crossOrigin = 'anonymous';
var playQueue = [], currentIdx = -1, playing = false, playMode = 'list';
var loginProvider = 'netease', loginStatus = { loggedIn: false }, qqLoginStatus = { loggedIn: false };
var lyricsLines = [], currentLyricIdx = -1, qrKey = null, qrPollTimer = null, searchMode = 'netease';
var fx = { preset:0, intensity:1.0, particleSize:1.55, bloomStrength:0.6 };
var PRESET_NAMES = ['Emily','安魂','星河','唱片','星球','滚筒','虚空'];

async function apiJson(url, opts) {
  opts = opts || {}; var timer = null; var fo = Object.assign({}, opts); delete fo.timeoutMs;
  if (opts.timeoutMs && window.AbortController && !fo.signal) { var c = new AbortController(); fo.signal = c.signal; timer = setTimeout(function(){c.abort();}, opts.timeoutMs); }
  try { var r = await fetch(url, fo); return await r.json(); } finally { if (timer) clearTimeout(timer); }
}
function songCoverSrc(s, sz) {
  if (!s) return ''; var u = s.cover || (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || '';
  if (!u) return ''; if (u.indexOf('//') === 0) u = 'https:' + u;
  return '/api/cover?url=' + encodeURIComponent(u);
}
function songArtist(s) { return s ? (s.artist || (s.ar && s.ar[0] && s.ar[0].name) || (s.artists && s.artists[0] && s.artists[0].name) || '') : ''; }
function songTitle(s) { return s ? (s.name || s.title || '') : ''; }
function escapeHtml(s) { var d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; }
function formatTime(s) { if (!s || !isFinite(s)) return '0:00'; var m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + (sec < 10 ? '0' : '') + sec; }

var toastTimer = null;
function showToast(msg) {
  var el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(function() { el.classList.remove('show'); }, 2400);
}

function switchView(name) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var v = document.getElementById('view-' + name); if (v) v.classList.add('active');
  var n = document.querySelector('.nav-item[data-view="' + name + '"]'); if (n) n.classList.add('active');
  document.getElementById('view-container').scrollTop = 0;
  if (name === 'home') loadHome();
  if (name === 'library') loadLibrary();
  if (name === 'visual') renderVisualControls();
}

// 搜索
var searchTimer = null;
document.getElementById('search-input').addEventListener('input', function(e) {
  var q = e.target.value.trim(); if (searchTimer) clearTimeout(searchTimer);
  if (!q) { document.getElementById('search-results').innerHTML = '<div class="empty-state">输入关键词开始搜索</div>'; return; }
  searchTimer = setTimeout(function() { doSearch(q); }, 500);
});
document.querySelectorAll('.search-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.search-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active'); searchMode = tab.dataset.mode;
    var q = document.getElementById('search-input').value.trim(); if (q) doSearch(q);
  });
});

async function doSearch(q) {
  var el = document.getElementById('search-results'); el.innerHTML = '<div class="loading-spinner"></div>';
  try {
    var api = searchMode === 'qq' ? '/api/qq/search?keywords=' : '/api/search?keywords=';
    var data = await apiJson(api + encodeURIComponent(q) + '&limit=30');
    var songs = data.songs || data.result || [];
    if (!songs.length) { el.innerHTML = '<div class="empty-state">没有找到相关结果</div>'; return; }
    el.innerHTML = songs.map(function(s, i) {
      return '<div class="search-result-item" onclick="playFromSearch(' + i + ')"><img class="sri-cover" src="' + songCoverSrc(s, 80) + '" onerror="this.style.opacity=0"><div class="sri-info"><div class="sri-title">' + escapeHtml(songTitle(s)) + '</div><div class="sri-artist">' + escapeHtml(songArtist(s)) + '</div><span class="sri-source ' + (searchMode === 'qq' ? 'qq' : 'netease') + '">' + (searchMode === 'qq' ? 'QQ' : '网易云') + '</span></div><div class="sri-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>';
    }).join('');
    window._searchResults = songs;
  } catch (e) { el.innerHTML = '<div class="empty-state">搜索失败</div>'; }
}

function playFromSearch(i) { var s = window._searchResults; if (!s || !s[i]) return; playQueue = s.map(normalizeSong); currentIdx = i; playQueueAt(currentIdx); }
function normalizeSong(s) { return { id: s.id || s.songid, mid: s.mid || s.songmid, name: songTitle(s), artist: songArtist(s), cover: s.cover || (s.al && s.al.picUrl) || '', source: searchMode === 'qq' ? 'qq' : 'netease' }; }

// 播放
async function playQueueAt(idx) {
  if (idx < 0 || idx >= playQueue.length) return;
  currentIdx = idx; var song = playQueue[idx];
  updateMiniPlayer(song); updateFullPlayer(song); updateLyrics(song);
  try {
    var ua = song.source === 'qq' ? '/api/qq/song/url?mid=' + (song.mid || song.id) : '/api/song/url?id=';
    var ud = await apiJson(ua + (song.id || song.mid));
    var u = ud.url || (ud.data && ud.data[0] && ud.data[0].url);
    if (!u) { showToast('无法获取播放链接'); nextTrack(); return; }
    audio.src = u;
    await audio.play(); playing = true; updatePlayButtons(); updateMediaSession();
  } catch (e) { showToast('播放失败'); nextTrack(); }
}

function togglePlay() {
  if (!audio.src && playQueue.length) { playQueueAt(currentIdx >= 0 ? currentIdx : 0); return; }
  if (audio.paused) { audio.play().then(function() { playing = true; }).catch(function() {}); } else { audio.pause(); playing = false; }
  updatePlayButtons();
}
function nextTrack() { if (!playQueue.length) return; if (playMode === 'single') { playQueueAt(currentIdx); return; } var n = currentIdx + 1; if (n >= playQueue.length) n = 0; playQueueAt(n); }
function prevTrack() { if (!playQueue.length) return; var p = currentIdx - 1; if (p < 0) p = playQueue.length - 1; playQueueAt(p); }
function togglePlayMode() { var m = ['list', 'single', 'shuffle']; var i = m.indexOf(playMode); i = (i + 1) % 3; playMode = m[i]; showToast({ list: '顺序播放', single: '单曲循环', shuffle: '随机播放' }[playMode]); }

audio.addEventListener('ended', nextTrack);
audio.addEventListener('timeupdate', function() {
  if (audio.duration) {
    var pct = (audio.currentTime / audio.duration) * 100;
    document.getElementById('mp-progress').style.width = pct + '%';
    document.getElementById('fp-progress-fill').style.width = pct + '%';
    document.getElementById('fp-progress-handle').style.left = pct + '%';
    document.getElementById('fp-current').textContent = formatTime(audio.currentTime);
    document.getElementById('fp-duration').textContent = formatTime(audio.duration);
    updateLyricPosition();
  }
});

function updatePlayButtons() {
  var ic = playing ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
  document.getElementById('mp-play-icon').innerHTML = ic;
  document.getElementById('fp-play-icon').innerHTML = ic;
}
function updateMiniPlayer(s) {
  document.getElementById('mini-player').classList.remove('hidden');
  document.getElementById('mp-cover').src = songCoverSrc(s, 88) || '';
  document.getElementById('mp-title').textContent = s.name || '';
  document.getElementById('mp-artist').textContent = s.artist || '';
}
function updateFullPlayer(s) {
  document.getElementById('fp-cover').src = songCoverSrc(s, 400) || '';
  document.getElementById('fp-bg-img').src = songCoverSrc(s, 200) || '';
  document.getElementById('fp-song').textContent = s.name || '';
  document.getElementById('fp-artist').textContent = s.artist || '';
  document.getElementById('fp-name').textContent = s.name || '';
}
function openFullPlayer() { document.getElementById('full-player').classList.add('show'); }
function closeFullPlayer() { document.getElementById('full-player').classList.remove('show'); }
document.getElementById('fp-progress-bar').addEventListener('click', function(e) {
  if (!audio.duration) return; var r = this.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
});

// 歌词
async function updateLyrics(song) {
  lyricsLines = []; currentLyricIdx = -1;
  document.getElementById('fp-lyrics').innerHTML = '<div class="fp-lyric-line">加载歌词中…</div>';
  try {
    var api = song.source === 'qq' ? '/api/qq/lyric?mid=' + (song.mid || song.id) : '/api/lyric?id=';
    var data = await apiJson(api + (song.id || song.mid));
    var lrc = (data.lrc && data.lrc.lyric) || data.lyric || '';
    if (!lrc) { document.getElementById('fp-lyrics').innerHTML = '<div class="fp-lyric-line">暂无歌词</div>'; return; }
    lyricsLines = parseLrc(lrc); renderLyrics();
  } catch (e) { document.getElementById('fp-lyrics').innerHTML = '<div class="fp-lyric-line">歌词加载失败</div>'; }
}
function parseLrc(lrc) {
  var lines = []; lrc.split('\n').forEach(function(line) {
    var m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (m) lines.push({ t: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() });
  }); return lines;
}
function renderLyrics() {
  document.getElementById('fp-lyrics').innerHTML = lyricsLines.map(function(l, i) {
    return '<div class="fp-lyric-line' + (i === currentLyricIdx ? ' active' : '') + '">' + escapeHtml(l.text || '♪') + '</div>';
  }).join('');
}
function updateLyricPosition() {
  if (!lyricsLines.length) return; var t = audio.currentTime, idx = -1;
  for (var i = 0; i < lyricsLines.length; i++) { if (lyricsLines[i].t <= t) idx = i; else break; }
  if (idx !== currentLyricIdx) {
    currentLyricIdx = idx; var ls = document.getElementById('fp-lyrics').querySelectorAll('.fp-lyric-line');
    ls.forEach(function(l, i) { l.classList.toggle('active', i === idx); });
    if (idx >= 0 && ls[idx]) ls[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Home
async function loadHome() {
  var now = new Date(), days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  document.getElementById('home-date').textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + days[now.getDay()];
  loadWeather(); loadDailyRecs(); loadHomePlaylists();
}
async function loadWeather() {
  try {
    var loc = await apiJson('/api/weather/ip-location');
    if (loc && loc.latitude) {
      var w = await apiJson('/api/weather/radio?lat=' + loc.latitude + '&lon=' + loc.longitude);
      if (w && w.weather) {
        document.getElementById('weather-card').style.display = 'block';
        document.getElementById('wc-temp').textContent = w.weather.temp + '°';
        document.getElementById('wc-city').textContent = (loc.city || '') + ' · ' + w.weather.description;
        document.getElementById('wc-mood').textContent = w.mood || '';
      }
    }
  } catch (e) {}
}
async function loadDailyRecs() {
  try {
    var d = await apiJson('/api/discover/home'); var recs = d.recommendSongs || d.recommend_songs || [];
    if (!recs.length) return;
    document.getElementById('home-daily').innerHTML = recs.slice(0, 6).map(function(s, i) {
      return '<div class="tile" onclick="playDailyRec(' + i + ')"><img class="tile-cover" src="' + songCoverSrc(s, 200) + '" onerror="this.style.opacity=.3"><div class="tile-body"><div class="tile-title">' + escapeHtml(songTitle(s)) + '</div><div class="tile-sub">' + escapeHtml(songArtist(s)) + '</div></div></div>';
    }).join('');
    window._dailyRecs = recs;
  } catch (e) {}
}
function playDailyRec(i) { var r = window._dailyRecs; if (!r || !r[i]) return; playQueue = r.map(normalizeSong); currentIdx = i; playQueueAt(currentIdx); }

async function loadHomePlaylists() {
  if (!loginStatus.loggedIn) { document.getElementById('home-playlists').innerHTML = '<div class="empty-state" style="grid-column:span 2">登录后查看歌单</div>'; return; }
  try {
    var d = await apiJson('/api/user/playlists?uid=' + loginStatus.userId); var lists = d.playlist || [];
    if (!lists.length) return;
    document.getElementById('home-playlists').innerHTML = lists.slice(0, 6).map(function(p) {
      return '<div class="tile" onclick="openPlaylist(' + p.id + ')"><img class="tile-cover" src="' + (p.coverImgUrl ? '/api/cover?url=' + encodeURIComponent(p.coverImgUrl) : '') + '" onerror="this.style.opacity=.3"><div class="tile-body"><div class="tile-title">' + escapeHtml(p.name) + '</div><div class="tile-sub">' + p.trackCount + ' 首</div></div></div>';
    }).join('');
  } catch (e) {}
}

async function openPlaylist(id) {
  switchView('library');
  try {
    var d = await apiJson('/api/playlist/tracks?id=' + id + '&limit=100'); var tracks = d.songs || d.tracks || [];
    if (!tracks.length) { showToast('歌单为空'); return; }
    playQueue = tracks.map(normalizeSong);
    var html = tracks.map(function(s, i) { return '<div class="playlist-track" onclick="playFromPlaylist(' + i + ')"><div class="pt-idx">' + (i + 1) + '</div><div class="pt-info"><div class="pt-title">' + escapeHtml(songTitle(s)) + '</div><div class="pt-artist">' + escapeHtml(songArtist(s)) + '</div></div></div>'; }).join('');
    document.getElementById('view-library').innerHTML = '<div style="padding:calc(var(--safe-top) + 12px) 16px calc(var(--nav-h) + var(--player-h) + 24px + var(--safe-bottom))"><div class="home-greeting">播放列表</div><div class="home-date">' + tracks.length + ' 首</div><div class="playlist-list" style="margin-top:16px">' + html + '</div></div>';
  } catch (e) { showToast('加载歌单失败'); }
}
function playFromPlaylist(i) { if (i >= 0 && i < playQueue.length) { currentIdx = i; playQueueAt(currentIdx); } }

async function loadLibrary() {
  if (!loginStatus.loggedIn) { document.getElementById('library-playlists').innerHTML = '<div class="empty-state" style="grid-column:span 2">请先登录</div>'; return; }
  try {
    var d = await apiJson('/api/user/playlists?uid=' + loginStatus.userId); var lists = d.playlist || [];
    if (!lists.length) { document.getElementById('library-playlists').innerHTML = '<div class="empty-state" style="grid-column:span 2">暂无歌单</div>'; return; }
    document.getElementById('library-info').textContent = lists.length + ' 个歌单';
    document.getElementById('library-playlists').innerHTML = lists.map(function(p) {
      return '<div class="tile" onclick="openPlaylist(' + p.id + ')"><img class="tile-cover" src="' + (p.coverImgUrl ? '/api/cover?url=' + encodeURIComponent(p.coverImgUrl) : '') + '" onerror="this.style.opacity=.3"><div class="tile-body"><div class="tile-title">' + escapeHtml(p.name) + '</div><div class="tile-sub">' + p.trackCount + ' 首</div></div></div>';
    }).join('');
  } catch (e) {}
}

// 登录
function openLoginSheet() { document.getElementById('login-sheet').classList.add('show'); document.getElementById('overlay').classList.add('show'); refreshQr(); }
function closePanel(id) { document.getElementById(id).classList.remove('show'); document.getElementById('overlay').classList.remove('show'); if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } }
function closeAllPanels() { closePanel('login-sheet'); closePanel('visual-panel'); }
function switchLoginProvider(p) {
  loginProvider = p;
  document.querySelectorAll('.login-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('.login-tab[data-provider="' + p + '"]').classList.add('active');
  document.getElementById('cookie-note').textContent = p === 'qq' ? '从 y.qq.com 登录后复制 cookie。' : '从 music.163.com 登录后复制 cookie。';
  refreshQr();
}
async function refreshQr() {
  if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; }
  var st = document.getElementById('qr-status');
  if (loginProvider === 'qq') { document.getElementById('qr-img').src = ''; st.textContent = '点击"网页登录"或手动导入'; st.className = ''; return; }
  try {
    var k = await apiJson('/api/login/qr/key'); if (!k.key) throw new Error('获取 key 失败');
    qrKey = k.key; var q = await apiJson('/api/login/qr/create?key=' + encodeURIComponent(qrKey));
    if (!q.img) throw new Error('生成二维码失败');
    document.getElementById('qr-img').src = q.img; st.textContent = '请使用网易云音乐 App 扫码'; st.className = '';
    qrPollTimer = setInterval(checkQr, 2000);
  } catch (e) { st.textContent = '出错: ' + e.message; st.className = 'fail'; }
}
async function checkQr() {
  if (!qrKey) return;
  try {
    var r = await apiJson('/api/login/qr/check?key=' + encodeURIComponent(qrKey));
    if (r.code === 800) { document.getElementById('qr-status').textContent = '二维码过期'; document.getElementById('qr-status').className = 'fail'; if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } }
    else if (r.code === 803) { document.getElementById('qr-status').textContent = '登录成功'; document.getElementById('qr-status').className = 'scan'; if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } await refreshLoginStatus(); closeAllPanels(); showToast('登录成功'); loadHome(); updateSettingsAccount(); }
    else if (r.code === 802) { document.getElementById('qr-status').textContent = '等待确认…'; }
  } catch (e) {}
}
async function openWebLogin() {
  var api = window.desktopWindow;
  if (!api || !(api.isDesktop || api.isCapacitorNative)) { showToast('当前环境不支持网页登录，请扫码或手动导入'); return; }
  try {
    var r = loginProvider === 'qq' ? await api.openQQMusicLogin() : await api.openNeteaseMusicLogin();
    if (r && r.ok && r.cookie) {
      var ca = loginProvider === 'qq' ? '/api/qq/login/cookie' : '/api/login/cookie';
      var info = await apiJson(ca, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cookie: r.cookie }) });
      if (info && info.loggedIn) { if (loginProvider === 'qq') { qqLoginStatus = info; } else { loginStatus = info; } closeAllPanels(); showToast('登录成功: ' + (info.nickname || '')); loadHome(); updateSettingsAccount(); }
    }
  } catch (e) { showToast('登录失败'); }
}
function toggleCookiePanel() { document.getElementById('cookie-panel').classList.toggle('show'); }
async function submitCookieLogin() {
  var c = document.getElementById('cookie-input').value.trim(); if (!c) { showToast('请粘贴 cookie'); return; }
  try {
    var api = loginProvider === 'qq' ? '/api/qq/login/cookie' : '/api/login/cookie';
    var info = await apiJson(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cookie: c }) });
    if (info && info.loggedIn) { if (loginProvider === 'qq') { qqLoginStatus = info; } else { loginStatus = info; } document.getElementById('cookie-input').value = ''; closeAllPanels(); showToast('登录成功: ' + (info.nickname || '')); loadHome(); updateSettingsAccount(); }
    else { showToast('cookie 无效'); }
  } catch (e) { showToast('登录失败'); }
}
async function refreshLoginStatus() { try { var d = await apiJson('/api/login/status'); if (d && d.data && d.data.code === 200 && d.data.profile) { loginStatus = { loggedIn: true, nickname: d.data.profile.nickname, userId: d.data.profile.userId, avatar: d.data.profile.avatarUrl }; } } catch (e) {} }
function updateSettingsAccount() {
  var el = document.getElementById('settings-account');
  if (loginStatus.loggedIn) { el.innerHTML = '<div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--surface);border-radius:var(--radius)"><img src="' + (loginStatus.avatar || '') + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover"><div><div style="font-size:14px;font-weight:600">' + escapeHtml(loginStatus.nickname || '') + '</div><div style="font-size:12px;color:var(--muted)">网易云音乐</div></div></div>'; }
  else { el.innerHTML = '<div style="padding:16px;background:var(--surface);border-radius:var(--radius);text-align:center;font-size:14px;color:var(--accent);cursor:pointer" onclick="openLoginSheet()">点击登录</div>'; }
}

// 视觉控制
function renderVisualControls() {
  var presets = PRESET_NAMES.map(function(n, i) { return '<div class="vp-preset' + (i === fx.preset ? ' active' : '') + '" onclick="selectPreset(' + i + ')">' + n + '</div>'; }).join('');
  document.getElementById('visual-presets').innerHTML = presets;
  document.getElementById('vp-presets').innerHTML = presets;
  var ctrls = [{ l: '粒子强度', k: 'intensity', min: 0.2, max: 2, step: 0.05 }, { l: '粒子大小', k: 'particleSize', min: 0.5, max: 3, step: 0.05 }, { l: '辉光强度', k: 'bloomStrength', min: 0, max: 1.5, step: 0.05 }];
  var html = ctrls.map(function(c) { return '<div class="vp-slider-row"><div class="vp-label">' + c.l + '</div><div class="vp-slider"><input type="range" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + fx[c.k] + '" oninput="updateFx(\'' + c.k + '\',this.value)"></div><div class="vp-value" id="vp-val-' + c.k + '">' + fx[c.k] + '</div></div>'; }).join('');
  document.getElementById('visual-controls').innerHTML = html;
  document.getElementById('vp-controls').innerHTML = html;
}
function updateFx(k, v) { fx[k] = parseFloat(v); var el = document.getElementById('vp-val-' + k); if (el) el.textContent = fx[k]; applyFxToVisual(); saveFx(); }
function applyFxToVisual() { if (window.uniforms) { if (uniforms.uIntensity) uniforms.uIntensity.value = fx.intensity; if (uniforms.uParticleSize) uniforms.uParticleSize.value = fx.particleSize; if (uniforms.uBloomStrength) uniforms.uBloomStrength.value = fx.bloomStrength; } }
function saveFx() { try { localStorage.setItem('bodhibeats-fx', JSON.stringify(fx)); } catch (e) {} }
function loadFx() { try { var s = localStorage.getItem('bodhibeats-fx'); if (s) fx = Object.assign(fx, JSON.parse(s)); } catch (e) {} }
function selectPreset(p) {
  fx.preset = p; var presets = { 0: { intensity: 1.0, particleSize: 1.55, bloomStrength: 0.6 }, 1: { intensity: 0.7, particleSize: 1.2, bloomStrength: 0.3 }, 2: { intensity: 1.2, particleSize: 2.0, bloomStrength: 0.9 }, 3: { intensity: 0.9, particleSize: 1.4, bloomStrength: 0.5 }, 4: { intensity: 1.3, particleSize: 1.8, bloomStrength: 0.8 }, 5: { intensity: 1.1, particleSize: 1.6, bloomStrength: 0.7 }, 6: { intensity: 0.5, particleSize: 0.8, bloomStrength: 0.2 } };
  Object.assign(fx, presets[p] || presets[0]); applyFxToVisual(); saveFx(); renderVisualControls();
}

// Three.js 粒子
var scene, camera, renderer, particles, uniforms;
var bass = 0, mid = 0, treble = 0, beatPulse = 0;
var audioCtx, analyser, frequencyData;

function initVisual() {
  scene = new THREE.Scene(); scene.background = null;
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100); camera.position.z = 6;
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  uniforms = { uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 }, uBeat: { value: 0 }, uIntensity: { value: fx.intensity }, uParticleSize: { value: fx.particleSize }, uBloomStrength: { value: fx.bloomStrength } };
  var count = 4096, pos = new Float32Array(count * 3), col = new Float32Array(count * 3), sz = new Float32Array(count);
  for (var i = 0; i < count; i++) {
    var r = 2 + Math.random() * 3, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph);
    var c = new THREE.Color().setHSL(0.5 + Math.random() * 0.2, 0.7, 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; sz[i] = 0.5 + Math.random() * 2;
  }
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  var vs = 'attribute vec3 aColor;attribute float aSize;uniform float uTime,uBass,uParticleSize;varying vec3 vColor;varying float vAlpha;void main(){vColor=aColor;vec3 p=position;p*=1.0+uBass*0.3+sin(uTime*0.5+p.x*0.3)*0.1;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uParticleSize*(300.0/-mv.z);vAlpha=0.6+uBass*0.4;}';
  var fs = 'uniform float uBloomStrength;varying vec3 vColor;varying float vAlpha;void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;float a=(1.0-smoothstep(0.0,0.5,d))*vAlpha;vec3 col=vColor+uBloomStrength*0.3;gl_FragColor=vec4(col,a);}';
  var m = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  particles = new THREE.Points(g, m); scene.add(particles);
  window.addEventListener('resize', function() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  renderer.domElement.addEventListener('webglcontextlost', function(e) { e.preventDefault(); }, false);
  renderer.domElement.addEventListener('webglcontextrestored', function() { initVisual(); }, false);
}

function initAudioAnalyser() {
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); var src = audioCtx.createMediaElementSource(audio); analyser = audioCtx.createAnalyser(); analyser.fftSize = 256; src.connect(analyser); analyser.connect(audioCtx.destination); frequencyData = new Uint8Array(analyser.frequencyBinCount); } catch (e) {}
}
function resumeAudio() { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(function() {}); }
document.addEventListener('pointerdown', function() { resumeAudio(); initAudioAnalyser(); }, { once: true });

var prevTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  var now = performance.now(), dt = Math.min((now - prevTime) / 1000, 0.05); prevTime = now;
  uniforms.uTime.value += dt;
  if (analyser && playing && !audio.paused) {
    analyser.getByteFrequencyData(frequencyData);
    var b = 0, m = 0, t = 0; for (var i = 0; i < 4; i++) b += frequencyData[i]; for (var i = 4; i < 32; i++) m += frequencyData[i]; for (var i = 32; i < frequencyData.length; i++) t += frequencyData[i];
    b /= 4 * 255; m /= 28 * 255; t /= (frequencyData.length - 32) * 255;
    bass = bass * 0.85 + b * 0.15; mid = mid * 0.85 + m * 0.15; treble = treble * 0.85 + t * 0.15;
    beatPulse *= 0.92; if (bass > 0.5) beatPulse = Math.max(beatPulse, bass * 0.6);
  } else { bass *= 0.95; mid *= 0.95; treble *= 0.95; beatPulse *= 0.9; }
  uniforms.uBass.value = bass * fx.intensity; uniforms.uMid.value = mid; uniforms.uTreble.value = treble; uniforms.uBeat.value = beatPulse;
  if (particles) { particles.rotation.y += dt * 0.08; particles.rotation.x += dt * 0.02; }
  renderer.render(scene, camera);
}

// MediaSession
if ('mediaSession' in navigator) { try { navigator.mediaSession.setActionHandler('play', function() { if (!playing) togglePlay(); }); navigator.mediaSession.setActionHandler('pause', function() { if (playing) togglePlay(); }); navigator.mediaSession.setActionHandler('previoustrack', prevTrack); navigator.mediaSession.setActionHandler('nexttrack', nextTrack); } catch (e) {} }
function updateMediaSession() { if (!('mediaSession' in navigator)) return; var s = playQueue[currentIdx]; if (!s) return; try { navigator.mediaSession.metadata = new MediaMetadata({ title: s.name || 'BodhiBeats', artist: s.artist || '', album: 'BodhiBeats', artwork: songCoverSrc(s, 512) ? [{ src: songCoverSrc(s, 512), sizes: '512x512', type: 'image/png' }] : [] }); navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (e) {} }
setInterval(function() { if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (e) {} } }, 2000);

function openQueuePanel() {
  if (!playQueue.length) { showToast('播放队列为空'); return; }
  var html = playQueue.map(function(s, i) { return '<div class="playlist-track' + (i === currentIdx ? ' playing' : '') + '" onclick="playFromPlaylist(' + i + ')"><div class="pt-idx">' + (i + 1) + '</div><div class="pt-info"><div class="pt-title">' + escapeHtml(songTitle(s)) + '</div><div class="pt-artist">' + escapeHtml(songArtist(s)) + '</div></div></div>'; }).join('');
  document.getElementById('view-library').innerHTML = '<div style="padding:calc(var(--safe-top) + 12px) 16px calc(var(--nav-h) + var(--player-h) + 24px + var(--safe-bottom))"><div class="home-greeting">播放队列</div><div class="home-date">' + playQueue.length + ' 首</div><div class="playlist-list" style="margin-top:16px">' + html + '</div></div>';
  switchView('library');
}

// Splash 进入
function dismissBodhiBeatsSplash() {
  var s = document.getElementById('splash'); if (!s || s.classList.contains('hide') || s.classList.contains('exiting')) return;
  splashAnimating = false; s.classList.add('exiting'); document.getElementById('app').classList.remove('hidden');
  setTimeout(function() { s.classList.add('hide'); s.style.display = 'none'; }, 1180);
  loadHome(); refreshLoginStatus().then(function() { if (loginStatus.loggedIn) { updateSettingsAccount(); loadHomePlaylists(); } });
}
document.getElementById('splash-enter').addEventListener('click', dismissBodhiBeatsSplash);
document.getElementById('splash').addEventListener('click', function(e) { if (splashReadyToEnter) dismissBodhiBeatsSplash(); });
document.addEventListener('keydown', function(e) { if (!document.getElementById('splash').classList.contains('hide') && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); if (splashReadyToEnter) dismissBodhiBeatsSplash(); } });
splashTimer = setTimeout(function() { splashReadyToEnter = true; var s = document.getElementById('splash'); if (s) { s.classList.add('ready'); var en = document.getElementById('splash-enter'); if (en) en.style.opacity = '1'; } }, 5000);

// 长按唤起视觉面板
var lpTimer = null;
document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#bottom-nav,#mini-player,#full-player,.bottom-sheet,#overlay,.search-header,button,input,.tile,.search-result-item,.playlist-track')) return;
  lpTimer = setTimeout(function() { document.getElementById('visual-panel').classList.add('show'); document.getElementById('overlay').classList.add('show'); }, 600);
}, { passive: true });
document.addEventListener('touchend', function() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }, { passive: true });
document.addEventListener('touchmove', function() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }, { passive: true });

// SW
if ('serviceWorker' in navigator && !(window.bodhiBeatsPlatform && window.bodhiBeatsPlatform.isCapacitor)) { navigator.serviceWorker.register('sw.js').catch(function() {}); }

// 初始化
loadFx(); initVisual(); animate(); renderVisualControls(); updateSettingsAccount();
