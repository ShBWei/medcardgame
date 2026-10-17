import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// Run real browser modules; replace only rendering, network I/O and wall-clock time.
function loadGame(realPopup = false) {
  const packets = [];
  const questions = [];
  const conn = {
    open: true,
    handlers: {},
    on(t, fn) {
      this.handlers[t] = fn;
    },
    off(t) {
      delete this.handlers[t];
    },
    send(raw) {
      packets.push(JSON.parse(raw));
    },
  };
  const player = (name) => ({
    name,
    alive: true,
    hand: [],
    resources: { hp: { current: 4, max: 5 } },
    equipment: {},
  });
  const mc = {
    Config: { defaults: { turnTimeLimit: 60 } },
    GameState: {
      players: [player('host'), player('guest')],
      currentPlayerIndex: 1,
      discardPile: [],
    },
    NetworkHost: { _connections: [conn] },
    NetworkClient: { send: conn.send },
    Victory: { check: () => null },
    Crypto: { escapeHtml: (x) => x },
  };
  const context = vm.createContext({
    window: { MediCard: mc },
    document,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
  });
  const modules = [
    'network/sync-protocol.js',
    'game-core/turn-system.js',
    'ui-system/components/mp-attack-resolver.js',
    'ui-system/screen-battle.js',
  ];
  if (realPopup)
    modules.push(
      'card-system/card-data.js',
      'ui-system/components/timer-component.js',
      'ui-system/components/question-popup.js',
    );
  for (const path of modules) {
    vm.runInContext(
      readFileSync(new URL('../src/modules/' + path, import.meta.url), 'utf8'),
      context,
    );
  }
  const battle = mc.ScreenBattle;
  if (!realPopup)
    mc.QuestionPopup = { show: (c, callback) => questions.push({ card: c, callback }) };
  else {
    mc.CardEffects = { getAnswerTimeLimit: () => 30 };
    // Force a known display order while exercising the real popup and answer routing.
    mc.CardData.shuffle = (items) => items.reverse();
  }
  Object.assign(battle, {
    _isHost: true,
    _isMultiplayer: true,
    _myPlayerIndex: 0,
    _turnActive: true,
  });
  for (const key of ['_updateDisplay', '_flashPhase', '_log', '_logAction']) battle[key] = () => {};
  battle._trackTimer = (id) => id;
  return { mc, battle, packets, conn, questions, context };
}
const card = (type = 'attack', id = 'a') => ({
  id,
  cardType: type,
  cardName: type,
  correctAnswers: ['A'],
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('match health and transport regressions', () => {
  it('checks host victory only after broadcasting lethal group damage', () => {
    const { mc, battle } = loadGame();
    const tactic = { ...card('tactic'), cardSubtype: 'jiaoCha' };
    const [host, guest] = mc.GameState.players;
    host.hand = [tactic];
    guest.resources.hp.current = 1;
    battle._player = host;
    battle._pendingCard = { index: 0 };
    battle._gameStats = { damageDealt: 0 };
    battle._trackAnswer = () => {};
    mc.Resources = {
      dealDamage: (p) => {
        p.resources.hp.current = 0;
        p.alive = false;
        return { actual: 1 };
      },
    };
    const events = [];
    battle._sendSync = () => events.push('sync');
    battle._checkGameEnd = () => events.push('victory');
    battle._onTacticAnswered({ card: tactic, correct: true });
    expect(events).toEqual(['sync', 'victory']);
  });
  it('does not expose the active player hand to other clients on turn change', () => {
    const { mc, battle } = loadGame();
    const sent = [];
    mc.GameState.players.push({ ...mc.GameState.players[1], peerId: 'other' });
    mc.GameState.players[1].peerId = 'guest';
    mc.NetworkHost._connections = ['guest', 'other'].map((peer) => ({
      peer,
      open: true,
      send: (raw) => sent.push({ peer, data: JSON.parse(raw).d }),
    }));
    battle._sendSync({ type: 'turn_change', currentPlayerIndex: 1, currentHand: [card()] });
    expect(sent.find((p) => p.peer === 'guest').data.currentHand).toHaveLength(1);
    expect(sent.find((p) => p.peer === 'other').data.currentHand).toBeUndefined();
  });

  it('deduplicates the same end-turn packet arriving through both transports', () => {
    const { mc, battle } = loadGame();
    battle._onRemoteEndTurn = vi.fn();
    const packet = mc.SyncProtocol.pack(mc.SyncProtocol.MessageType.END_TURN, {});
    battle._receiveClientPacket(1, packet);
    battle._receiveClientPacket(1, packet);
    expect(battle._onRemoteEndTurn).toHaveBeenCalledTimes(1);
  });
  it('does not heal again after receiving host turn-start health', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players.forEach((p) => {
      p.resources.mp = { current: 0 };
    });
    mc.IdentitySkills = {
      applyTurnStartEffects: vi.fn((p) => {
        p.resources.hp.current++;
        return { healed: 1 };
      }),
    };
    battle._isHost = false;
    battle._myPlayerIndex = 1;
    battle._onHostSync({
      type: 'turn_change',
      currentPlayerIndex: 1,
      players: [
        { hp: 4, mp: 0, alive: true },
        { hp: 3, mp: 0, alive: true },
      ],
      currentHand: [],
    });
    expect(mc.GameState.players[1].resources.hp.current).toBe(3);
    expect(mc.IdentitySkills.applyTurnStartEffects).not.toHaveBeenCalled();
  });

  it('sends health after settlement and replaces speculative health with host state', () => {
    const host = loadGame();
    host.mc.GameState.players[0].resources.hp.current = 2;
    host.battle._sendSync({
      type: 'action_result',
      sourceIdx: 1,
      data: { cardType: 'tactic', damageToAll: 1 },
    });
    const client = loadGame();
    client.battle._isHost = false;
    client.battle._myPlayerIndex = 1;
    client.battle._onHostSync(host.packets[0].d);
    expect(client.mc.GameState.players[0].resources.hp.current).toBe(2);
  });

  it('can deliver a defense question to a relay-only player', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].peerId = 'guest';
    mc.NetworkHost._connections = [];
    const sendTo = vi.fn();
    mc.RelayTransport = { isOpen: () => true, hasPeer: (id) => id === 'guest', sendTo };
    const route = mc.MPAttackResolver.validateDefenderRoute(battle, 1);
    expect(route.ok).toBe(true);
    route.conn.send('question');
    expect(sendTo).toHaveBeenCalledWith('guest', 'question');
  });

  it('accepts an existing room member even when the second transport joins a full room', () => {
    const { mc, context } = loadGame();
    vm.runInContext(readFileSync('src/modules/network/room-manager.js', 'utf8'), context);
    mc.RoomManager.createRoom('host', 2);
    expect(mc.RoomManager.addPlayer('guest', 'guest')).toBe(true);
    mc.RoomManager.setPlayerReady('guest');
    expect(mc.RoomManager.addPlayer('guest', 'guest', 'guest')).toBe(true);
    expect(mc.RoomManager.players).toHaveLength(2);
    expect(mc.RoomManager.players[1].ready).toBe(true);
  });
});

