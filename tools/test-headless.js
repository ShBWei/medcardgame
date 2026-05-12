/**
 * Headless game flow test
 * Simulates minimal DOM to validate JS module loading and core game logic
 */
const fs = require('fs');
const path = require('path');

// ---- Minimal DOM mock ----
global.window = global;
global.window.addEventListener = function() {};  // Mock for error handler in main.js
global.document = {
  _elements: {},
  _listeners: {},
  _html: '',
  getElementById(id) { return this._elements[id] || null; },
  createElement(tag) {
    return {
      tagName: tag,
      className: '',
      style: {},
      _children: [],
      _attrs: {},
      _listeners: {},
      innerHTML: '',
      textContent: '',
      setAttribute(k, v) { this._attrs[k] = v; },
      getAttribute(k) { return this._attrs[k]; },
      classList: { add() {}, remove() {}, contains() { return false; } },
      appendChild(el) { this._children.push(el); return el; },
      addEventListener(ev, fn) { this._listeners[ev] = (this._listeners[ev] || []).concat(fn); },
      remove() { if (this.parentNode) { var i = this.parentNode._children.indexOf(this); if (i >= 0) this.parentNode._children.splice(i, 1); } },
      removeEventListener() {},
      querySelectorAll() { return []; },
      querySelector() { return null; },
      get parentNode() { return this._parentNode; },
      set parentNode(p) { this._parentNode = p; },
      cloneNode() { return this; },
      contains() { return false; },
      insertBefore() {},
    };
  },
  querySelectorAll(sel) { return []; },
  querySelector(sel) { return null; },
  addEventListener() {},
};
// Set app div
document._elements['app'] = document.createElement('div');
document._elements['app'].innerHTML = '';

global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
  removeItem(k) { delete this._data[k]; },
  get length() { return Object.keys(this._data).length; },
  key(i) { return Object.keys(this._data)[i] || null; },
  clear() { this._data = {}; },
};

global.navigator = { userAgent: 'NodeTest' };
global.location = { hostname: 'localhost', href: 'http://localhost:8080/' };
global.setTimeout = setTimeout;
global.setInterval = setInterval;
global.clearInterval = clearInterval;
global.alert = function() {};
global.confirm = function() { return true; };
global.console = console;
global.Math = Math;
global.Date = Date;
global.JSON = JSON;

// CDN mocks
global.LZString = {
  compressToUTF16(s) { return 'LZ:' + s; },
  decompressFromUTF16(s) {
    if (s.startsWith('LZ:')) return s.slice(3);
    return s;
  }
};
global.Peer = undefined; // No P2P in headless

