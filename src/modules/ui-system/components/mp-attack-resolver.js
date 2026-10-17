/**
 * MediCard 医杀 — Multiplayer Attack Resolver (V5.5)
 * Handles the FULL attack resolution flow for 3+ player games.
 * Isolated from 2-player auto-target and single-player modes.
 *
 * Flow:
 *   1. Attacker plays card → TargetSelector popup → target chosen
 *   2. This module handles: send intent → host process → defender answer → resolve → broadcast
 *   3. Client-side timeout prevents permanent freeze if defender never answers
 *
 * Key invariant: _attackInProgress must ALWAYS be cleared, even on errors/timeouts.
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.MPAttackResolver = {
    /** Max wait time for defender to answer (ms) */
    TIMEOUT_MS: 45000,

    /**
     * Called after target selection — handles the full attack resolution.
     * @param {Object} battle  — ScreenBattle instance (for _sendSync, _flashPhase, etc.)
     * @param {Object} player  — attacker player object
     * @param {Object} card    — the card being played
     * @param {number} cardIdx — index in attacker's hand
     * @param {number} targetIdx — index of target in GameState.players
     */
    executeAttack: function(battle, player, card, cardIdx, targetIdx, scalpelBonus) {
      var self = this;

      // Validate
      if (!battle._turnActive) return;
      if (battle._attackInProgress) return;
      if (card.cardType === 'juesha' && battle._jueshaPlayedThisTurn) {
        battle._flashPhase('💀 本回合已出过绝杀，无法再次使用');
        return;
      }

      var gs = MediCard.GameState;
      var target = gs.players[targetIdx];
      if (!target || !target.alive) {
        battle._updateDisplay();
        return;
      }

      var attackId = MediCard.SyncProtocol.nextId();

      // ── Client-side guard + safety timeout ──
      // Only needed when client sends intent and waits for host response.
      // Host handlers (_handleAttackIntent, etc.) set their own guard + timeout.
      if (!battle._isHost) {
        var attackCtx = {
          type: 'waiting_defend',
          attackId: attackId,
          cardType: card.cardType,
          cardIndex: cardIdx,
          targetIdx: targetIdx,
          startedAt: Date.now()
        };
        battle._attackInProgress = attackCtx;

        battle._attackTimeout = setTimeout(function() {
          if (battle._attackInProgress === attackCtx) {
            if (MediCard.BattleLogger) {
              MediCard.BattleLogger.log('ATTACK_TIMEOUT', 'mp_attack_resolver',
                'Attack stalled for ' + self.TIMEOUT_MS + 'ms — auto-clearing',
                { cardIdx: cardIdx, targetIdx: targetIdx });
            }
            battle._flashPhase('⏰ 正在等待房主确认攻击取消');
            battle._sendSync({ type: 'attack_cancel', attackId: attackId, cardIndex: cardIdx, targetIdx: targetIdx, sourceIdx: battle._myPlayerIndex });
            battle._updateDisplay();
          }
        }, self.TIMEOUT_MS);
      }

      // ── Log start ──
      if (MediCard.BattleLogger) {
        var logAttackerIdx = gs.players.indexOf(player);
        if (logAttackerIdx < 0) logAttackerIdx = battle._myPlayerIndex;
        MediCard.BattleLogger.log('ATTACK_FLOW', 'mp_attack_start',
          card.cardName + ' → ' + (target.name || 'P' + targetIdx),
          { isHost: battle._isHost, attackerIdx: logAttackerIdx,
            cardIdx: cardIdx, targetIdx: targetIdx,
            cardType: card.cardType });
      }

      // ── Dispatch ──
      if (battle._isHost) {
        // Derive attacker index from player object (supports AI players where _myPlayerIndex != attacker)
        var attackerIdx = gs.players.indexOf(player);
        if (attackerIdx < 0) attackerIdx = battle._myPlayerIndex;
        // Host routes directly
        if (card.cardType === 'juesha') {
          battle._handleJueshaMpIntent(attackerIdx, cardIdx, targetIdx, attackId);
        } else if (card.cardType === 'juedou') {
          battle._handleJuedouMpIntent(attackerIdx, cardIdx, targetIdx, attackId);
        } else {
          battle._handleAttackIntent(attackerIdx, cardIdx, targetIdx, scalpelBonus, attackId);
        }
      } else {
        // Client sends intent to host
        battle._sendSync({
          type: 'offensive_intent',
          attackId: attackId,
          cardType: card.cardType,
          cardIndex: cardIdx,
          targetIdx: targetIdx,
          scalpelBonus: !!scalpelBonus
        });
        battle._flashPhase('🎯 等待对手回应...');
        // CRITICAL: update display so buttons reflect _attackInProgress state
        battle._updateDisplay();
      }
    },

    /**
     * Called when host receives DEFEND_ANSWER or when attack resolves.
     * Clears timeout and guard on the host side.
     */
    clearHostGuard: function(battle) {
      if (battle._attackInProgress && battle._dismissDefendQuestion) {
        battle._dismissDefendQuestion(battle._attackInProgress.attackId);
      }
      if (battle._attackTimeout) {
        clearTimeout(battle._attackTimeout);
        battle._attackTimeout = null;
      }
      battle._attackInProgress = null;
    },

    /**
     * Called on client when receiving action_result from host.
     * Clears the client's _attackInProgress guard.
     */
    clearClientGuard: function(battle) {
      if (battle._attackTimeout) {
        clearTimeout(battle._attackTimeout);
        battle._attackTimeout = null;
      }
      if (battle._attackInProgress && battle._attackInProgress.type === 'waiting_defend') {
        battle._attackInProgress = null;
      }
    },

    /**
     * Host-side: validate clientIdx for DEFEND_QUESTION routing.
     * Returns { ok: true, conn: ... } or { ok: false, reason: '...', localResolve: true }
     * Handles AI players correctly — they are local, not remote.
     */
    validateDefenderRoute: function(battle, targetIdx) {
      var gs = MediCard.GameState;
      var defender = gs.players[targetIdx];
      // AI players are controlled locally by the host — no network routing needed
      if (defender && defender.isAI) {
        return { ok: false, reason: 'target_is_ai', localResolve: true };
      }
      // Host is always player 0 — should be handled locally
      if (targetIdx === 0) {
        return { ok: false, reason: 'target_is_host', localResolve: true };
      }
      var conns = MediCard.NetworkHost._connections;
      var target = gs.players[targetIdx];
      if (target && target.peerId) {
        var direct = (conns || []).find(function(c) { return c.peer === target.peerId && c.open; });
        if (direct) return { ok: true, conn: direct };
        var relay = MediCard.RelayTransport;
        var relayId = target.relayId || target.peerId;
        if (relay && relay.isOpen() && relay.hasPeer(relayId)) {
          return { ok: true, conn: { send: function(raw) { relay.sendTo(relayId, raw); } } };
        }
        return { ok: false, reason: 'player_unreachable' };
      }
      if (!conns || conns.length === 0) {
        return { ok: false, reason: 'no_connections' };
      }
      // Map player index to connection: count non-AI, non-host players up to targetIdx
      var connIdx = -1;
      for (var i = 1; i <= targetIdx; i++) {
        var p = gs.players[i];
        if (p && !p.isAI) connIdx++;
      }
      if (connIdx < 0 || connIdx >= conns.length) {
        return { ok: false, reason: 'client_idx_out_of_range',
          connIdx: connIdx, connCount: conns.length, targetIdx: targetIdx };
      }
      if (!conns[connIdx].open) {
        return { ok: false, reason: 'connection_not_open', connIdx: connIdx };
      }
      return { ok: true, conn: conns[connIdx], clientIdx: connIdx };
    },

    /**
     * Broadcast error recovery: if attack can't be delivered, cancel it gracefully.
     * Called when _handleAttackIntent can't send DEFEND_QUESTION.
     */
    cancelAttack: function(battle, reason, defenderName) {
      var ctx = battle._attackInProgress;
      if (!ctx || !ctx.card || !ctx.attacker) return;
      var discard = MediCard.GameState.discardPile;
      // Cards are reserved until resolution. Clients still have these cards.
      var discarded = discard.indexOf(ctx.card);
      if (discarded >= 0) discard.splice(discarded, 1);
      ctx.attacker.hand.splice(ctx.cardIndex, 0, ctx.card);
      if (ctx.defenseCard) {
        var defenseDiscarded = discard.indexOf(ctx.defenseCard);
        if (defenseDiscarded >= 0) discard.splice(defenseDiscarded, 1);
        ctx.defender.hand.splice(ctx.defenseCardIndex, 0, ctx.defenseCard);
      }
      if (ctx.type === 'juesha') battle._jueshaPlayedThisTurn = ctx.previousJueshaPlayed || false;
      if (MediCard.BattleLogger) {
        MediCard.BattleLogger.log('ATTACK_CANCEL', 'mp_attack_resolver',
          'Attack cancelled: ' + reason);
      }
      this.clearHostGuard(battle);
      battle._flashPhase('⚠️ 无法联系 ' + (defenderName || '对手') + '，攻击取消');
      battle._sendSync({
        type: 'attack_cancel',
        reason: reason,
        sourceIdx: ctx.attackerIndex,
        attackId: ctx.attackId
      });
      battle._updateDisplay();
      if (battle._aiPlayCallback) {
        var next = battle._aiPlayCallback;
        battle._aiPlayCallback = null;
        if (reason !== 'turn_end') {
          battle._trackTimer(setTimeout(function() {
            if (MediCard.GameState.currentPlayerIndex === ctx.attackerIndex && battle._turnActive) next();
          }, 600));
        }
      }
    }
  };

  window.MediCard = MediCard;
})();