describe('real defense question UI', () => {
  it('shows the correct displayed letter in feedback after shuffling', () => {
    const { mc } = loadGame(true);
    mc.QuestionPopup.show(
      { ...card(), question: 'test', options: ['A. correct', 'B. wrong'] },
      () => {},
      '你',
    );
    document.querySelector('[data-answer-letter="A"]').click();
    expect(document.querySelector('.modal-overlay').textContent).toContain('正确答案：B');
  });
  it('dismisses the host defense popup when a remote attacker cancels', () => {
    const { mc, battle } = loadGame(true);
    mc.GameState.players[1].hand = [{ ...card(), question: 'test', options: ['A. correct'] }];
    battle._handleAttackIntent(1, 0, 0);
    expect(document.querySelector('.modal-overlay')).not.toBeNull();
    mc.MPAttackResolver.cancelAttack(battle, 'client_timeout');
    expect(document.querySelector('.modal-overlay')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(mc.TimerComponent._interval).toBeNull();
  });
  it.each(['single', 'multiple'])(
    'sends original option identities after %s choices are shuffled',
    (questionType) => {
      const { battle, packets } = loadGame(true);
      battle._isHost = false;
      const question = {
        ...card(),
        question: 'Which is correct?',
        questionType,
        options: ['A. first', 'B. second', 'C. third'],
        correctAnswers: questionType === 'single' ? ['A'] : ['A', 'B'],
      };
      battle._onDefendQuestion({ card: question, attackId: 'challenge', attackerName: 'host' });
      document.querySelector('[data-answer-letter="C"]').click();
      if (questionType === 'multiple') {
        document.querySelector('[data-answer-letter="B"]').click();
        document.getElementById('multi-submit-btn').click();
      }
      Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent === '继续')
        .click();
      expect(packets[0].d.choice.split(',').sort()).toEqual(question.correctAnswers);
      expect(packets[0].d.attackId).toBe('challenge');
    },
  );
  it('dismisses only the cancelled defense question, including before its timer starts', () => {
    const { mc, battle } = loadGame(true);
    battle._isHost = false;
    battle._myPlayerIndex = 1;
    battle._onDefendQuestion({
      card: { ...card(), question: 'test', options: ['A. correct'] },
      attackId: 'current',
    });
    battle._onHostSync({ type: 'attack_cancel', sourceIdx: 0, attackId: 'older' });
    expect(document.querySelector('.modal-overlay')).not.toBeNull();
    battle._onHostSync({ type: 'attack_cancel', sourceIdx: 0, attackId: 'current' });
    expect(document.querySelector('.modal-overlay')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(mc.TimerComponent._interval).toBeNull();
  });
});

describe('turn timer', () => {
  it('expires once and allows its callback to start the next timer', () => {
    const { mc } = loadGame();
    let turns = 0;
    mc.TurnSystem.startTurnTimer(1, null, () => {
      turns++;
      mc.TurnSystem.startTurnTimer(1, null, () => turns++);
    });
    vi.advanceTimersByTime(3000);
    expect(turns).toBe(2);
  });
  it('does not expire a stopped or replaced timer', () => {
    const { mc } = loadGame();
    let turns = 0;
    mc.TurnSystem.startTurnTimer(1, null, () => turns++);
    mc.TurnSystem.stopTurnTimer();
    vi.advanceTimersByTime(2000);
    mc.TurnSystem.startTurnTimer(1, null, () => turns++);
    mc.TurnSystem.startTurnTimer(3, null, () => turns++);
    vi.advanceTimersByTime(2000);
    expect(turns).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(turns).toBe(1);
  });
  it('does not call a replacement timer tick from the old timer callback', () => {
    const { mc } = loadGame();
    const ticks = [];
    mc.TurnSystem.onTimerTick = () => {
      mc.TurnSystem.onTimerTick = null;
      mc.TurnSystem.startTurnTimer(5, (t) => ticks.push(t));
    };
    mc.TurnSystem.startTurnTimer(1);
    vi.advanceTimersByTime(1000);
    expect(ticks).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(ticks).toEqual([4]);
  });
});

describe('attack lifecycle', () => {
  it('resets the client juesha limit when its next turn starts', () => {
    const { mc, battle } = loadGame();
    battle._isHost = false;
    battle._myPlayerIndex = 1;
    battle._jueshaPlayedThisTurn = true;
    mc.IdentitySkills = { applyTurnStartEffects: () => null };
    battle._onHostSync({
      type: 'turn_change',
      currentPlayerIndex: 1,
      currentHand: [card('juesha')],
      deckCount: 3,
    });
    expect(battle._jueshaPlayedThisTurn).toBe(false);
  });
  it('enforces the juesha limit on the host after a successful resolution', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].hand = [card('juesha'), card('juesha', 'b')];
    mc.GameState.players[0].hand = [card('defense'), card('defense', 'second')];
    battle._handleJueshaMpIntent(1, 0, 0);
    battle._resolveMpJueshaAnswer(true);
    battle._handleJueshaMpIntent(1, 0, 0);
    expect(mc.GameState.players[1].hand).toHaveLength(1);
    expect(battle._attackInProgress).toBeNull();
  });
  it('keeps the juesha limit after success and permits retry after cancellation', () => {
    const { mc, battle, packets } = loadGame();
    battle._isHost = false;
    battle._myPlayerIndex = 1;
    const player = mc.GameState.players[1];
    player.maxAttacks = 3;
    player.hand = [card('juesha'), card('juesha', 'b')];
    mc.MPAttackResolver.executeAttack(battle, player, player.hand[0], 0, 0);
    const first = packets[0].d.attackId;
    battle._onHostSync({ type: 'attack_cancel', sourceIdx: 1, attackId: first });
    mc.MPAttackResolver.executeAttack(battle, player, player.hand[0], 0, 0);
    const second = packets[1].d.attackId;
    battle._onHostSync({
      type: 'action_result',
      sourceIdx: 1,
      attackId: second,
      data: { cardType: 'juesha', cardIndex: 0, targetIdx: 0, damage: 0 },
    });
    mc.MPAttackResolver.executeAttack(battle, player, player.hand[0], 0, 0);
    expect(packets).toHaveLength(2);
    expect(player.hand).toHaveLength(1);
    expect(battle._jueshaPlayedThisTurn).toBe(true);
  });
  const handlers = {
    attack: '_handleAttackIntent',
    juedou: '_handleJuedouMpIntent',
    juesha: '_handleJueshaMpIntent',
  };
  it.each(Object.keys(handlers))(
    'refunds %s and any reserved defense on timeout, exactly once',
    (type) => {
      const { mc, battle, packets } = loadGame();
      const attack = card(type);
      const defense = card('defense', 'shield');
      mc.GameState.players[1].hand = [attack];
      mc.GameState.players[0].hand = [defense];
      battle[handlers[type]](1, 0, 0);
      vi.advanceTimersByTime(45000);
      mc.MPAttackResolver.cancelAttack(battle, 'duplicate');
      expect(mc.GameState.players[1].hand).toEqual([attack]);
      expect(mc.GameState.players[0].hand).toEqual([defense]);
      expect(mc.GameState.discardPile).toHaveLength(0);
      expect(mc.GameState.players[0].resources.hp.current).toBe(4);
      expect(battle._attackInProgress).toBeNull();
      expect(battle._jueshaPlayedThisTurn).toBe(false);
      const cancelled = packets.filter((p) => p.d.type === 'attack_cancel');
      expect(cancelled).toHaveLength(1);
      expect(cancelled[0].d.sourceIdx).toBe(1);
      expect(cancelled[0].d.attackId).toBeTruthy();
    },
  );
  it('refunds an attack when the defender connection is unavailable', () => {
    const { mc, battle, conn } = loadGame();
    const attack = card();
    mc.GameState.players[0].hand = [attack];
    conn.open = false;
    battle._handleAttackIntent(0, 0, 1);
    expect(mc.GameState.players[0].hand).toEqual([attack]);
    expect(battle._attackInProgress).toBeNull();
  });
  it.each(['attack', 'juedou', 'juesha'])(
    'ignores a cancelled %s popup callback after a new attack starts',
    (type) => {
      const { mc, battle, questions } = loadGame();
      mc.GameState.players[1].hand = [card(type), card(type, 'b')];
      mc.GameState.players[0].hand = [card('defense')];
      battle[handlers[type]](1, 0, 0);
      mc.MPAttackResolver.cancelAttack(battle, 'timeout');
      battle[handlers[type]](1, 0, 0);
      const active = battle._attackInProgress;
      questions[0].callback({ correct: false });
      expect(battle._attackInProgress).toBe(active);
      expect(mc.GameState.players[0].resources.hp.current).toBe(4);
      expect(battle._gameStats.questionsAnswered).toBe(0);
    },
  );
  it('does not let a second intent replace an attack in progress', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].hand = [card(), card('attack', 'b')];
    battle._handleAttackIntent(1, 0, 0);
    const active = battle._attackInProgress;
    battle._handleAttackIntent(1, 0, 0);
    expect(battle._attackInProgress).toBe(active);
    expect(mc.GameState.players[1].hand).toHaveLength(1);
  });
  it('requires the current challenge id and uses the host attack type to settle answers', () => {
    const { mc, battle, conn, packets } = loadGame();
    battle._setupMultiplayerSync();
    mc.GameState.players[0].hand = [card('juedou')];
    battle._handleJuedouMpIntent(0, 0, 1);
    const question = packets.find((p) => p.t === 'defend_q');
    conn.handlers.data(mc.SyncProtocol.pack('defend_a', { attackId: 'old', choice: 'A' }));
    expect(battle._attackInProgress).not.toBeNull();
    expect(question.d.attackId).toBeTruthy();
    conn.handlers.data(
      mc.SyncProtocol.pack('defend_a', {
        attackId: question.d.attackId,
        choice: 'A',
        isJuesha: true,
      }),
    );
    expect(battle._attackInProgress).toBeNull();
    expect(packets.at(-1).d.data.cardType).toBe('juedou');
    expect(mc.GameState.discardPile).toHaveLength(1);
  });
  it('rejects a response from someone other than the defender', () => {
    const { mc, battle, conn } = loadGame();
    battle._setupMultiplayerSync();
    mc.GameState.players[1].hand = [card()];
    battle._handleAttackIntent(1, 0, 0);
    const active = battle._attackInProgress;
    conn.handlers.data(
      mc.SyncProtocol.pack('defend_a', { attackId: active.attackId, choice: 'A' }),
    );
    expect(battle._attackInProgress).toBe(active);
  });
  it('ignores a stale cancellation on the client', () => {
    const { battle } = loadGame();
    battle._isHost = false;
    battle._myPlayerIndex = 1;
    const active = { type: 'waiting_defend', attackId: 'new' };
    battle._attackInProgress = active;
    battle._onHostSync({ type: 'attack_cancel', sourceIdx: 1, attackId: 'old' });
    expect(battle._attackInProgress).toBe(active);
    battle._onHostSync({ type: 'attack_cancel', sourceIdx: 1, attackId: 'new' });
    expect(battle._attackInProgress).toBeNull();
  });
  it('rejects negative hand indices without applying effects', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].hand = [card('heal')];
    battle._onRemotePlayCard(1, { type: 'heal', cardIndex: -1, healAmount: 1 });
    expect(mc.GameState.players[1].hand).toHaveLength(1);
    expect(mc.GameState.players[1].resources.hp.current).toBe(4);
  });
  it('refunds a pending attack before a remote turn ends', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].hand = [card()];
    battle._handleAttackIntent(1, 0, 0);
    let handAtNextTurn;
    battle._continueNewTurn = () => {
      handAtNextTurn = mc.GameState.players[1].hand.length;
    };
    battle._onRemoteEndTurn(1);
    expect(handAtNextTurn).toBe(1);
    expect(battle._attackInProgress).toBeNull();
  });
  it('refunds a pending attack before the host turn timer advances', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].hand = [card()];
    battle._handleAttackIntent(1, 0, 0);
    battle._continueNewTurn = () => {};
    battle._onTurnTimeout();
    expect(mc.GameState.players[1].hand).toHaveLength(1);
  });
  it('applies a successful juesha defense-card cost once on the defending client', () => {
    const host = loadGame();
    host.mc.GameState.players[0].hand = [card('juesha')];
    host.mc.GameState.players[1].hand = [card('defense', 'shield'), card('heal', 'heal')];
    host.battle._handleJueshaMpIntent(0, 0, 1);
    host.battle._resolveMpJueshaAnswer(true);
    const result = host.packets.find((p) => p.d.type === 'action_result');
    const client = loadGame();
    client.battle._isHost = false;
    client.battle._myPlayerIndex = 1;
    client.mc.GameState.players[1].hand = [card('defense', 'shield'), card('heal', 'heal')];
    client.battle._onHostSync(result.d);
    client.battle._onHostSync(result.d);
    expect(client.mc.GameState.players[1].hand.map((c) => c.id)).toEqual(['heal']);
    expect(client.mc.GameState.players[1].hand).toEqual(host.mc.GameState.players[1].hand);
    expect(client.mc.GameState.players[1].resources.hp.current).toBe(4);
  });
  it('resumes AI continuation after a cancelled attack', () => {
    const { mc, battle } = loadGame();
    mc.GameState.players[1].hand = [card()];
    let resumed = 0;
    battle._aiPlayCallback = () => resumed++;
    battle._handleAttackIntent(1, 0, 0);
    mc.MPAttackResolver.cancelAttack(battle, 'defender_timeout');
    vi.advanceTimersByTime(600);
    expect(resumed).toBe(1);
  });
  it('applies repeated successful attack results only once on clients', () => {
    const { mc, battle } = loadGame();
    battle._isHost = false;
    battle._myPlayerIndex = 1;
    mc.GameState.players[1].hand = [card(), card('heal', 'b')];
    const result = {
      type: 'action_result',
      attackId: 'a',
      sourceIdx: 1,
      data: { cardType: 'attack', cardIndex: 0, targetIdx: 0, damage: 1 },
    };
    battle._onHostSync(result);
    battle._onHostSync(result);
    expect(mc.GameState.players[1].hand).toHaveLength(1);
    expect(mc.GameState.players[0].resources.hp.current).toBe(3);
  });
});