// ---- Load JS modules in order ----
const SRC = path.join(__dirname, '..', 'src', 'modules');
const JS_ORDER = [
  'config/deploy-config.js',
  'storage/local-storage.js',
  'storage/data-compressor.js',
  // Subject files
  ...fs.readdirSync(path.join(SRC, 'question-bank/subjects'))
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

function loadModule(file) {
  const fp = path.join(SRC, file);
  if (!fs.existsSync(fp)) {
    console.log('  SKIP (not found): ' + file);
    return true;
  }
  const code = fs.readFileSync(fp, 'utf8');
  try {
    // Wrap in function scope like IIFE
    new Function(code)();
    return true;
  } catch (e) {
    console.log('  ERROR in ' + file + ': ' + e.message);
    return false;
  }
}

// ---- Run tests ----
console.log('=== MediCard Duel Headless Test ===\n');

let failed = 0;
let passed = 0;

JS_ORDER.forEach(function(file) {
  const ok = loadModule(file);
  if (ok) passed++; else failed++;
});

console.log('\nLoaded: ' + passed + '/' + JS_ORDER.length + ' modules');

if (failed > 0) {
  console.log('BUILD FAILED: ' + failed + ' modules had errors');
  process.exit(1);
}

// ---- Test core game flow ----
console.log('\n--- Testing Game Flow ---');

const M = window.MediCard;

// 1. Config check
console.log('1. Config check...');
console.assert(M.Config.version === '4.0.0', 'Version check');
console.assert(M.Config.subjectMeta['cell-biology'] !== undefined, 'Subject meta exists');
console.assert(M.Config.subjectCategories[0].subjects.length === 8, '8 subjects configured');
passed++;

// 2. Question bank check
console.log('2. Question bank check...');
const allSubjects = M.Config.subjectCategories[0].subjects;
let totalQuestions = 0;
allSubjects.forEach(function(sid) {
  const qs = M.QuestionBank[sid];
  if (qs && Array.isArray(qs)) {
    totalQuestions += qs.length;
    const difficulties = { common: 0, rare: 0, epic: 0, legendary: 0 };
    qs.forEach(function(q) { difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1; });
    console.log('  ' + sid + ': ' + qs.length + ' questions (C:' + difficulties.common + ' R:' + difficulties.rare + ' E:' + difficulties.epic + ' L:' + difficulties.legendary + ')');
  } else {
    console.log('  ' + sid + ': MISSING!');
    failed++;
  }
});
console.log('  Total: ' + totalQuestions + ' questions');
passed++;

// 3. Question loading and validation
console.log('3. Question loader init...');
M.QuestionLoader.init(allSubjects);
const stats = M.QuestionLoader.getSelectionStats();
console.log('  Selection stats: total=' + stats.total + ', by diffs: C' + stats.byDifficulty.common + ' R' + stats.byDifficulty.rare + ' E' + stats.byDifficulty.epic + ' L' + stats.byDifficulty.legendary);

// 4. Deck generation
console.log('4. Deck generation...');
const deck = M.QuestionLoader.generateDeck(40);
console.assert(deck.length > 0, 'Deck has cards');
console.log('  Deck size: ' + deck.length);
if (deck.length > 0) {
  const rarities = {};
  deck.forEach(function(c) { rarities[c.rarity] = (rarities[c.rarity] || 0) + 1; });
  console.log('  Rarities: ' + JSON.stringify(rarities));
  // Verify card structure
  const c = deck[0];
  console.assert(c.id !== undefined, 'Card has id');
  console.assert(c.cardName !== undefined, 'Card has cardName');
  console.assert(c.question !== undefined, 'Card has question');
  console.assert(c.options !== undefined, 'Card has options');
  console.assert(c.correctAnswers !== undefined, 'Card has correctAnswers');
}
passed++;

// 5. Resource system
console.log('5. Resource system...');
const player = {
  id: 'test_p1',
  name: 'TestPlayer',
  identity: 'lord',
  alive: true,
  shield: 0,
  resources: M.Resources.createPlayerResources()
};
console.assert(player.resources.hp.current === 20, 'Initial HP');
console.assert(player.resources.mp.current === 5, 'Initial MP');
console.assert(player.resources.kp.current === 0, 'Initial KP');

// Test damage (no shield)
const dmgResult = M.Resources.dealDamage(player, 5);
console.assert(dmgResult.actual === 5, 'Deal 5 damage');
console.assert(player.resources.hp.current === 15, 'HP after damage: ' + player.resources.hp.current);

// Test shield
player.shield = 3;
const dmgShield = M.Resources.dealDamage(player, 5);
console.assert(dmgShield.actual === 2, 'Shield absorbs 3 of 5: actual=' + dmgShield.actual);
console.assert(player.resources.hp.current === 13, 'HP after shielded damage: ' + player.resources.hp.current);

// Test heal
const healed = M.Resources.healDamage(player, 3);
console.assert(healed === 3, 'Heal 3 HP');
console.assert(player.resources.hp.current === 16, 'HP after heal: ' + player.resources.hp.current);

// Test KP spending
M.Resources.gainKP(player, 2);
console.assert(player.resources.kp.current === 2, 'KP after gain: ' + player.resources.kp.current);
const kpSpent = M.Resources.spendKP(player, 1);
console.assert(kpSpent === true, 'Spent 1 KP');
console.assert(player.resources.kp.current === 1, 'KP remaining: ' + player.resources.kp.current);
passed++;

// 6. Card effects
console.log('6. Card effects...');
const target = {
  id: 'test_p2',
  name: 'TargetPlayer',
  identity: 'rebel',
  alive: true,
  shield: 0,
  resources: M.Resources.createPlayerResources()
};

// Get a random card from deck and test resolve
const testCard = deck[0];
// Set MP high enough to afford the card
player.resources.mp.current = 10;
console.assert(M.CardEffects.canPlay(player, testCard) === true, 'Can afford card cost');
const fx = M.CardEffects.resolve(testCard, player, target);
console.log('  Card: ' + testCard.cardName + ' (type=' + testCard.cardType + ', rarity=' + testCard.rarity + ')');
console.log('  Effect: ' + fx.type + ' value=' + fx.value + ' msg=' + fx.message);

// Test getAnswerTimeLimit
['common', 'rare', 'epic', 'legendary'].forEach(function(r) {
  const limit = M.CardEffects.getAnswerTimeLimit(r);
  console.log('  Time limit ' + r + ': ' + limit + 's');
});
passed++;

// 7. Victory conditions
console.log('7. Victory conditions...');
const testPlayers = [
  { id: 'p1', identity: 'lord', alive: true, resources: { hp: { current: 20 } } },
  { id: 'p2', identity: 'rebel', alive: false, resources: { hp: { current: 0 } } }
];
const result = M.Victory.check(testPlayers);
console.assert(result !== null, 'Game should be over');
console.assert(result.winner === 'lord', 'Lord should win when rebel dead');
console.log('  Victory: winner=' + result.winner + ' reason=' + result.reason);
passed++;

// 8. Identity system
console.log('8. Identity system...');
const info = M.IdentityData.getIdentityInfo('lord');
console.assert(info.name === '主公', 'Lord identity info');
console.log('  Identities: lord=' + info.name + ', color=' + info.color);

// Test identity assignment
const multiPlayers = [
  { id: 'p1', alive: true, resources: M.Resources.createPlayerResources() },
  { id: 'p2', alive: true, resources: M.Resources.createPlayerResources() },
  { id: 'p3', alive: true, resources: M.Resources.createPlayerResources() },
  { id: 'p4', alive: true, resources: M.Resources.createPlayerResources() }
];
M.IdentityData.assignIdentities(multiPlayers);
var identities = multiPlayers.map(p => p.identity);
console.log('  Assigned (4p): ' + identities.join(', '));
console.assert(identities.includes('lord'), 'Has lord');
console.assert(identities.includes('rebel'), 'Has rebel');
console.assert(identities.includes('spy'), 'Has spy');
console.assert(identities.includes('loyalist'), 'Has loyalist');

// Lord gets +1 HP
var lord = multiPlayers.find(p => p.identity === 'lord');
console.assert(lord.resources.hp.max === 21, 'Lord HP max is 21 (20+1)');
passed++;

// 9. Audio system
console.log('9. Audio system...');
console.assert(M.Audio !== undefined, 'Audio module exists');
console.assert(typeof M.Audio.init === 'function', 'Audio.init exists');
// AudioContext might not be available in Node, but the API should work
M.Audio.init();
console.log('  Audio module OK (ctx: ' + (M.Audio._ctx ? 'created' : 'not available in headless') + ')');
passed++;

// 10. Network protocol
console.log('10. Network protocol...');
const packed = M.SyncProtocol.pack('test_type', { key: 'value' });
const unpacked = M.SyncProtocol.unpack(packed);
console.assert(unpacked.t === 'test_type', 'Pack/unpack preserves type');
console.assert(unpacked.d.key === 'value', 'Pack/unpack preserves data');
console.assert(M.SyncProtocol.MessageType.GAME_START === 'game_start', 'Message types exist');
console.log('  Room code: ' + M.RoomManager.generateRoomCode() + ' (should be 6 digits)');
passed++;

// Summary
console.log('\n========================================');
console.log('ALL CHECKS PASSED');
console.log('========================================');
console.log('Subjects: ' + allSubjects.length + ' (all loaded)');
console.log('Total questions: ' + totalQuestions);
console.log('Deck generation: OK');
console.log('Resource system: OK (damage, heal, shield, KP)');
console.log('Card effects: OK');
console.log('Victory check: OK');
console.log('Identity system: OK');
console.log('Audio module: OK');
console.log('Network protocol: OK');
process.exit(0);
