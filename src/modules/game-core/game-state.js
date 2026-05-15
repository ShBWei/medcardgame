/**
 * MediCard 医杀 — Game State Machine (V5.2 Full)
 * Central state management with equipment, delayed tactics, status effects
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.GameState = {
    screen: 'title',
    mode: 'single',
    isHost: false,
    players: [],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    selectedSubjects: [],
    roundNumber: 0,
    chatMessages: [],

    init() {
      this.screen = 'title';
      this.mode = 'single';
      this.isHost = false;
      this.players = [];
      this.deck = [];
      this.discardPile = [];
      this.currentPlayerIndex = 0;
      this.roundNumber = 0;
      this.chatMessages = [];
      MediCard.TurnSystem.init();
    },

    goToScreen(screen) {
      const validScreens = ['auth', 'title', 'lobby', 'subject', 'playing', 'result', 'study'];
      if (!validScreens.includes(screen)) return;
      this.screen = screen;
      if (MediCard.UI && MediCard.UI.showScreen) {
        MediCard.UI.showScreen(screen);
      }
    },

    setMode(mode) { this.mode = mode; },
    setSelectedSubjects(subjects) { this.selectedSubjects = subjects; },

    /**
     * Add a player with full equipment/delayed/status support
     */
    addPlayer(player) {
      const defaults = {
        id: 'player_' + (this.players.length + 1),
        name: 'Player ' + (this.players.length + 1),
        identity: null,
        resources: MediCard.Resources ? MediCard.Resources.createPlayerResources() : {},
        hand: [],
        equipment: { weapon: null, armor: null, accessory: null, mount: null, tool: null },
        delayedTactics: [],
        alive: true,
        isAI: false,
        peerId: null,
        // Status effects
        attackBonus: 0,
        immuneUntilNextTurn: false,
        immuneNextHit: false,
        skipNextPlayPhase: false,
        skipNextAttackOnly: false,
        skipNextTurn: false,
        vaccineTurns: 0
      };
      this.players.push({ ...defaults, ...player });
    },

    getCurrentPlayer() {
      return this.players[this.currentPlayerIndex] || null;
    },

    getPlayerById(id) {
      return this.players.find(p => p.id === id) || null;
    },

    nextPlayer() {
      const startIndex = this.currentPlayerIndex;
      do {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      } while (!this.players[this.currentPlayerIndex].alive && this.currentPlayerIndex !== startIndex);
      return this.getCurrentPlayer();
    },

    drawCard(playerIndex) {
      const player = this.players[playerIndex];
      if (!player || !player.alive) return null;
      if (this.deck.length === 0) this._reshuffleDiscard();
      if (this.deck.length === 0) return null;
      const card = this.deck.pop();
      player.hand.push(card);
      return card;
    },

    drawCards(playerIndex, count) {
      const drawn = [];
      for (let i = 0; i < count; i++) {
        const card = this.drawCard(playerIndex);
        if (card) drawn.push(card);
        else break;
      }
      return drawn;
    },

    discardCard(playerIndex, cardIndex) {
      const player = this.players[playerIndex];
      if (!player || cardIndex >= player.hand.length) return null;
      const [card] = player.hand.splice(cardIndex, 1);
      this.discardPile.push(card);
      return card;
    },

    playCard(playerIndex, cardIndex) {
      const player = this.players[playerIndex];
      if (!player || cardIndex >= player.hand.length) return null;
      const [card] = player.hand.splice(cardIndex, 1);
      this.discardPile.push(card);
      return card;
    },

    peekDeckTop(count) {
      var actual = Math.min(count, this.deck.length);
      return this.deck.slice(-actual).reverse();
    },

    drawFromPeek(cardIndex) {
      // cardIndex is 0-based from top of deck (0 = top, 1 = second, etc.)
      var actualIdx = this.deck.length - 1 - cardIndex;
      if (actualIdx < 0 || actualIdx >= this.deck.length) return null;
      var card = this.deck.splice(actualIdx, 1)[0];
      return card;
    },

    _reshuffleDiscard() {
      if (this.discardPile.length === 0) return;
      this.deck = MediCard.CardData ? MediCard.CardData.shuffle([...this.discardPile]) : this.discardPile.slice();
      this.discardPile = [];
    },

    getAlivePlayers() { return this.players.filter(p => p.alive); },
    getAliveCount() { return this.players.filter(p => p.alive).length; },
    isGameOver() { return MediCard.Victory ? MediCard.Victory.check(this.players) : null; },

    getStateSnapshot() {
      return {
        screen: this.screen,
        mode: this.mode,
        players: this.players.map(p => ({
          id: p.id, name: p.name,
          identity: p.mode === 'multiplayer' ? undefined : p.identity,
          hp: p.resources ? p.resources.hp : { current: 0, max: 0 },
          handCount: p.hand.length,
          alive: p.alive,
          equipCount: Object.values(p.equipment || {}).filter(Boolean).length,
          delayedCount: (p.delayedTactics || []).length
        })),
        deckCount: this.deck.length,
        discardCount: this.discardPile.length,
        currentPlayerIndex: this.currentPlayerIndex,
        roundNumber: this.roundNumber,
        turnNumber: MediCard.TurnSystem.turnNumber
      };
    }
  };

  window.MediCard = MediCard;
})();
