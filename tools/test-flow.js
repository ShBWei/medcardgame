/**
 * Simple game flow validation test
 */
const fs = require('fs');
const path = require('path');

// Minimal DOM mock
const elements = {};
global.document = {
  getElementById(id) { return elements[id] || null; },
  createElement(tag) {
    const el = {
      tagName: tag, className: '', style: {}, _attrs: {}, _children: [],
      _listeners: {}, _props: {},
      innerHTML: '', textContent: '',
      setAttribute(k, v) { this._attrs[k] = v; },
      getAttribute(k) { return this._attrs[k] || null; },
      classList: {
        _classes: [],
        add(c) { if (!this._classes.includes(c)) this._classes.push(c); },
        remove(c) { this._classes = this._classes.filter(x => x !== c); },
        contains(c) { return this._classes.includes(c); }
      },
      appendChild(el) { el._parent = this; this._children.push(el); return el; },
      addEventListener(ev, fn) { this._listeners[ev] = (this._listeners[ev] || []).concat(fn); },
      removeEventListener() {},
      querySelectorAll(s) {
        if (s === '.modal-overlay') return [];
        if (s === '.screen') return Object.values(elements).filter(e => e._attrs && e._attrs['class'] && e._attrs['class'].includes('screen'));
        if (s === '.card') {
          const all = [];
          for (const el of Object.values(elements)) {
            if (el._attrs && el._attrs['class'] && el._attrs['class'].includes('card')) all.push(el);
          }
          return all;
        }
        return [];
      },
      querySelector(s) {
        const results = this.querySelectorAll(s);
        return results.length > 0 ? results[0] : null;
      },
      remove() { if (this._parent) { this._parent._children = this._parent._children.filter(c => c !== this); } },
      get parentNode() { return this._parent; },
      click() {
        (this._listeners['click'] || []).forEach(fn => fn.call(this, { stopPropagation() {}, preventDefault() {} }));
      },
      get onclick() { return this._onclick; },
      set onclick(fn) { this._onclick = fn; },
      setProperty(k, v) { this.style[k] = v; },
      cloneNode() { return JSON.parse(JSON.stringify(this)); }
    };
    return el;
  },
  createTextNode(t) { return { textContent: t }; },
  body: { appendChild() {}, querySelectorAll() { return []; } }
};

// Set up app div
const appEl = document.createElement('div');
appEl._attrs['class'] = 'app';
elements['app'] = appEl;

// Mock browser globals
global.window = global;
global.window.addEventListener = () => {};
global.localStorage = { _data: {}, getItem(k) { return this._data[k] || null; }, setItem(k,v) { this._data[k] = v; }, removeItem(k) { delete this._data[k]; }, get length() { return Object.keys(this._data).length; }, key(i) { return Object.keys(this._data)[i] || null; }, clear() { this._data = {}; } };
global.navigator = { userAgent: 'Test' };
global.location = { hostname: 'localhost', href: 'http://localhost:8080/' };
global.alert = () => {};
global.confirm = () => true;
global.setTimeout = (fn, ms) => { fn(); return 1; };
global.clearTimeout = () => {};
global.setInterval = () => 1;
global.clearInterval = () => {};
global.console = console;
global.Math = Math;
global.Date = Date;
global.JSON = JSON;
global.LZString = { compressToUTF16(s) { return 'LZ:' + s; }, decompressFromUTF16(s) { return s.startsWith('LZ:') ? s.slice(3) : s; } };
global.Peer = undefined;
global.AudioContext = function() { return { createOscillator() { return { connect(){},start(){},stop(){},disconnect(){},setPeriodicWave(){},get frequency(){return{setValueAtTime(){}};} }; }, createGain() { return { connect(){},get gain(){return{setValueAtTime(){},linearRampToValueAtTime(){}};} }; }, createBiquadFilter() { return { connect(){},get type(){return'';},set type(v){},get frequency(){return{setValueAtTime(){}};} }; }, createBufferSource() { return { connect(){},start(){},stop(){},get buffer(){return null;},set buffer(v){},get playbackRate(){return{setValueAtTime(){}};} }; }, createBuffer(c,l,r) { return { numberOfChannels:c, length:l, sampleRate:r, getChannelData(){return new Float32Array(l);} }; }, get destination(){return{};}, get currentTime(){return 0;}, close(){} }; };
global.webkitAudioContext = global.AudioContext;
global.OfflineAudioContext = global.AudioContext;

// ---- Load modules ----
const SRC = path.join(__dirname, '..', 'src', 'modules');
const ORDER = [
  'config/deploy-config.js', 'storage/local-storage.js', 'storage/data-compressor.js',
  ...fs.readdirSync(path.join(SRC, 'question-bank/subjects')).filter(f => f.endsWith('.js')).sort().map(f => 'question-bank/subjects/' + f),
  'question-bank/question-validator.js', 'question-bank/question-loader.js',
  'game-core/resource-system.js', 'game-core/victory-condition.js', 'game-core/turn-system.js', 'game-core/game-state.js',
  'card-system/card-data.js', 'card-system/card-effects.js', 'card-system/card-visuals.js', 'card-system/card-animations.js',
  'identity-system/identity-data.js', 'identity-system/identity-skills.js', 'identity-system/identity-ui.js',
  'ui-system/components/timer-component.js', 'ui-system/components/player-panel.js', 'ui-system/components/question-popup.js',
  'ui-system/screen-title.js', 'ui-system/screen-lobby.js', 'ui-system/screen-subject.js',
  'ui-system/screen-battle.js', 'ui-system/screen-deck.js', 'ui-system/screen-result.js',
  'audio-system/audio-generator.js',
  'network/sync-protocol.js', 'network/room-manager.js', 'network/p2p-host.js', 'network/p2p-client.js',
  'main.js'
];

