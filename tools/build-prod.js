/**
 * MediCard — Production Build
 * Code-split: bundle-core.js (auth/title, ~80 KB min) + bundle-game.js (rest, ~560 KB min)
 * Initial load: 1 HTML + 1 core JS = 2 requests (vs 78 before)
 * Game bundle loads on demand when user enters battle/study/multiplayer/etc.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const VERSION = '6.5.4';

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
  'screens/screen-fastlearn.css',
  'animations/keyframes.css',
  'animations/transitions.css',
  'animations/particle-effects.css',
  'community/community.css',
  'screens/screen-sr.css',
];

// ── Core JS: auth, title, subject selection — loaded immediately ──
const CORE_JS_FILES = [
  '../lib/lz-string.min.js',
  'config/deploy-config.js',
  'security/crypto-utils.js',
  'security/frontend-security.js',
  'cloud-api.js',
  'storage/local-storage.js',
  'question-bank/question-loader.js',
  'game-core/game-state.js',
  'ui-system/screen-auth.js',
  'ui-system/screen-title.js',
  'ui-system/screen-subject.js',
  'audio-system/audio-generator.js',
  'main.js',
];

// ── Game JS: battle, multiplayer, study, fastlearn — loaded on demand ──
const GAME_JS_FILES = [
  '../lib/peerjs.min.js',
  'question-bank/wrong-question-book.js',
  'fastlearn/fastlearn-storage.js',
  'fastlearn/fastlearn-core.js',
  'fastlearn/fastlearn-prereq.js',
  'fastlearn/fastlearn-casegroup.js',
  'fastlearn/dual-track-memory.js',
  'fastlearn/interleaving-scheduler.js',
  'fastlearn/fastlearn-cramming.js',
  'ui-system/screen-notebook.js',
  'ui-system/screen-study.js',
  'ui-system/screen-fastlearn.js',
  'game-core/resource-system.js',
  'game-core/victory-condition.js',
  'game-core/turn-system.js',
  'timer/timer-calculator.js',
  'debug/battle-logger.js',
  'card-system/card-data.js',
  'card-system/card-effects.js',
  'card-system/card-visuals.js',
  'identity-system/identity-data.js',
  'identity-system/identity-skills.js',
  'ui-system/components/timer-component.js',
  'ui-system/components/player-panel.js',
  'ui-system/components/question-popup.js',
  'ui-system/components/target-strategies/single.js',
  'ui-system/components/target-strategies/multiple.js',
  'ui-system/components/target-selector.js',
  'ui-system/components/mp-attack-resolver.js',
  'network/sync-protocol.js',
  'network/room-manager.js',
  'network/relay-transport.js',
  'network/p2p-host.js',
  'network/p2p-client.js',
  'network/multiplayer-adapter.js',
  'ui-system/screen-lobby.js',
  'ui-system/screen-battle.js',
  'ui-system/screen-result.js',
  'community/community-core.js',
  'community/community-leaderboard.js',
  'community/community-questions.js',
  'community/community-feedback.js',
  '../speed-engine.js',
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

function resolvePath(file) {
  if (file.startsWith('../lib/')) return path.join(SRC, file.replace('../lib/', 'lib/'));
  if (file.startsWith('../speed-engine')) return path.join(SRC, 'modules/speed-engine.js');
  return path.join(SRC, 'modules', file);
}

function readJSBundle(fileList, label) {
  let js = '/* MediCard ' + label + ' v' + VERSION + ' */\n';
  js += '(function(){\n';
  let total = 0, skipped = 0;
  for (const file of fileList) {
    const fp = resolvePath(file);
    if (fs.existsSync(fp)) {
      let content = fs.readFileSync(fp, 'utf8');
      content = content.replace(/\/\/# sourceMappingURL=.*$/gm, '');
      js += '/* ' + file + ' */\n' + content + '\n';
      total++;
    } else {
      console.warn('  SKIP (not found): ' + file + ' (' + fp + ')');
      skipped++;
    }
  }
  js += '})();\n';
  console.log('  ' + label + ': ' + total + '/' + fileList.length + ' files');
  return js;
}

