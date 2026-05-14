/**
 * MediCard Duel — Multiplayer Adapter Firewall (V5.4)
 * Validates and catches exceptions at boundaries between network layer and game modules.
 * Idempotent — all methods are safe to call multiple times with same inputs.
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.MultiplayerAdapter = {
    /** Version anchor — bumped on protocol changes */
    VERSION: '5.4.0',

    /**
     * Validate and generate a deck for multiplayer.
     * Returns { deck, error } — error is null on success.
     */
    generateDeck: function(selectedSubjects, questionLoader) {
      if (!selectedSubjects || selectedSubjects.length === 0) {
        console.warn('[ADAPTER] No subjects selected, using defaults');
        if (MediCard.Config && MediCard.Config.subjectCategories && MediCard.Config.subjectCategories[0]) {
          selectedSubjects = MediCard.Config.subjectCategories[0].subjects;
        }
        if (!selectedSubjects || selectedSubjects.length === 0) {
          return { deck: [], error: 'No subjects available' };
        }
      }
      if (!questionLoader || typeof questionLoader.getQuestion !== 'function') {
        return { deck: [], error: 'Question loader unavailable' };
      }
      try {
        var deck = MediCard.CardData.generateFullDeck(selectedSubjects, questionLoader);
        if (!deck || deck.length === 0) {
          deck = MediCard.CardData.generateBasicDeck(selectedSubjects, questionLoader);
        }
        if (!deck || deck.length === 0) {
          return { deck: [], error: 'Deck generation produced empty result' };
        }
        return { deck: deck, error: null };
      } catch (e) {
        console.error('[ADAPTER] Deck generation failed:', e);
        return { deck: [], error: 'Deck generation exception: ' + e.message };
      }
    },

    /**
     * Validate and resolve a card effect.
     * Returns { result, error } — result is the effect object, error is null on success.
     */
    resolveCardEffect: function(card, source, target) {
      if (!card) return { result: null, error: 'No card provided' };
      if (!source || !source.alive) return { result: null, error: 'Invalid source player' };
      if (!target || !target.alive) return { result: null, error: 'Invalid target player' };
      try {
        var result = MediCard.CardEffects.resolve(card, source, target);
        if (!result || typeof result !== 'object') {
          return { result: { type: 'none', actual: 0 }, error: 'Card effect returned invalid result' };
        }
        return { result: result, error: null };
      } catch (e) {
        console.error('[ADAPTER] Card effect resolution failed:', e);
        return { result: { type: 'none', actual: 0 }, error: 'Effect resolution exception: ' + e.message };
      }
    },

    /**
     * Validate a card can be played by a player.
     */
    canPlay: function(player, card) {
      if (!player || !card) return false;
      if (!player.alive) return false;
      try {
        return MediCard.CardEffects.canPlay(player, card);
      } catch (e) {
        console.error('[ADAPTER] canPlay check failed:', e);
        return false;
      }
    },

    /**
     * Validate game state before applying a delta.
     * Returns { valid, error }.
     */
    validateStateForDelta: function(gs, delta) {
      if (!gs) return { valid: false, error: 'No game state' };
      if (!gs.players || gs.players.length < 2) return { valid: false, error: 'Not enough players' };
      if (!delta) return { valid: false, error: 'No delta provided' };

      if (delta.sourceIdx != null) {
        if (delta.sourceIdx < 0 || delta.sourceIdx >= gs.players.length) {
          return { valid: false, error: 'Invalid source index: ' + delta.sourceIdx };
        }
        if (!gs.players[delta.sourceIdx] || !gs.players[delta.sourceIdx].alive) {
          return { valid: false, error: 'Source player ' + delta.sourceIdx + ' is dead or missing' };
        }
      }

      if (delta.targetIdx != null) {
        if (delta.targetIdx < 0 || delta.targetIdx >= gs.players.length) {
          return { valid: false, error: 'Invalid target index: ' + delta.targetIdx };
        }
      }

      return { valid: true, error: null };
    },

    /**
     * Validate identity data for multiplayer.
     */
    validateIdentities: function(players) {
      if (!players || players.length < 2) return false;
      try {
        var identities = players.map(function(p) { return p.identity; }).filter(Boolean);
        if (identities.length === 0) {
          // Identities not assigned yet — assign them
          MediCard.IdentityData.assignIdentities(players);
          identities = players.map(function(p) { return p.identity; }).filter(Boolean);
        }
        return identities.length === players.length;
      } catch (e) {
        console.error('[ADAPTER] Identity validation failed:', e);
        return false;
      }
    },

    /**
     * Safely get a question for a card.
     */
    getQuestion: function(card) {
      if (!card || !card.questionId) return null;
      try {
        var q = MediCard.QuestionLoader.getQuestion(card.questionId);
        if (!q) return null;
        // Validate question integrity
        if (!q.question || !q.options || q.options.length < 2) return null;
        return q;
      } catch (e) {
        console.error('[ADAPTER] Question retrieval failed:', e);
        return null;
      }
    },

    /**
     * Log a version-anchored state transition.
     * Format: [SYNC] state_from → state_to | trigger: X | ts: T
     */
    /**
     * Regression test lock — returns a diagnostic snapshot of the multiplayer state.
     * Call from browser console: MediCard.MultiplayerAdapter.diagnose()
     */
    diagnose: function() {
      var gs = MediCard.GameState;
      var diag = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        screen: gs.screen,
        mode: gs.mode,
        isHost: gs.isHost,
        playerCount: gs.players.length,
        currentPlayerIndex: gs.currentPlayerIndex,
        deckCount: gs.deck.length,
        discardCount: gs.discardPile.length,
        roundNumber: gs.roundNumber,
        players: gs.players.map(function(p) {
          return {
            name: p.name,
            alive: p.alive,
            isAI: !!p.isAI,
            hp: p.resources ? p.resources.hp.current : '?',
            handCount: p.hand ? p.hand.length : 0,
            equipCount: p.equipment ? Object.values(p.equipment).filter(Boolean).length : 0,
            delayedCount: (p.delayedTactics || []).length
          };
        }),
        networkHost: MediCard.NetworkHost ? {
          connected: !!MediCard.NetworkHost._connected,
          connectionCount: (MediCard.NetworkHost._connections || []).length,
          gameStarted: !!MediCard.NetworkHost._gameStarted
        } : null,
        networkClient: MediCard.NetworkClient ? {
          myIndex: MediCard.NetworkClient._myIndex,
          hasGameState: !!MediCard.NetworkClient._gameState,
          isMyTurn: MediCard.NetworkClient.isMyTurn ? MediCard.NetworkClient.isMyTurn() : false
        } : null,
        roomCode: MediCard.RoomManager ? MediCard.RoomManager.roomCode : null,
        roomPlayers: MediCard.RoomManager ? MediCard.RoomManager.players.length : 0
      };
      console.log('[DIAGNOSE]', JSON.stringify(diag, null, 2));
      return diag;
    },

    anchorLog: function(from, to, trigger) {
      var ts = new Date().toISOString();
      var msg = '[SYNC] ' + from + ' → ' + to + ' | 触发源: ' + trigger + ' | ' + ts + ' | v' + this.VERSION;
      console.log(msg);
      if (MediCard.BattleLogger) {
        MediCard.BattleLogger.log('SYNC', 'state_transition', from + '→' + to, { trigger: trigger });
      }
    }
  };

  window.MediCard = MediCard;
})();
