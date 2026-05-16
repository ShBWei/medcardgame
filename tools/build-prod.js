/**
 * MediCard — Production Build
 * Bundles 56 JS files → 1 bundle.js + inlines 22 CSS files → <style>
 * Result: 4 HTTP requests instead of 78
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const VERSION = '5.9.0';

// ── CSS files in dependency order (from index.html) ──
const CSS_FILES = [
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
  'screens/screen-auth.css',
  'screens/screen-title.css',
  'screens/screen-lobby.css',
  'screens/screen-subject.css',
  'screens/screen-battle.css',
  'screens/screen-notebook.css',
  'screens/screen-study.css',
  'animations/keyframes.css',
  'animations/transitions.css',
  'animations/particle-effects.css',
  'community/community.css',
  'screens/screen-sr.css',
];

// ── JS files in dependency order (from index.html) ──
const JS_FILES = [
  // External libs (must load first)
  '../lib/lz-string.min.js',
  '../lib/peerjs.min.js',
  // Config & security
  'config/deploy-config.js',
  'security/crypto-utils.js',
  'security/frontend-security.js',
  'storage/local-storage.js',
  // Question bank
  'question-bank/question-loader.js',
  'question-bank/wrong-question-book.js',
  // UI screens (early, referenced by others)
  'ui-system/screen-notebook.js',
  'ui-system/screen-study.js',
  // Game core
  'game-core/resource-system.js',
  'game-core/victory-condition.js',
  'game-core/turn-system.js',
  'game-core/game-state.js',
  // Timer & debug
  'timer/timer-calculator.js',
  'debug/battle-logger.js',
  // Card system
  'card-system/card-data.js',
  'card-system/card-effects.js',
  'card-system/card-visuals.js',
  // Identity system
  'identity-system/identity-data.js',
  'identity-system/identity-skills.js',
  // UI components
  'ui-system/components/timer-component.js',
  'ui-system/components/player-panel.js',
  'ui-system/components/question-popup.js',
  'ui-system/components/target-strategies/single.js',
  'ui-system/components/target-strategies/multiple.js',
  'ui-system/components/target-selector.js',
  'ui-system/components/mp-attack-resolver.js',
  // Network
  'network/sync-protocol.js',
  'network/room-manager.js',
  'network/relay-transport.js',
  'network/p2p-host.js',
  'network/p2p-client.js',
  'network/multiplayer-adapter.js',
  // UI screens (rest)
  'ui-system/screen-auth.js',
  'ui-system/screen-title.js',
  'ui-system/screen-subject.js',
  'ui-system/screen-lobby.js',
  'ui-system/screen-battle.js',
  'ui-system/screen-result.js',
  // Audio
  'audio-system/audio-generator.js',
  // Community
  'community/community-core.js',
  'community/community-leaderboard.js',
  'community/community-questions.js',
  'community/community-feedback.js',
  // Speed engine
  '../speed-engine.js',
  // Main bootstrap
  'main.js',
  // Stress relief (standalone, last)
  'ui-system/screen-sr.js',
];

// ── Subject files (loaded dynamically by question-loader.js) ──
const SUBJECT_FILES = [
  'cell-biology.js',
  'biochemistry.js',
  'physiology.js',
  'pathology.js',
  'histology-embryology.js',
  'systematic-anatomy.js',
  'immunology.js',
  'microbiology.js',
];

function readCSS() {
  let css = '/* MediCard bundled CSS v' + VERSION + ' */\n';
  let total = 0;
  for (const file of CSS_FILES) {
    const fp = path.join(SRC, 'css', file);
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, 'utf8');
      css += '/* ' + file + ' */\n' + content + '\n';
      total++;
    } else {
      console.warn('  SKIP (not found): css/' + file);
    }
  }
  console.log('  CSS: ' + total + '/' + CSS_FILES.length + ' files bundled');
  return css;
}

function readJS() {
  // Wrap in IIFE closure to protect global scope
  let js = '/* MediCard bundled JS v' + VERSION + ' */\n';
  js += '(function(){\n';
  let total = 0;
  for (const file of JS_FILES) {
    // lib files are relative to SRC, module files are relative to SRC/modules
    let fp;
    if (file.startsWith('../lib/')) {
      fp = path.join(SRC, file.replace('../lib/', 'lib/'));
    } else if (file.startsWith('../speed-engine')) {
      fp = path.join(SRC, 'modules/speed-engine.js');
    } else {
      fp = path.join(SRC, 'modules', file);
    }
    if (fs.existsSync(fp)) {
      let content = fs.readFileSync(fp, 'utf8');
      // Remove sourceMappingURL references
      content = content.replace(/\/\/# sourceMappingURL=.*$/gm, '');
      js += '/* ' + file + ' */\n' + content + '\n';
      total++;
    } else {
      console.warn('  SKIP (not found): ' + file + ' (' + fp + ')');
    }
  }
  js += '})();\n';
  console.log('  JS:  ' + total + '/' + JS_FILES.length + ' files bundled');
  return js;
}

function build() {
  console.log('MediCard Production Build v' + VERSION);
  console.log('================================\n');

  // Clean dist
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  // 1. Bundle CSS (inline in HTML)
  const css = readCSS();
  const cssSize = (Buffer.byteLength(css, 'utf8') / 1024).toFixed(1);
  console.log('  → CSS bundle: ' + cssSize + ' KB\n');

  // 2. Bundle JS
  const js = readJS();
  const jsSize = (Buffer.byteLength(js, 'utf8') / 1024).toFixed(1);
  console.log('  → JS bundle: ' + jsSize + ' KB\n');

  // 3. Write bundle.js
  fs.writeFileSync(path.join(DIST, 'bundle.js'), js, 'utf8');

  // 4. Copy subject files (loaded dynamically)
  const subjectsDir = path.join(DIST, 'src/modules/question-bank/subjects');
  fs.mkdirSync(subjectsDir, { recursive: true });
  for (const f of SUBJECT_FILES) {
    const src = path.join(SRC, 'modules/question-bank/subjects', f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(subjectsDir, f));
    }
  }
  console.log('  Subjects: ' + SUBJECT_FILES.length + ' files copied\n');

  // 5. Write index.html
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0f172a">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';">
<title>MediCard 医杀</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script defer src="bundle.js?v=${VERSION}"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  const htmlSize = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log('  → index.html: ' + htmlSize + ' KB');

  // 6. Copy Cloudflare configs
  for (const f of ['_headers', '_redirects']) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST, f));
    }
  }
  console.log('  Config: _headers + _redirects copied');

  console.log('\n✅ Build complete → dist/');
  console.log('   Deploy: dist/ directory to Cloudflare Pages');
  console.log('   HTTP requests: 1 HTML + 1 JS = 2 total (vs 78 before)');
}

build();