function minifyJS(filePath, label) {
  const preSize = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log('  ' + label + ' pre-minify: ' + preSize + ' KB');
  try {
    const { execSync } = require('child_process');
    execSync('npx --yes terser "' + filePath + '" -c -m -o "' + filePath + '"', {
      stdio: 'pipe', timeout: 120000
    });
    const postSize = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log('  ' + label + ' post-minify: ' + postSize + ' KB');
  } catch (e) {
    console.warn('  ⚠ Terser failed for ' + label + ': ' + e.message);
  }
}

function minifyCSS(css) {
  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Collapse whitespace
  css = css.replace(/\s+/g, ' ');
  // Remove spaces around structural characters
  css = css.replace(/\s*([{};:,>+~])\s*/g, '$1');
  // Remove trailing semicolons before }
  css = css.replace(/;}/g, '}');
  // Clean up
  css = css.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  css = css.replace(/{\s*/g, '{').replace(/\s*}/g, '}');
  return css.trim();
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
  const rawCSS = readCSS();
  const css = minifyCSS(rawCSS);
  const cssSize = (Buffer.byteLength(css, 'utf8') / 1024).toFixed(1);
  const cssSaved = rawCSS.length > 0 ? Math.round((1 - Buffer.byteLength(css, 'utf8') / Buffer.byteLength(rawCSS, 'utf8')) * 100) : 0;
  console.log('  → CSS bundle: ' + cssSize + ' KB (saved ' + cssSaved + '%)\n');

  // 2. Bundle core JS (auth + title + subject — loaded immediately)
  const coreJs = readJSBundle(CORE_JS_FILES, 'core');
  const gameJs = readJSBundle(GAME_JS_FILES, 'game');

  // 3. Write & minify bundle-core.js
  const corePath = path.join(DIST, 'bundle-core.js');
  fs.writeFileSync(corePath, coreJs, 'utf8');
  minifyJS(corePath, 'core');

  // 4. Write & minify bundle-game.js
  const gamePath = path.join(DIST, 'bundle-game.js');
  fs.writeFileSync(gamePath, gameJs, 'utf8');
  minifyJS(gamePath, 'game');

  // 5. Copy subject files (loaded dynamically)
  const subjectsDir = path.join(DIST, 'src/modules/question-bank/subjects');
  fs.mkdirSync(subjectsDir, { recursive: true });
  for (const f of SUBJECT_FILES) {
    const src = path.join(SRC, 'modules/question-bank/subjects', f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(subjectsDir, f));
    }
  }
  console.log('\n  Subjects: ' + SUBJECT_FILES.length + ' files copied\n');

  // 6. Write index.html — only preloads core bundle; game bundle loads on demand
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0f172a">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="preload" href="bundle-core.js?v=${VERSION}" as="script">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:; base-uri 'self'; form-action 'self';">
<title>MediCard 医杀</title>
<style>
${css}
</style>
</head>
<body>
<div id="app-loading" style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#94a3b8;font-family:system-ui,-apple-system,sans-serif;font-size:18px;letter-spacing:1px;">MediCard 医杀 加载中...</div>
<div id="app"></div>
<script defer src="bundle-core.js?v=${VERSION}"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  const htmlSize = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log('  → index.html: ' + htmlSize + ' KB');

  // 7. Copy Cloudflare configs
  for (const f of ['_headers', '_redirects', '_routes.json']) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST, f));
    }
  }
  console.log('  Config: _headers + _redirects + _routes.json copied');

  // 8. Copy favicon
  const faviconSrc = path.join(ROOT, 'favicon.svg');
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(DIST, 'favicon.svg'));
    console.log('  Favicon: favicon.svg copied');
  }

  console.log('\n✅ Build complete → dist/');
  console.log('   Initial load: 1 HTML + 1 core JS = 2 requests');
  console.log('   Game bundle loads on demand when entering battle/study/multiplayer\n');

  // Also output to project root for local server
  fs.copyFileSync(path.join(DIST, 'bundle-core.js'), path.join(ROOT, 'bundle-core.js'));
  fs.copyFileSync(path.join(DIST, 'bundle-game.js'), path.join(ROOT, 'bundle-game.js'));
  fs.writeFileSync(path.join(ROOT, 'index.prod.html'), html, 'utf8');
  console.log('   Root: bundle-core.js + bundle-game.js + index.prod.html written');
}

build();
