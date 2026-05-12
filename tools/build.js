/**
 * MediCard Duel — Build Script
 * Concatenates all modular source files into a single dist/index.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// JS files in strict dependency order
const JS_ORDER = [
  'config/deploy-config.js',
  'storage/local-storage.js',
  'storage/data-compressor.js',
  // Subject files (loaded after storage but before loader)
  ...fs.readdirSync(path.join(SRC, 'modules/question-bank/subjects'))
    .filter(f => f.endsWith('.js'))
    .sort()
    .map(f => 'question-bank/subjects/' + f),
  'question-bank/question-validator.js',
  'question-bank/question-loader.js',
  'game-core/resource-system.js',
  'game-core/victory-condition.js',
  'game-core/turn-system.js',
  'game-core/game-state.js',
  'card-system/card-data.js',
  'card-system/card-effects.js',
  'card-system/card-visuals.js',
  'card-system/card-animations.js',
  'identity-system/identity-data.js',
  'identity-system/identity-skills.js',
  'identity-system/identity-ui.js',
  'ui-system/components/card-component.js',
  'ui-system/components/timer-component.js',
  'ui-system/components/player-panel.js',
  'ui-system/components/question-popup.js',
  'ui-system/screen-title.js',
  'ui-system/screen-lobby.js',
  'ui-system/screen-subject.js',
  'ui-system/screen-battle.js',
  'ui-system/screen-deck.js',
  'ui-system/screen-result.js',
  'audio-system/audio-generator.js',
  'network/sync-protocol.js',
  'network/room-manager.js',
  'network/p2p-host.js',
  'network/p2p-client.js',
  'main.js'
];

function readCSS() {
  const cssDir = path.join(SRC, 'css');
  const order = [
    'themes/default-theme.css',
    'components/glassmorphism.css',
    'components/buttons.css',
    'components/particles.css',
    'components/damage-numbers.css',
    'cards/card-base.css',
    'cards/card-rarity.css',
    'cards/card-3d-flip.css',
    'cards/card-subjects.css',
    'cards/card-animations.css',
    'screens/screen-title.css',
    'screens/screen-lobby.css',
    'screens/screen-subject.css',
    'screens/screen-battle.css',
    'animations/keyframes.css',
    'animations/transitions.css',
    'animations/particle-effects.css'
  ];
  let css = '';
  for (const file of order) {
    const fp = path.join(cssDir, file);
    if (fs.existsSync(fp)) {
      css += '/* ' + file + ' */\n' + fs.readFileSync(fp, 'utf8') + '\n';
    }
  }
  return css;
}

function readJS() {
  let js = '(function(){var MediCard=window.MediCard||{};window.MediCard=MediCard;\n';
  for (const file of JS_ORDER) {
    const fp = path.join(SRC, 'modules', file);
    if (fs.existsSync(fp)) {
      js += '// --- ' + file + ' ---\n';
      let content = fs.readFileSync(fp, 'utf8');
      // Strip any module.exports lines, keep window.MediCard assignments
      content = content.replace(/if\s*\(typeof\s+module[\s\S]*?}\s*$/gm, '');
      content = content.replace(/module\.exports\s*=\s*\{[^}]*\};?\s*/g, '');
      js += content + '\n';
    } else {
      console.warn('WARNING: File not found — ' + file);
    }
  }
  js += '})();';
  return js;
}

function build() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  const css = readCSS();
  const js = readJS();

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0f172a">
<title>MediCard Duel — 医学卡牌对决</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<!-- Game script runs FIRST — does not depend on CDN at boot -->
<script>${js}</script>
<!-- CDN scripts load async after game is running -->
<script>
(function loadCDN(url, id, cb) {
  var s = document.createElement('script');
  s.src = url; s.async = true; s.id = id;
  s.onload = function() { console.log('[CDN] Loaded: ' + id); if(cb) cb(); };
  s.onerror = function() { console.warn('[CDN] Failed: ' + id + ' — feature unavailable'); };
  document.head.appendChild(s);
})('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js', 'lz-string');
(function loadCDN(url, id, cb) {
  var s = document.createElement('script');
  s.src = url; s.async = true; s.id = id;
  s.onload = function() { console.log('[CDN] Loaded: ' + id); if(cb) cb(); };
  s.onerror = function() { console.warn('[CDN] Failed: ' + id + ' — feature unavailable'); };
  document.head.appendChild(s);
})('https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js', 'peerjs');
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  const sizeKB = (html.length / 1024).toFixed(1);
  console.log('Build complete: dist/index.html (' + sizeKB + ' KB)');
}

build();