console.log('Loading ' + ORDER.length + ' modules...');
let ok = 0;
for (const file of ORDER) {
  const fp = path.join(SRC, file);
  if (!fs.existsSync(fp)) { console.log('  MISSING: ' + file); continue; }
  try {
    new Function(fs.readFileSync(fp, 'utf8'))();
    ok++;
  } catch (e) {
    console.log('  FAIL: ' + file + ' - ' + e.message);
  }
}
console.log('Loaded: ' + ok + '/' + ORDER.length);

const M = global.window.MediCard;
console.log('MediCard keys: ' + Object.keys(M).filter(k => typeof M[k] === 'object').join(', '));

// ---- Check boot result ----
console.log('\n=== Game Flow Test ===');

// Init screen should have created screen-title element
const titleScreen = elements['screen-title'];
console.log('1. Title screen element: ' + (titleScreen ? 'EXISTS' : 'MISSING'));
console.log('   Active: ' + (titleScreen ? titleScreen.classList.contains('active') : 'N/A'));

// Find buttons in title screen
if (titleScreen) {
  const buttons = [];
  function findButtons(el) {
    if (!el) return;
    if (el.tagName === 'button') buttons.push(el);
    if (el._children) el._children.forEach(findButtons);
  }
  findButtons(titleScreen);
  console.log('   Buttons found: ' + buttons.length);
  buttons.forEach(b => {
    const text = (b.textContent || '').substring(0, 30);
    const hasClick = !!(b._listeners['click'] && b._listeners['click'].length) || !!b._onclick;
    console.log('   - "' + text + '" onclick=' + !!b._onclick + ' listener=' + !!(b._listeners['click'] && b._listeners['click'].length));
  });
}

// Test battle flow
console.log('\n2. Init battle...');
M.GameState.setSelectedSubjects(M.Config.subjectCategories[0].subjects);
M.QuestionLoader.init(M.Config.subjectCategories[0].subjects);

// Check deck generation
const deck = M.QuestionLoader.generateDeck(40);
console.log('   Deck generated: ' + deck.length + ' cards');
console.log('   Sample card: ' + (deck[0] ? deck[0].cardName + ' (' + deck[0].rarity + ')' : 'NONE'));

// Start game via UI (creates battle screen)
console.log('\n3. Starting game...');
M.UI.startGame();

const battleScreen = elements['screen-battle'];
console.log('   Battle screen: ' + (battleScreen ? 'EXISTS' : 'MISSING'));
if (battleScreen) {
  console.log('   Active: ' + battleScreen.classList.contains('active'));
}

// Check player hand container
const playerHandEl = elements['player-hand'];
console.log('   Player hand container: ' + (playerHandEl ? 'EXISTS' : 'MISSING'));

if (playerHandEl) {
  const cardEls = playerHandEl._children.filter(c => c._attrs['class'] && c._attrs['class'].includes('card'));
  console.log('   Cards in hand: ' + cardEls.length);

  if (cardEls.length > 0) {
    const c = cardEls[0];
    console.log('   Card 0 data-rarity: ' + c.getAttribute('data-rarity'));
    console.log('   Card 0 data-card-id: ' + c.getAttribute('data-card-id'));
    console.log('   Card 0 has click listener: ' + (c._listeners['click'] ? c._listeners['click'].length : 0));

    // Simulate click
    console.log('\n4. Clicking card 0...');
    if (c._listeners['click'] && c._listeners['click'].length > 0) {
      c._listeners['click'][0].call(c, { stopPropagation() {} });
    } else if (c._onclick) {
      c._onclick.call(c, { stopPropagation() {} });
    }
    console.log('   After click - card selected index: ' + M.ScreenBattle._selectedCardIndex);
  } else {
    console.log('   *** NO CARDS! Checking player state:');
    if (M.ScreenBattle._player) {
      console.log('   Player hand: ' + M.ScreenBattle._player.hand.length + ' cards');
      console.log('   Player alive: ' + M.ScreenBattle._player.alive);
      console.log('   Player MP: ' + M.ScreenBattle._player.resources.mp.current + '/' + M.ScreenBattle._player.resources.mp.max);
    }
    console.log('   GameState deck: ' + M.GameState.deck.length);
    console.log('   GameState players: ' + M.GameState.players.length);
  }
}

// Check for the subtle bug: MP check
console.log('\n5. MP check...');
if (M.ScreenBattle._player) {
  const p = M.ScreenBattle._player;
  console.log('   Player MP: ' + p.resources.mp.current);
  if (p.hand.length > 0) {
    const card = p.hand[0];
    console.log('   Card energy cost: ' + card.energyCost);
    console.log('   Can play: ' + M.CardEffects.canPlay(p, card));
  }
}

console.log('\n=== Done ===');
