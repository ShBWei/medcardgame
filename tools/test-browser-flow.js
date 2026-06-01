/**
 * Full browser-simulated game flow test
 * Uses jsdom to create a real DOM and test click handling
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Create DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost:8080/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});

const win = dom.window;
const doc = win.document;

// Set up globals
global.window = win;
global.document = doc;
global.navigator = win.navigator;
global.location = win.location;
global.HTMLElement = win.HTMLElement;
global.HTMLDivElement = win.HTMLDivElement;
global.HTMLButtonElement = win.HTMLButtonElement;

// Mock CDN scripts
global.LZString = {
  compressToUTF16(s) { return 'LZ:' + s; },
  decompressFromUTF16(s) { return s.startsWith('LZ:') ? s.slice(3) : s; }
};
global.Peer = undefined;

// Mock Web Audio API
class MockAudioContext {
  constructor() { this.state = 'running'; }
  createOscillator() { return { connect() {}, start() {}, stop() {}, disconnect() {}, setPeriodicWave() {}, get frequency() { return { setValueAtTime() {} }; } }; }
  createGain() { return { connect() {}, get gain() { return { setValueAtTime() {}, linearRampToValueAtTime() {} }; } }; }
  createBiquadFilter() { return { connect() {}, get type() { return 'lowpass'; }, set type(v) {}, get frequency() { return { setValueAtTime() {} }; } }; }
  createBufferSource() { return { connect() {}, start() {}, stop() {}, get buffer() { return null; }, set buffer(v) {}, get playbackRate() { return { setValueAtTime() {} }; } }; }
  createBuffer(channels, length, rate) { return { numberOfChannels: channels, length, sampleRate: rate, getChannelData() { return new Float32Array(length); } }; }
  get destination() { return {}; }
  get currentTime() { return 0; }
  close() {}
}
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.OfflineAudioContext = MockAudioContext;

// Mock PeerJS
global.Peer = function() {
  return { on() {}, once() {}, connect() {}, disconnect() {}, destroy() {} };
};

// Track console errors
const errors = [];
const logs = [];
global.console = {
  log: (...args) => logs.push(args.join(' ')),
  error: (...args) => { errors.push(args.join(' ')); },
  warn: () => {},
  info: () => {},
  debug: () => {}
};

// ---- Load all modules ----
const SRC = path.join(__dirname, '..', 'src', 'modules');
const JS_ORDER = [
  'config/deploy-config.js',
  'storage/local-storage.js',
  'storage/data-compressor.js',
  ...fs.readdirSync(path.join(SRC, 'question-bank/subjects'))
    .filter(f => f.endsWith('.js')).sort()
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

console.log('=== MediCard Browser Flow Test ===\n');

// Load modules
JS_ORDER.forEach(file => {
  const fp = path.join(SRC, file);
  if (!fs.existsSync(fp)) { console.log('  SKIP: ' + file); return; }
  try {
    const code = fs.readFileSync(fp, 'utf8');
    new Function(code).call(win);
  } catch (e) {
    console.log('  ERROR loading ' + file + ': ' + e.message);
    process.exit(1);
  }
});

const M = win.MediCard;
console.log('Modules loaded: ' + Object.keys(M).filter(k => typeof M[k] === 'object').length);

// Verify error handler is working
if (errors.length > 0) {
  console.log('\n*** ERRORS DURING LOAD: ***');
  errors.forEach(e => console.log('  ' + e));
}

// ---- TEST 1: Title Screen ----
console.log('\n--- TEST 1: Title Screen ---');
const titleScreen = doc.getElementById('screen-title');
console.log('Title screen exists: ' + !!titleScreen);
console.log('Title screen active: ' + titleScreen.classList.contains('active'));

// Check buttons
const btnSingle = doc.getElementById('btn-single');
const btnMulti = doc.getElementById('btn-multi');
const btnDiag = doc.getElementById('btn-diag');
console.log('Buttons: single=' + !!btnSingle + ' multi=' + !!btnMulti + ' diag=' + !!btnDiag);

// Test inline onclick
if (btnDiag && btnDiag.onclick) {
  console.log('Diag button has onclick: YES');
} else if (btnDiag) {
  console.log('Diag button has onclick: NO (checking getAttribute)');
  const onclickAttr = btnDiag.getAttribute('onclick');
  console.log('  onclick attr: ' + (onclickAttr ? onclickAttr.substring(0, 60) : 'NONE'));
}

// Simulate click on single player
if (btnSingle) {
  console.log('Clicking "单人练习"...');
  btnSingle.click();
  // Should navigate to subject screen
  setTimeout(() => {
    const subjectScreen = doc.getElementById('screen-subject');
    console.log('Subject screen active after click: ' + subjectScreen.classList.contains('active'));
  }, 100);
}

// ---- TEST 2: Navigate to battle ----
console.log('\n--- TEST 2: Battle Screen Flow ---');

// Init question loader with all subjects
const allSubjects = M.Config.subjectCategories[0].subjects;
M.GameState.setSelectedSubjects(allSubjects);
M.QuestionLoader.init(allSubjects);

// Start game
console.log('Starting game...');
M.UI.startGame();

const battleScreen = doc.getElementById('screen-battle');
console.log('Battle screen active: ' + battleScreen.classList.contains('active'));

// Check player hand
const playerHand = doc.getElementById('player-hand');
console.log('Player hand container exists: ' + !!playerHand);

const cards = playerHand ? playerHand.querySelectorAll('.card') : [];
console.log('Cards in hand: ' + cards.length);

if (cards.length > 0) {
  console.log('First card HTML length: ' + cards[0].outerHTML.length);
  console.log('First card data-rarity: ' + cards[0].getAttribute('data-rarity'));
  console.log('First card data-card-id: ' + cards[0].getAttribute('data-card-id'));

  // Check click handler
  console.log('Card has click listener: checking...');

  // Simulate card click
  console.log('Clicking card 0...');
  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
  cards[0].dispatchEvent(clickEvent);

  // After click, check if question popup appeared
  const modal = doc.querySelector('.modal-overlay');
  console.log('Modal appeared after card click: ' + !!modal);

  if (modal) {
    // Check option buttons
    const optionBtns = modal.querySelectorAll('button');
    console.log('Option buttons in modal: ' + optionBtns.length);

    if (optionBtns.length > 0) {
      // Find the option button (not KP hint, not timer)
      const answerBtn = Array.from(optionBtns).find(b =>
        b.textContent && b.textContent.match(/^[A-D]\./)
      );
      if (answerBtn) {
        console.log('Found answer button: ' + answerBtn.textContent.substring(0, 30));
        console.log('Clicking answer...');
        answerBtn.click();

        // Check for "继续" button
        setTimeout(() => {
          const contBtns = modal.querySelectorAll('button');
          const contBtn = Array.from(contBtns).find(b => b.textContent === '继续');
          console.log('Continue button appeared: ' + !!contBtn);
          if (contBtn) {
            contBtn.click();
            console.log('Clicked continue - modal removed: ' + !doc.querySelector('.modal-overlay'));
          }
        }, 100);
      }
    }
  }
} else {
  console.log('*** NO CARDS RENDERED - investigating ***');
  console.log('  Player object: ' + !!M.ScreenBattle._player);
  if (M.ScreenBattle._player) {
    console.log('  Player hand length: ' + M.ScreenBattle._player.hand.length);
    console.log('  Player.hand[0]: ' + (M.ScreenBattle._player.hand[0] ? JSON.stringify(M.ScreenBattle._player.hand[0]).substring(0, 100) : 'null'));
  }
  console.log('  GameState.deck.length: ' + M.GameState.deck.length);
  console.log('  GameState.players.length: ' + M.GameState.players.length);
}

// Check for errors
console.log('\n--- Summary ---');
console.log('JS errors: ' + errors.length);
if (errors.length > 0) {
  errors.forEach(e => console.log('  ERROR: ' + e));
}
console.log('Cards rendered: ' + (cards.length > 0 ? 'YES (' + cards.length + ')' : 'NO'));
console.log('Click flow: ' + (doc.querySelector('.modal-overlay') ? 'PARTIAL' : (cards.length > 0 ? 'INCOMPLETE' : 'NO CARDS')));

process.exit(0);