describe('multiplayer actions', () => {
  it('syncs a delayed lightning judgment without discarding another hand card', () => {
    const client = loadGame();
    client.battle._isHost = false;
    client.battle._myPlayerIndex = 1;
    client.battle._leiDianData = { chosenNumber: 2 };
    client.battle._syncLeiDianResult(0, 4, false, 0);
    const host = loadGame();
    host.mc.GameState.players[1].hand = [card('heal', 'keep')];
    host.battle._onRemotePlayCard(1, client.packets[0].d);
    expect(host.mc.GameState.players[1].hand.map((c) => c.id)).toEqual(['keep']);
    expect(host.mc.GameState.discardPile).toHaveLength(0);
    expect(host.packets).toHaveLength(1);
    expect(host.packets[0].d.data.ldRolled).toBe(4);
  });
  it('accepts two distinct actions at hand index zero and ignores a repeated packet', () => {
    const { mc, battle, conn } = loadGame();
    mc.GameState.players[1].hand = [card('heal', 'a'), card('heal', 'b')];
    battle._setupMultiplayerSync();
    const first = mc.SyncProtocol.pack('play_card', {
      type: 'heal',
      cardIndex: 0,
      actionId: 'one',
    });
    const second = mc.SyncProtocol.pack('play_card', {
      type: 'heal',
      cardIndex: 0,
      actionId: 'two',
    });
    conn.handlers.data(first);
    conn.handlers.data(first);
    conn.handlers.data(second);
    expect(mc.GameState.players[1].hand).toHaveLength(0);
    expect(mc.GameState.discardPile.map((c) => c.id)).toEqual(['a', 'b']);
  });
  it('sends both rapid actions with different operation ids', () => {
    const { battle, packets } = loadGame();
    battle._isHost = false;
    battle._sendSync({ type: 'heal', cardIndex: 0 });
    battle._sendSync({ type: 'heal', cardIndex: 0 });
    expect(packets).toHaveLength(2);
    expect(packets[0].d.actionId).toBeTruthy();
    expect(packets[0].d.actionId).not.toBe(packets[1].d.actionId);
  });
});
