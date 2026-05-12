/**
 * MediCard 医杀 — Battle Screen (V5.2 Enhanced)
 * Full 120-card deck: basic, tactic, equipment, delayed
 * Equipment display, delayed judgment, stat tracking
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenBattle = {
    _player: null,
    _aiPlayer: null,
    _selectedCardIndex: -1,
    _selectedDiscardIndices: [],
    _pendingCard: null,
    _attackInProgress: null,
    _pendingDiscard: null,
    _difficulty: 'normal',
    _turnActive: false,
    _isDiscardPhase: false,
    _aiContinuePlay: null,
    _playedCardsThisTurn: [],
    _attacksThisTurn: 0,
    _debugLog: [],
    // Game stats tracking
    _gameStats: { questionsAnswered: 0, correctAnswers: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 },
    // Multiplayer support
    _isMultiplayer: false,
    _isHost: false,
    _multiplayerPlayers: null,
    _multiplayerDeck: null,
    _multiplayerTotalPlayers: 2,
    _myPlayerIndex: 0,
    _attackTargetIndex: -1,
    _pendingAttackCardIndex: -1,
    _skipSyncBroadcast: false,

    /* ============ Init ============ */

    init() {
      var gs = MediCard.GameState;
      gs.init();

      // Load difficulty from storage
      this._difficulty = MediCard.Storage.get('difficulty', 'normal');

      // Check for multiplayer mode (set by lobby)
      if (this._isMultiplayer && this._multiplayerPlayers) {
        this._initMultiplayer(gs);
        return;
      }

      this._isMultiplayer = false;
      this._isHost = false;
      this._myPlayerIndex = 0;

      this._player = {
        id: 'player_1',
        name: MediCard.Storage.getPlayerName() || '医学战士',
        identity: 'lord',
        identityRevealed: true,
        resources: MediCard.Resources.createPlayerResources({ hp: 5 }),
        hand: [],
        equipment: { weapon: null, armor: null, accessory: null, mount: null, tool: null },
        delayedTactics: [],
        alive: true,
        isAI: false,
        attackBonus: 0,
        immuneUntilNextTurn: false,
        skipNextPlayPhase: false,
        skipNextTurn: false,
        vaccineTurns: 0
      };

      this._aiPlayer = {
        id: 'player_2',
        name: 'AI对手',
        identity: 'rebel',
        identityRevealed: false,
        resources: MediCard.Resources.createPlayerResources({ hp: 4 }),
        hand: [],
        equipment: { weapon: null, armor: null, accessory: null, mount: null, tool: null },
        delayedTactics: [],
        alive: true,
        isAI: true,
        attackBonus: 0,
        immuneUntilNextTurn: false,
        skipNextPlayPhase: false,
        skipNextTurn: false,
        vaccineTurns: 0
      };

      gs.players = [this._player, this._aiPlayer];
      gs.currentPlayerIndex = 0;

      // Generate full 120-card deck from selected subjects
      var selectedIds = Array.from(MediCard.QuestionLoader._selectedSubjects);
      if (selectedIds.length === 0) {
        selectedIds = MediCard.Config.subjectCategories[0].subjects;
        MediCard.QuestionLoader.init(selectedIds);
      }
      var deck = MediCard.CardData.generateFullDeck(selectedIds, MediCard.QuestionLoader);
      if (!deck || deck.length === 0) {
        // Fallback to basic deck
        deck = MediCard.QuestionLoader.generateDeck(72);
      }
      gs.deck = deck;

      // Deal initial hands: 4 cards each
      gs.drawCards(0, 4);
      gs.drawCards(1, 4);

      this._selectedCardIndex = -1;
      this._selectedDiscardIndices = [];
      this._pendingCard = null;
      this._attackInProgress = null;
      this._pendingDiscard = null;
      this._aiContinuePlay = null;
      this._turnActive = true;
      this._isDiscardPhase = false;
      this._playedCardsThisTurn = [];
      this._attacksThisTurn = 0;
      this._debugLog = [];
      this._attackTargetIndex = -1;
      this._pendingAttackCardIndex = -1;

      // Reset game stats
      this._gameStats = { questionsAnswered: 0, correctAnswers: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 };
      this._log('game_start', '游戏开始, 难度:' + this._difficulty);
    },

    /** Initialize multiplayer mode from lobby data */
    _initMultiplayer: function(gs) {
      this._player = this._multiplayerPlayers[this._myPlayerIndex];
      this._player.isAI = false;

      gs.players = this._multiplayerPlayers;
      gs.deck = this._multiplayerDeck || [];
      gs.discardPile = [];
      gs.currentPlayerIndex = 0;
      gs.mode = 'multiplayer';

      this._selectedCardIndex = -1;
      this._selectedDiscardIndices = [];
      this._pendingCard = null;
      this._attackInProgress = null;
      this._pendingDiscard = null;
      this._aiContinuePlay = null;
      this._turnActive = true;
      this._isDiscardPhase = false;
      this._playedCardsThisTurn = [];
      this._attacksThisTurn = 0;
      this._debugLog = [];
      this._attackTargetIndex = -1;
      this._pendingAttackCardIndex = -1;
      this._skipSyncBroadcast = false;

      this._gameStats = { questionsAnswered: 0, correctAnswers: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 };
      this._log('game_start', '多人游戏开始, 玩家数:' + gs.players.length);

      this._setupMultiplayerSync();
    },

    /* ============ Multiplayer P2P Sync ============ */

    _setupMultiplayerSync: function() {
      var self = this;
      var gs = MediCard.GameState;

      if (this._isHost) {
        // Host: listen for actions from each client connection
        var conns = MediCard.NetworkHost._connections;
        for (var ci = 0; ci < conns.length; ci++) {
          (function(conn, clientIdx) {
            conn.on('data', function(raw) {
              var msg = MediCard.SyncProtocol.unpack(raw);
              if (!msg) return;
              switch (msg.t) {
                case MediCard.SyncProtocol.MessageType.PLAY_CARD:
                  self._onRemotePlayCard(clientIdx, msg.d);
                  break;
                case MediCard.SyncProtocol.MessageType.END_TURN:
                  self._onRemoteEndTurn(clientIdx);
                  break;
                case MediCard.SyncProtocol.MessageType.ANSWER_QUESTION:
                  self._onRemoteAnswer(clientIdx, msg.d);
                  break;
                case MediCard.SyncProtocol.MessageType.DEFEND_ANSWER:
                  if (msg.d && typeof msg.d.correct === 'boolean') {
                    self._resolveDefendAnswer(msg.d.correct);
                  }
                  break;
                case MediCard.SyncProtocol.MessageType.SURRENDER:
                  self._onRemoteSurrender(clientIdx);
                  break;
                case MediCard.SyncProtocol.MessageType.DELTA_STATE:
                  // Unified sync from client/host: dispatch by data.type
                  if (msg.d && msg.d.type === 'action_result') {
                    self._onRemotePlayCard(clientIdx, msg.d);
                  } else if (msg.d && msg.d.type === 'end_turn') {
                    self._onRemoteEndTurn(clientIdx);
                  }
                  break;
              }
            });
          })(conns[ci], ci + 1);
        }
      } else {
        // Client: listen for sync from host
        var hc = MediCard.NetworkClient._hostConn;
        if (hc) {
          hc.on('data', function(raw) {
            var msg = MediCard.SyncProtocol.unpack(raw);
            if (!msg) return;
            if (msg.t === MediCard.SyncProtocol.MessageType.DELTA_STATE) {
              self._onHostSync(msg.d);
            } else if (msg.t === MediCard.SyncProtocol.MessageType.DEFEND_QUESTION) {
              self._onDefendQuestion(msg.d);
            } else if (msg.t === MediCard.SyncProtocol.MessageType.GAME_OVER) {
              self._onRemoteGameOver(msg.d);
            }
          });
        }
      }
    },

    /** Send a sync event to all other players */
    _sendSync: function(data) {
      if (this._isHost) {
        var conns = MediCard.NetworkHost._connections;
        var pkt = MediCard.SyncProtocol.pack(MediCard.SyncProtocol.MessageType.DELTA_STATE, data);
        for (var i = 0; i < conns.length; i++) {
          if (conns[i].open) conns[i].send(pkt);
        }
      } else {
        MediCard.NetworkClient.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.PLAY_CARD, data
        ));
      }
    },

    /** Host: handle a play card action from a remote client */
    _onRemotePlayCard: function(playerIdx, data) {
      var gs = MediCard.GameState;
      if (gs.currentPlayerIndex !== playerIdx) return;
      var player = gs.players[playerIdx];
      if (!player || !player.alive) return;

      // New flow: attack intent — delegate to attack handler
      if (data.type === 'attack_intent') {
        this._handleAttackIntent(playerIdx, data.cardIndex, data.targetIdx);
        return;
      }

      // Non-attack card play from client
      if (data.cardIndex < player.hand.length) {
        var removed = player.hand.splice(data.cardIndex, 1)[0];
        gs.discardPile.push(removed);
      }

      // Apply simple effects
      if (data.healAmount && player.alive) {
        player.resources.hp.current = Math.min(
          player.resources.hp.max,
          player.resources.hp.current + data.healAmount
        );
      }
      if (data.drawCount > 0) {
        gs.drawCards(playerIdx, data.drawCount);
      }
      if (data.attackBonusAdd) {
        player.attackBonus = (player.attackBonus || 0) + data.attackBonusAdd;
      }
      if (data.immuneNextTurn) {
        player.immuneUntilNextTurn = true;
      }
      if (data.skipNextPlay) {
        var target = gs.players[data.skipTargetIdx];
        if (target) target.skipNextPlayPhase = true;
      }
      if (data.discardTargetCount && data.discardTargetCount > 0) {
        var tgt = gs.players[data.discardTargetIdx];
        if (tgt && tgt.hand.length > 0) {
          var rIdx = Math.floor(Math.random() * tgt.hand.length);
          gs.discardPile.push(tgt.hand.splice(rIdx, 1)[0]);
        }
      }
      if (data.damageToAll > 0) {
        for (var i = 0; i < gs.players.length; i++) {
          if (i !== playerIdx && gs.players[i].alive) {
            gs.players[i].resources.hp.current = Math.max(0, gs.players[i].resources.hp.current - data.damageToAll);
            if (gs.players[i].resources.hp.current <= 0) gs.players[i].alive = false;
          }
        }
      }

      this._updateDisplay();
      // Broadcast result to all clients
      this._sendSync({ type: 'action_result', sourceIdx: playerIdx, data: data });
    },

    /** Host: handle end turn from a remote client */
    _onRemoteEndTurn: function(playerIdx) {
      var gs = MediCard.GameState;
      if (gs.currentPlayerIndex !== playerIdx) return;
      this._skipSyncBroadcast = true;
      this._continueNewTurn();
      // Broadcast the new turn state with hand data for next player
      var nextPlayer = gs.getCurrentPlayer();
      this._sendSync({
        type: 'turn_change',
        currentPlayerIndex: gs.currentPlayerIndex,
        deckCount: gs.deck.length,
        currentHand: nextPlayer ? nextPlayer.hand.slice() : [],
        players: gs.players.map(function(p) {
          return {
            hp: p.resources.hp.current,
            maxHp: p.resources.hp.max,
            mp: p.resources.mp.current,
            alive: p.alive,
            handCount: p.hand.length
          };
        })
      });
    },

    /** Host: handle answer from remote client */
    _onRemoteAnswer: function(playerIdx, data) {
      // Forward answer result to all clients
      this._sendSync({ type: 'answer_result', sourceIdx: playerIdx, correct: data.correct });
    },

    /** Host: handle surrender from remote client */
    _onRemoteSurrender: function(playerIdx) {
      var player = MediCard.GameState.players[playerIdx];
      if (!player) return;
      player.alive = false;
      player.resources.alive = false;
      player.resources.hp.current = 0;
      this._flashPhase('🏳️ ' + (player.name || '对手') + ' 投降了！');
      this._updateDisplay();
      // Broadcast to all clients
      if (this._isHost) {
        this._sendSync({ type: 'surrender', playerIdx: playerIdx });
      }
      // Check game over
      var self = this;
      var victory = MediCard.Victory.check(MediCard.GameState.players);
      if (victory) {
        setTimeout(function() { self._endGame(victory); }, 1000);
      }
    },

    /** Client: called when remote game over message received */
    _onRemoteGameOver: function(data) {
      var gs = MediCard.GameState;
      if (data.players) {
        for (var i = 0; i < data.players.length; i++) {
          if (gs.players[i]) {
            gs.players[i].alive = data.players[i].alive;
            gs.players[i].resources.hp.current = data.players[i].hp;
          }
        }
      }
      this._updateDisplay();
      var self = this;
      var victory = MediCard.Victory.check(gs.players);
      setTimeout(function() { self._endGame(victory); }, 800);
    },

    /** Client: handle sync message from host */
    _onHostSync: function(data) {
      var gs = MediCard.GameState;
      switch (data.type) {
        case 'action_result':
          // Another player performed an action — apply the delta
          var p = gs.players[data.sourceIdx];
          if (p && data.data) {
            if (data.data.cardType === 'attack' && data.data.damage > 0) {
              var target = gs.players[data.data.targetIdx];
              if (target && target.alive) {
                target.resources.hp.current = Math.max(0, target.resources.hp.current - data.data.damage);
                if (target.resources.hp.current <= 0) {
                  target.alive = false;
                }
              }
            }
            // Card removal: skip for our own non-attack actions (already removed locally),
            // but DO remove for our own attack actions (delayed removal via host confirmation)
            var isOwnAction = data.sourceIdx === this._myPlayerIndex;
            var isAttackAction = data.data.cardType === 'attack';
            if (!isOwnAction || isAttackAction) {
              if (data.data.cardIndex < (p.hand ? p.hand.length : 0)) {
                p.hand.splice(data.data.cardIndex, 1);
              }
            }
            if (data.data.healAmount && p.alive) {
              p.resources.hp.current = Math.min(p.resources.hp.max, p.resources.hp.current + data.data.healAmount);
            }
          }
          // Clear waiting state if this was our own attack + show result
          if (this._attackInProgress && this._attackInProgress.type === 'waiting_defend') {
            this._attackInProgress = null;
            this._pendingCard = null;
            if (data.data.cardType === 'attack') {
              this._attacksThisTurn++; // Increment attack counter now that result is back
              var defName = (gs.players[data.data.targetIdx] || {}).name || '对手';
              if (data.data.damage > 0) {
                this._flashPhase('⚔️ ' + defName + ' 受到 ' + data.data.damage + ' 点伤害！');
              } else {
                this._flashPhase('🛡️ ' + defName + ' 答对了！攻击被闪避');
              }
            }
          }
          this._updateDisplay();
          break;

        case 'turn_change':
          // Host advanced the turn
          gs.currentPlayerIndex = data.currentPlayerIndex;
          gs.deckCount = data.deckCount;
          if (data.players) {
            for (var i = 0; i < data.players.length; i++) {
              var sp = data.players[i];
              var lp = gs.players[i];
              if (lp) {
                lp.resources.hp.current = sp.hp;
                lp.alive = sp.alive;
                lp.resources.mp.current = sp.mp;
              }
            }
          }
          // If it's now my turn, use hand data from host
          if (gs.currentPlayerIndex === this._myPlayerIndex) {
            this._player = gs.players[this._myPlayerIndex];
            // Replace hand with cards the host sent (deck is centralized on host)
            if (data.currentHand) {
              this._player.hand = data.currentHand;
            }
            this._turnActive = true;
            this._isDiscardPhase = false;
            this._playedCardsThisTurn = [];
            this._attacksThisTurn = 0;
            this._attackTargetIndex = -1;
            this._pendingAttackCardIndex = -1;
            this._selectedCardIndex = -1;
            this._attackInProgress = null;
            MediCard.IdentitySkills.applyTurnStartEffects(this._player);
            if (this._player.vaccineTurns > 0) this._player.vaccineTurns--;
            if (!this._player.maxAttacks) this._player.maxAttacks = 1;
            if (this._player.attackBonus === undefined) this._player.attackBonus = 0;
          } else {
            this._turnActive = false;
          }
          this._updateDisplay();

          // Check game over
          var victory = MediCard.Victory.check(gs.players);
          if (victory) {
            var self = this;
            setTimeout(function() { self._endGame(victory); }, 500);
          }
          break;

        case 'answer_result':
          // Another player answered a question — informational
          break;

        case 'surrender':
          var sp = gs.players[data.playerIdx];
          if (sp) {
            sp.alive = false;
            sp.resources.alive = false;
            sp.resources.hp.current = 0;
            this._flashPhase('🏳️ ' + (sp.name || '对手') + ' 投降了！');
          }
          this._updateDisplay();
          var sv = MediCard.Victory.check(gs.players);
          if (sv) {
            var self2 = this;
            setTimeout(function() { self2._endGame(sv); }, 1000);
          }
          break;

        case 'game_over':
          this._onRemoteGameOver(data);
          break;
      }
    },

    /* ============ Rendering ============ */

    render() {
      var screen = document.getElementById('screen-battle');
      if (!screen) return;
      screen.classList.add('active');

      var gs = MediCard.GameState;
      var isMyTurn = this._isMultiplayer
        ? (gs.currentPlayerIndex === this._myPlayerIndex)
        : (gs.currentPlayerIndex === 0);

      var currentPlayer = gs.getCurrentPlayer();
      var turnLabel = isMyTurn ? '你的回合' : (currentPlayer ? (currentPlayer.name || '对手') + ' 回合 — 等待中...' : 'AI 回合 — 等待中...');
      var phaseText = isMyTurn ? '选择卡牌出牌' : '等待其他玩家操作...';
      var modeLabel = this._isMultiplayer
        ? ('⚔️ 联机对战 · ' + gs.players.length + '人身份局')
        : ('⚔️ 单人练习 · ' + this._difficultyLabel());

      if (this._isMultiplayer) {
        // Multiplayer render
        this._renderMultiplayer(screen, gs, isMyTurn, turnLabel, phaseText, modeLabel);
      } else {
        // Single player render
        this._renderSingleplayer(screen, gs, isMyTurn, turnLabel, phaseText, modeLabel);
      }
    },

    _renderSingleplayer: function(screen, gs, isMyTurn, turnLabel, phaseText, modeLabel) {
      screen.innerHTML = '' +
        '<div class="battle-opponent" id="opponent-zone"></div>' +
        '<div class="equipment-zone opponent-equip" id="opponent-equip-zone"></div>' +
        '<div class="delayed-zone" id="opponent-delayed-zone"></div>' +
        '<div class="battlefield" id="battlefield">' +
          '<div class="battlefield-center">' +
            '<div class="duel-mode-badge">' + modeLabel + '</div>' +
            '<div class="turn-indicator" id="turn-indicator">' + turnLabel + '</div>' +
            '<div class="phase-indicator" id="phase-indicator">' + phaseText + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="deck-info">' +
          '<span>📚 牌库: <strong id="deck-count">' + gs.deck.length + '</strong></span>' +
          '<span>🗑️ 弃牌: <strong id="discard-count">' + gs.discardPile.length + '</strong></span>' +
          '<button class="btn btn-ghost btn-sm" id="btn-debug-toggle" title="调试日志">🐛</button>' +
        '</div>' +
        '<div class="delayed-zone" id="player-delayed-zone"></div>' +
        '<div class="equipment-zone player-equip" id="player-equip-zone"></div>' +
        '<div class="hand-limit-indicator" id="hand-limit"></div>' +
        '<div class="player-actions" id="player-actions"' + (!isMyTurn ? ' style="opacity:0.4;pointer-events:none;"' : '') + '>' +
          '<button class="btn btn-play-card" id="btn-play-card" disabled>🃏 出牌</button>' +
          '<button class="btn btn-primary" id="btn-end-turn">⏭️ 结束回合</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-surrender">🏳️ 投降</button>' +
        '</div>' +
        '<div class="played-cards-indicator" id="played-cards-indicator" style="display:none;"></div>' +
        '<div class="debug-panel" id="debug-panel" style="display:none;">' +
          '<div class="debug-panel-header"><span>🐛 调试日志</span><button class="btn btn-ghost btn-sm" id="btn-debug-close">✕</button></div>' +
          '<div class="debug-panel-log" id="debug-log-content"></div>' +
        '</div>' +
        '<div class="response-zone" id="response-zone" style="display:none;"></div>' +
        '<div class="player-hand" id="player-hand"' + (!isMyTurn ? ' style="opacity:0.5;pointer-events:none;"' : '') + '></div>' +
        '<div class="card-hint" id="card-hint" style="display:none;text-align:center;padding:6px 12px;margin:0 12px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:8px;font-size:12px;color:var(--text-secondary);"></div>' +
        '<div class="battle-player">' +
          '<div id="player-status"></div>' +
        '</div>';

      MediCard.PlayerPanel.render(this._aiPlayer, 'opponent-zone', true);
      MediCard.PlayerPanel.render(this._player, 'player-status', false);
      this._renderEquipment(this._aiPlayer, 'opponent-equip-zone');
      this._renderEquipment(this._player, 'player-equip-zone');
      this._renderDelayed(this._aiPlayer, 'opponent-delayed-zone');
      this._renderDelayed(this._player, 'player-delayed-zone');
      this._renderHand();
      this._updateHandLimit();
      this._attachEvents();
    },

    _renderMultiplayer: function(screen, gs, isMyTurn, turnLabel, phaseText, modeLabel) {
      // Build opponent list HTML (all players except self)
      var oppHtml = '';
      var self_ = this;
      for (var i = 0; i < gs.players.length; i++) {
        var p = gs.players[i];
        if (i === this._myPlayerIndex) continue;
        var identityInfo = p.identityInfo || MediCard.IdentityData.getIdentityInfo(p.identity) || {};
        var hp = p.resources && p.resources.hp ? p.resources.hp : { current: 0, max: 0 };
        var isTarget = (i === this._attackTargetIndex);
        oppHtml += '<div class="multiplayer-opponent' + (isTarget ? ' attack-target' : '') + (p.alive ? '' : ' dead') + '" id="mp-opponent-' + i + '" data-player-index="' + i + '" style="cursor:' + (isMyTurn && p.alive ? 'pointer' : 'default') + ';">' +
          '<span style="background:' + (identityInfo.color || '#64748b') + ';width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:8px;">' + (identityInfo.icon || '👤') + '</span>' +
          '<span style="flex:1;font-weight:600;">' + MediCard.Crypto.escapeHtml(p.name || '玩家' + (i+1)) + '</span>' +
          '<span style="font-size:13px;color:' + (hp.current <= 1 ? '#ef4444' : '#10b981') + ';">❤️' + hp.current + '/' + hp.max + '</span>' +
          '<span style="font-size:10px;margin-left:6px;color:var(--text-muted);">🃏' + p.hand.length + '</span>' +
          (p.equipment && (p.equipment.weapon || p.equipment.armor) ? '<span style="margin-left:4px;">🔧</span>' : '') +
          '</div>';
      }

      screen.innerHTML = '' +
        '<div class="multiplayer-opponents" id="opponents-zone">' + oppHtml + '</div>' +
        '<div class="battlefield" id="battlefield">' +
          '<div class="battlefield-center">' +
            '<div class="duel-mode-badge">' + modeLabel + '</div>' +
            '<div class="turn-indicator" id="turn-indicator">' + turnLabel + '</div>' +
            '<div class="phase-indicator" id="phase-indicator">' + phaseText + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="deck-info">' +
          '<span>📚 牌库: <strong id="deck-count">' + gs.deck.length + '</strong></span>' +
          '<span>🗑️ 弃牌: <strong id="discard-count">' + gs.discardPile.length + '</strong></span>' +
          '<button class="btn btn-ghost btn-sm" id="btn-debug-toggle" title="调试日志">🐛</button>' +
        '</div>' +
        '<div class="delayed-zone" id="player-delayed-zone"></div>' +
        '<div class="equipment-zone player-equip" id="player-equip-zone"></div>' +
        '<div class="hand-limit-indicator" id="hand-limit"></div>' +
        '<div id="attack-target-prompt" style="display:none;text-align:center;padding:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;margin:8px 12px;color:#fca5a5;font-size:13px;">' +
          '🎯 请点击上方对手选择攻击目标，或按ESC取消' +
        '</div>' +
        '<div class="player-actions" id="player-actions"' + (!isMyTurn ? ' style="opacity:0.4;pointer-events:none;"' : '') + '>' +
          '<button class="btn btn-play-card" id="btn-play-card" disabled>🃏 出牌</button>' +
          '<button class="btn btn-primary" id="btn-end-turn">⏭️ 结束回合</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-surrender">🏳️ 投降</button>' +
        '</div>' +
        '<div class="played-cards-indicator" id="played-cards-indicator" style="display:none;"></div>' +
        '<div class="debug-panel" id="debug-panel" style="display:none;">' +
          '<div class="debug-panel-header"><span>🐛 调试日志</span><button class="btn btn-ghost btn-sm" id="btn-debug-close">✕</button></div>' +
          '<div class="debug-panel-log" id="debug-log-content"></div>' +
        '</div>' +
        '<div class="response-zone" id="response-zone" style="display:none;"></div>' +
        '<div class="player-hand" id="player-hand"' + (!isMyTurn ? ' style="opacity:0.5;pointer-events:none;"' : '') + '></div>' +
        '<div class="card-hint" id="card-hint" style="display:none;text-align:center;padding:6px 12px;margin:0 12px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:8px;font-size:12px;color:var(--text-secondary);"></div>' +
        '<div class="battle-player">' +
          '<div id="player-status"></div>' +
        '</div>';

      // Render player's own status
      MediCard.PlayerPanel.render(this._player, 'player-status', false);
      this._renderEquipment(this._player, 'player-equip-zone');
      this._renderDelayed(this._player, 'player-delayed-zone');
      this._renderHand();
      this._updateHandLimit();
      this._attachMultiplayerEvents();
      this._attachEvents();
    },

    _difficultyLabel() {
      var labels = { easy: '简单', normal: '普通', hard: '困难' };
      return labels[this._difficulty] || '普通';
    },

    _renderEquipment(player, containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      var eq = player.equipment || {};
      var slots = MediCard.Config.equipmentSlots || ['weapon', 'armor', 'accessory', 'mount', 'tool'];
      var html = '';
      slots.forEach(function(slot) {
        var card = eq[slot];
        if (card) {
          var def = MediCard.Config.equipmentDefs[card.cardSubtype] || {};
          html += '<div class="equipment-card equipped" title="' + card.cardName + ': ' + (card.cardEffect || '') + '" style="border-color:' + (def.color || '#10b981') + '33;box-shadow:0 0 6px ' + (def.color || '#10b981') + '22;">' +
            '<span style="font-size:16px;">' + (def.icon || '🔧') + '</span>' +
            '</div>';
        } else {
          html += '<div class="equipment-card empty" title="' + _slotName(slot) + '"><span style="font-size:10px;opacity:0.3;">' + _slotIcon(slot) + '</span></div>';
        }
      });
      container.innerHTML = html;
    },

    _renderDelayed(player, containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      var dt = player.delayedTactics || [];
      if (dt.length === 0) {
        container.innerHTML = '';
        return;
      }
      var html = '';
      dt.forEach(function(card) {
        var def = MediCard.Config.delayedDefs ? MediCard.Config.delayedDefs[card.cardSubtype] : null;
        html += '<div class="delayed-card" title="' + (card.cardName || '') + ': ' + (card.cardEffect || '') + '" style="display:inline-block;padding:4px 8px;margin:2px;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);border-radius:6px;font-size:11px;">' +
          '<span>' + (def ? def.icon : '⏳') + '</span> ' + (card.cardName || '延时') +
          '</div>';
      });
      container.innerHTML = html;
    },

    _renderHand() {
      if (this._isDiscardPhase) {
        this._renderDiscardHand();
        return;
      }
      var container = document.getElementById('player-hand');
      if (!container) return;

      var player = this._player;
      var self = this;

      container.innerHTML = '';
      container.className = 'hand-cards';

      var count = player.hand.length;
      var isMobile = window.innerWidth <= 480;
      var maxAngle = isMobile ? (count > 4 ? 20 : 25) : 35;
      var totalAngle = Math.min(count * (isMobile ? 3 : 5), maxAngle);
      var startAngle = -totalAngle / 2;
      var angleStep = count > 1 ? totalAngle / (count - 1) : 0;
      var liftMult = isMobile ? 1.4 : 2;

      player.hand.forEach(function(card, idx) {
        var cardEl = MediCard.CardVisuals.createCardElement(card);
        var angle = startAngle + angleStep * idx;
        var translateY = Math.abs(angle) * liftMult;

        cardEl.style.setProperty('--fan-angle', angle + 'deg');
        cardEl.style.setProperty('--fan-lift', translateY + 'px');
        cardEl.style.setProperty('--fan-idx', idx + 1);

        if (idx === self._selectedCardIndex) {
          cardEl.style.setProperty('--fan-angle', '0deg');
          cardEl.style.setProperty('--fan-lift', isMobile ? '-18px' : '-25px');
          cardEl.style.setProperty('--fan-scale', '1.08');
          cardEl.style.setProperty('--fan-idx', '50');
          cardEl.style.boxShadow = '0 0 18px rgba(6,182,212,0.5)';
        }

        // Right-click or long-press to inspect special cards
        cardEl.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          self._inspectCard(card);
        });

        cardEl.addEventListener('click', function(e) {
          e.stopPropagation();
          if (self._isDiscardPhase) {
            // In discard phase, toggle selection for multi-select
            var dIdx = self._selectedDiscardIndices.indexOf(idx);
            if (dIdx >= 0) {
              self._selectedDiscardIndices.splice(dIdx, 1);
            } else {
              self._selectedDiscardIndices.push(idx);
            }
            self._renderDiscardHand();
          } else {
            // Normal mode: select card, play via button
            if (self._selectedCardIndex === idx) {
              self._selectedCardIndex = -1;
              self._showCardHint(null);
            } else {
              self._selectedCardIndex = idx;
              self._showCardHint(card);
            }
            self._renderHand();
            self._updatePlayButton();
          }
        });

        container.appendChild(cardEl);
      });
    },

    _inspectCard(card) {
      var typeInfo = MediCard.CardData.getTypeInfo(card.cardType);
      var rarityInfo = MediCard.CardData.getRarityInfo(card.rarity);
      var subjectMeta = MediCard.Config.subjectMeta[card.subjectId] || {};
      var howToUse = '';
      switch (card.cardType) {
        case 'attack': howToUse = '打出后对手答题，答错受到伤害'; break;
        case 'defense': howToUse = '被攻击时打出，你答题，答对免疫伤害'; break;
        case 'heal': howToUse = '打出后你答题，答对恢复1点生命值'; break;
        case 'tactic': howToUse = '打出后你答题，答对效果生效'; break;
        case 'equipment': howToUse = '打出后你答题，答对装备到对应槽位'; break;
        case 'delayed': howToUse = '打出后你答题，答对贴到对手身上，判定阶段对手答题决定是否触发'; break;
      }
      alert(
        '🃏 卡牌详情\n\n' +
        '名称：' + (card.cardName || '未知') + '\n' +
        '类型：' + (typeInfo ? typeInfo.icon + ' ' + typeInfo.name : card.cardType) + '\n' +
        '效果：' + (card.cardEffect || '无') + '\n' +
        '用法：' + howToUse + '\n' +
        '学科：' + (subjectMeta.icon || '') + ' ' + (subjectMeta.name || card.subject || '') + '\n' +
        '稀有度：' + (rarityInfo ? rarityInfo.name : card.rarity || '普通')
      );
    },

    /* ============ Card Play ============ */

    _tryPlayCard(cardIndex) {
      if (!this._turnActive) return;
      if (!this._isMultiplayer && MediCard.GameState.currentPlayerIndex !== 0) return;
      if (this._isMultiplayer && MediCard.GameState.currentPlayerIndex !== this._myPlayerIndex) return;
      if (this._attackInProgress) return;
      if (this._pendingCard) return; // QuestionPopup active, prevent overwrite

      var player = this._player;
      var card = player.hand[cardIndex];
      if (!card) return;

      // Defense cards can only be played in response to attack
      if (card.cardType === 'defense') {
        this._selectedCardIndex = -1;
        this._renderHand();
        this._updatePlayButton();
        this._flashPhase('🛡️ 防御牌只能在被攻击时使用');
        return;
      }

      // Check if can play (e.g., 急救 requires HP <= 1)
      if (card.cardSubtype === 'jiJiu' && player.resources.hp.current > 1) {
        this._selectedCardIndex = -1;
        this._renderHand();
        this._updatePlayButton();
        this._flashPhase('🚑 急救只能在生命值≤1时使用');
        return;
      }

      // Limit attacks per turn (default 1, can be increased by 多重打击)
      var maxAttacks = player.maxAttacks || 1;
      if (card.cardType === 'attack' && this._attacksThisTurn >= maxAttacks) {
        this._selectedCardIndex = -1;
        this._renderHand();
        this._updatePlayButton();
        this._flashPhase('⚔️ 本回合攻击次数已用完！（' + this._attacksThisTurn + '/' + maxAttacks + '）');
        return;
      }

      // Multiplayer attack: auto-target in 2-player, select target in 3+ player
      if (card.cardType === 'attack' && this._isMultiplayer) {
        var alivePlayers = MediCard.GameState.players.filter(function(p) {
          return p.alive && p !== player;
        });
        if (alivePlayers.length === 1) {
          // 2-player game: auto-target the only opponent
          this._pendingAttackCardIndex = cardIndex;
          this._attackTargetIndex = MediCard.GameState.players.indexOf(alivePlayers[0]);
          this._doPlayAttackOnTarget();
        } else {
          // 3+ players: show target selection
          this._pendingAttackCardIndex = cardIndex;
          this._selectedCardIndex = -1;
          this._renderHand();
          this._updatePlayButton();
          document.getElementById('attack-target-prompt').style.display = 'block';
          this._flashPhase('🎯 请选择攻击目标（点击上方对手头像）');
        }
        return;
      }

      // Track played card
      this._playedCardsThisTurn.push(card);
      this._gameStats.cardsPlayed++;
      if (card.cardType === 'attack') this._attacksThisTurn++;
      this._log('card_played', '打出: ' + card.cardName + ' [' + card.cardType + ']');

      this._pendingCard = { card: card, index: cardIndex };
      var self = this;

      switch (card.cardType) {
        case 'attack':
          MediCard.Audio.playCardPlay(card.rarity);
          this._resolvePlayerAttack(card);
          break;
        case 'heal':
          MediCard.Audio.playCardPlay(card.rarity);
          MediCard.QuestionPopup.show(card, function(result) {
            self._onBasicCardAnswered(result, 'heal');
          }, '你');
          break;
        case 'tactic':
          MediCard.Audio.playCardPlay(card.rarity);
          MediCard.QuestionPopup.show(card, function(result) {
            self._onTacticAnswered(result);
          }, '你');
          break;
        case 'equipment':
          MediCard.Audio.playCardPlay(card.rarity);
          MediCard.QuestionPopup.show(card, function(result) {
            self._onEquipmentAnswered(result);
          }, '你');
          break;
        case 'delayed':
          MediCard.Audio.playCardPlay(card.rarity);
          MediCard.QuestionPopup.show(card, function(result) {
            self._onDelayedPlayAnswered(result);
          }, '你');
          break;
        default:
          this._selectedCardIndex = -1;
          this._pendingCard = null;
          this._renderHand();
      }
    },

    /* ============ Basic Card Resolution (Attack / Heal) ============ */

    _onBasicCardAnswered(result, type) {
      var card = result.card;
      var player = this._player;
      var idx = this._pendingCard.index;

      // Remove card from hand
      player.hand.splice(idx, 1);
      MediCard.GameState.discardPile.push(card);
      this._trackAnswer(result);

      var healed = 0;
      if (type === 'heal') {
        if (result.correct) {
          healed = MediCard.Resources.healDamage(player, 1);
          if (healed > 0) {
            MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, healed, 'heal');
            MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#10b981', 6);
            this._flashPhase('💚 治疗成功！恢复 ' + healed + ' 点生命值');
          } else {
            this._flashPhase('💚 生命值已满，无需治疗');
          }
        } else {
          this._flashPhase('❌ 答错了，治疗牌作废');
        }
      }

      // Multiplayer sync
      if (this._isMultiplayer && healed > 0) {
        var playerIdx2 = MediCard.GameState.players.indexOf(player);
        if (playerIdx2 < 0) playerIdx2 = 0;
        var hd = { cardIndex: idx, cardType: 'heal', healAmount: healed };
        if (this._isHost) {
          this._sendSync({ type: 'action_result', sourceIdx: playerIdx2, data: hd });
        } else {
          this._sendSync(hd);
        }
      }

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    /* ============ Attack Resolution (Player attacks AI) ============ */

    _resolvePlayerAttack(card) {
      var ai = this._aiPlayer;
      var player = this._player;

      // Simulate AI answering the attack question
      var correctChance = { easy: 0.3, normal: 0.55, hard: 0.75 }[this._difficulty] || 0.55;
      var aiAnsweredCorrectly = Math.random() < correctChance;

      // Remove card from hand
      player.hand.splice(this._pendingCard.index, 1);
      MediCard.GameState.discardPile.push(card);
      this._trackAnswer({ correct: !aiAnsweredCorrectly });

      if (aiAnsweredCorrectly) {
        this._flashPhase('🛡️ AI答对了！攻击被闪避');
        MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#3b82f6', 4);
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      // AI answered wrong → check if AI plays defense
      if (this._aiShouldDefend()) {
        this._aiAttemptDefense(card);
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        return;
      }

      // No defense → AI takes damage
      this._applyAttackDamageToAI();
      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    _aiShouldDefend() {
      var chance = { easy: 0.3, normal: 0.5, hard: 0.7 }[this._difficulty] || 0.5;
      var hasDefense = this._aiPlayer.hand.some(function(c) { return c.cardType === 'defense'; });
      return hasDefense && Math.random() < chance;
    },

    _aiAttemptDefense(attackCard) {
      var self = this;
      var ai = this._aiPlayer;

      var defIdx = -1;
      for (var i = 0; i < ai.hand.length; i++) {
        if (ai.hand[i].cardType === 'defense') { defIdx = i; break; }
      }

      if (defIdx < 0) {
        this._applyAttackDamageToAI();
        return;
      }

      var defCard = ai.hand[defIdx];
      var correctChance = { easy: 0.3, normal: 0.5, hard: 0.7 }[this._difficulty] || 0.5;
      var answeredCorrectly = Math.random() < correctChance;

      ai.hand.splice(defIdx, 1);
      MediCard.GameState.discardPile.push(defCard);

      if (answeredCorrectly) {
        this._flashPhase('🛡️ AI使用防御牌并答对 — 攻击被免疫！');
        MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#3b82f6', 4);
      } else {
        this._flashPhase('❌ AI防御失败 — 攻击继续生效');
        this._applyAttackDamageToAI();
      }

      this._attackInProgress = null;
      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
      this._flashOpponentHP();
    },

    _applyAttackDamageToAI() {
      var ai = this._aiPlayer;
      var player = this._player;

      // Build damage breakdown
      var parts = [];
      var baseDmg = 1;
      var bonus = 0;
      var armorReduction = 0;
      var weaponBonus = 0;
      var identityBonus = MediCard.IdentitySkills.getDamageBonus(player, ai);
      var attackPotionBonus = (player.attackBonus || 0);

      // Equipment bonus: 手术刀 +1 dmg
      if (player.equipment && player.equipment.weapon && player.equipment.weapon.cardSubtype === 'shouShuDao') {
        weaponBonus = 1;
      }

      bonus = identityBonus + weaponBonus + attackPotionBonus;
      var totalDmg = baseDmg + bonus;

      // Armor reduction: 白大褂 -1 dmg
      if (ai.equipment && ai.equipment.armor && ai.equipment.armor.cardSubtype === 'baiDaGua') {
        armorReduction = 1;
        totalDmg = Math.max(0, totalDmg - armorReduction);
      }

      var dmg = MediCard.Resources.dealDamage(ai, totalDmg);
      this._gameStats.damageDealt += dmg.actual;

      MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, dmg.actual, 'damage');
      MediCard.CardVisuals.screenShake();
      MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#ef4444', 6);
      MediCard.Audio.playDamage(dmg.actual, false);

      // Build clear damage formula
      parts.push('基础1');
      if (weaponBonus) parts.push('手术刀+1');
      if (identityBonus) parts.push('身份加成+' + identityBonus);
      if (attackPotionBonus) parts.push('药效+' + attackPotionBonus);
      if (armorReduction) parts.push('白大褂护甲-' + armorReduction);
      var formula = parts.join(' → ');
      var msg = '⚔️ 攻击命中！' + formula + ' = ' + dmg.actual + ' 点伤害';
      if (player.attackBonus > 0) msg = '💀 ' + msg;
      this._flashPhase(msg);
      this._log('damage_dealt', '对AI造成' + dmg.actual + '伤害, AI剩余HP:' + ai.resources.hp.current);

      if (!ai.alive) {
        this._log('ai_defeated', 'AI被击败');
        this._endGame();
      }
    },

    /* ============ Tactic Card Resolution ============ */

    _onTacticAnswered(result) {
      var card = result.card;
      var player = this._player;
      var idx = this._pendingCard.index;
      var playerIdx = MediCard.GameState.players.indexOf(player);
      if (playerIdx < 0) playerIdx = 0;

      player.hand.splice(idx, 1);
      MediCard.GameState.discardPile.push(card);
      this._trackAnswer(result);

      if (!result.correct) {
        this._flashPhase('❌ 答错了，锦囊作废');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      // 防护面罩 only blocks harmful tactics from opponents, not self-targeting tactics
      var selfTargeting = ['huiZhen','jiJiu','biaoBen','yaoXiao','mianYi','qunTi','duoJi'];
      if (!selfTargeting.includes(card.cardSubtype) && this._hasEquip(player, 'fangHu', 'accessory')) {
        this._flashPhase('😷 防护面罩免疫了锦囊效果');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      var self = this;
      switch (card.cardSubtype) {
        case 'huiZhen': // 会诊 - draw 2
          var drawn = MediCard.GameState.drawCards(playerIdx, 2);
          this._flashPhase('📋 会诊成功！摸了 ' + drawn.length + ' 张牌');
          MediCard.Audio.playCardDraw();
          break;
        case 'wuZhen': // 误诊 - AI discards 1
          if (this._aiPlayer.hand.length > 0) {
            if (this._hasEquip(this._aiPlayer, 'fangHu', 'accessory')) {
              this._flashPhase('😷 AI有防护面罩，误诊无效');
            } else {
              var rIdx = Math.floor(Math.random() * this._aiPlayer.hand.length);
              var discarded = this._aiPlayer.hand.splice(rIdx, 1)[0];
              MediCard.GameState.discardPile.push(discarded);
              this._flashPhase('❌ 误诊！AI弃了1张牌');
            }
          } else {
            this._flashPhase('❌ AI没有手牌可弃');
          }
          break;
        case 'geLi': // 隔离观察 - AI skip play
          if (this._hasEquip(this._aiPlayer, 'fangHu', 'accessory')) {
            this._flashPhase('😷 AI有防护面罩，隔离观察无效');
          } else {
            this._aiPlayer.skipNextPlayPhase = true;
            this._flashPhase('🚫 隔离观察！AI下回合不能出牌');
          }
          break;
        case 'jiJiu': // 急救 - heal when HP <= 1
          var h = MediCard.Resources.healDamage(player, 1);
          this._flashPhase(h > 0 ? '🚑 急救成功！恢复' + h + '点生命值' : '生命值已满');
          break;
        case 'biaoBen': // 标本检索 - peek top 3
          this._doBiaoBenPeek();
          return; // Don't clear pendingCard yet - handled by peek
        case 'yaoXiao': // 药效增强 - attack +1
          player.attackBonus = (player.attackBonus || 0) + 1;
          this._flashPhase('💊 药效增强！本回合攻击伤害+1（当前+' + player.attackBonus + '）');
          break;
        case 'mianYi': // 免疫屏障 - immune next turn
          player.immuneUntilNextTurn = true;
          this._flashPhase('🛡️ 免疫屏障！下回合免疫所有伤害');
          break;
        case 'qunTi': // 群体会诊 - no teammates in single player, draw 1 self
          var sd = MediCard.GameState.drawCards(playerIdx, 1);
          this._flashPhase('👥 群体会诊！（单人模式）摸了' + sd.length + '张牌');
          MediCard.Audio.playCardDraw();
          break;
        case 'duoJi': // 多重打击 - reset attack counter for this turn
          player.maxAttacks = (player.maxAttacks || 1) + 1;
          this._attacksThisTurn = 0;  // Reset used attacks
          this._flashPhase('⚡ 多重打击！本回合可攻击 ' + player.maxAttacks + ' 次');
          break;
        case 'jiaoCha': // 交叉感染 - all enemies take 1 dmg
          if (this._aiPlayer.alive) {
            var jcDmg = MediCard.Resources.dealDamage(this._aiPlayer, 1);
            this._gameStats.damageDealt += jcDmg.actual;
            MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, 1, 'damage');
            MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#ef4444', 4);
            this._flashPhase('🦠 交叉感染！AI受到1点伤害');
            if (!this._aiPlayer.alive) { this._endGame(); return; }
          }
          break;
        default:
          this._flashPhase('锦囊已使用');
      }

      // Multiplayer sync: broadcast card play + effect data
      if (this._isMultiplayer) {
        var sd = { cardIndex: idx, cardType: 'tactic', cardSubtype: card.cardSubtype };
        switch (card.cardSubtype) {
          case 'huiZhen': sd.drawCount = 2; break;
          case 'jiJiu': sd.healAmount = (typeof h !== 'undefined' ? h : 0); break;
          case 'yaoXiao': sd.attackBonusAdd = 1; break;
          case 'mianYi': sd.immuneNextTurn = true; break;
          case 'qunTi': sd.drawCount = 1; break;
          case 'wuZhen': sd.discardTargetCount = 1; sd.discardTargetIdx = 1; break;
          case 'geLi': sd.skipNextPlay = true; sd.skipTargetIdx = 1; break;
          case 'jiaoCha': sd.damageToAll = 1; break;
          case 'duoJi': sd.extraAttacks = 1; break;
        }
        if (this._isHost) {
          this._sendSync({ type: 'action_result', sourceIdx: playerIdx, data: sd });
        } else {
          this._sendSync(sd);
        }
      }

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    _doBiaoBenPeek() {
      var gs = MediCard.GameState;
      var peekCount = Math.min(3, gs.deck.length);
      if (peekCount === 0) {
        this._flashPhase('🔍 牌库已空，无法检索');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }
      var peeked = gs.deck.slice(-peekCount).reverse();
      var self = this;

      // Show peek UI in phase indicator area
      var phaseEl = document.getElementById('phase-indicator');
      if (!phaseEl) return;
      phaseEl.innerHTML = '🔍 标本检索 — 选择1张牌加入手牌：';
      var peekDiv = document.createElement('div');
      peekDiv.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;';
      peeked.forEach(function(c, i) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-primary';
        btn.style.cssText = 'min-width:60px;';
        var typeInfo = MediCard.CardData.getTypeInfo(c.cardType);
        btn.textContent = (typeInfo ? typeInfo.icon : '') + ' ' + (c.cardName || '牌');
        btn.addEventListener('click', function() {
          // Remove from deck and add to hand
          var actualIdx = gs.deck.length - 1 - i;
          var picked = gs.deck.splice(actualIdx, 1)[0];
          self._player.hand.push(picked);
          MediCard.Audio.playCardDraw();
          self._flashPhase('🔍 标本检索！获得了 ' + (picked.cardName || '卡牌'));
          self._pendingCard = null;
          self._selectedCardIndex = -1;
          self._updateDisplay();
        });
        peekDiv.appendChild(btn);
      });
      phaseEl.appendChild(peekDiv);
    },

    /* ============ Equipment Card Resolution ============ */

    _onEquipmentAnswered(result) {
      var card = result.card;
      var player = this._player;
      var idx = this._pendingCard.index;

      player.hand.splice(idx, 1);
      MediCard.GameState.discardPile.push(card);
      this._trackAnswer(result);

      if (!result.correct) {
        this._flashPhase('❌ 答错了，装备牌作废');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      var slot = card.equipSlot;
      if (!slot) {
        this._flashPhase('装备无效');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      var old = player.equipment[slot];
      if (old) {
        MediCard.GameState.discardPile.push(old);
      }
      player.equipment[slot] = card;
      var def = MediCard.Config.equipmentDefs[card.cardSubtype] || {};
      this._flashPhase((def.icon || '🔧') + ' 装备了 ' + card.cardName + (old ? '（替换）' : ''));
      MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#10b981', 6);

      // Multiplayer sync
      if (this._isMultiplayer) {
        var playerIdx3 = MediCard.GameState.players.indexOf(player);
        if (playerIdx3 < 0) playerIdx3 = 0;
        var ed = { cardIndex: idx, cardType: 'equipment', cardSubtype: card.cardSubtype, equipSlot: slot };
        if (this._isHost) {
          this._sendSync({ type: 'action_result', sourceIdx: playerIdx3, data: ed });
        } else {
          this._sendSync(ed);
        }
      }

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    /* ============ Delayed Card Play Resolution ============ */

    _onDelayedPlayAnswered(result) {
      var card = result.card;
      var player = this._player;
      var ai = this._aiPlayer;
      var idx = this._pendingCard.index;

      player.hand.splice(idx, 1);
      this._trackAnswer(result);

      if (!result.correct) {
        MediCard.GameState.discardPile.push(card);
        this._flashPhase('❌ 答错了，延时锦囊作废');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      // Check target immunity (疫苗接种)
      if (card.cardSubtype === 'yiMiao') {
        // 疫苗接种 is self-buff
        player.vaccineTurns = 3;
        MediCard.GameState.discardPile.push(card);
        this._flashPhase('💉 疫苗接种！3回合内免疫负面效果');
      } else {
        // Target opponent
        if (ai.vaccineTurns > 0) {
          MediCard.GameState.discardPile.push(card);
          this._flashPhase('💉 AI有疫苗接种保护，无法施加负面延时锦囊');
        } else {
          if (!ai.delayedTactics) ai.delayedTactics = [];
          ai.delayedTactics.push(card);
          this._flashPhase('⏳ 对AI使用了 ' + card.cardName + '！将在AI回合判定阶段触发');
        }
      }

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    /* ============ Response Phase (Player attacked by AI) ============ */

    _startResponsePhase(attackCard) {
      var self = this;
      this._attackInProgress = { card: attackCard, fromPlayer: false };
      this._turnActive = false;

      var responseEl = document.getElementById('response-zone');
      if (!responseEl) return;

      responseEl.style.display = 'flex';
      responseEl.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:16px;padding:12px;margin:8px 0;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;animation:pulse 1s ease-in-out infinite;';

      var hasDefense = this._player.hand.some(function(c) { return c.cardType === 'defense'; });

      responseEl.innerHTML = '' +
        '<span style="color:#fca5a5;font-weight:700;">⚠️ AI攻击你！</span>' +
        '<span id="response-timer" style="font-family:var(--font-mono);font-weight:700;font-size:16px;color:#fbbf24;">15</span>' +
        '<button class="btn btn-sm" id="btn-defend" style="background:rgba(59,130,246,0.3);border-color:#3b82f6;color:#93c5fd;" ' + (!hasDefense ? 'disabled' : '') + '>🛡️ 防御' + (!hasDefense ? '(无防御牌)' : '') + '</button>' +
        '<button class="btn btn-sm btn-ghost" id="btn-skip-defend">跳过</button>';

      var timeLeft = 15;
      var timerInterval = setInterval(function() {
        timeLeft--;
        var timerEl = document.getElementById('response-timer');
        if (timerEl) {
          timerEl.textContent = timeLeft;
          timerEl.style.color = timeLeft <= 5 ? 'var(--accent-red)' : '#fbbf24';
        }
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          self._onSkipDefend();
        }
      }, 1000);

      document.getElementById('btn-defend').addEventListener('click', function() {
        clearInterval(timerInterval);
        self._onPlayerDefend();
      });

      document.getElementById('btn-skip-defend').addEventListener('click', function() {
        clearInterval(timerInterval);
        self._onSkipDefend();
      });
    },

    _onPlayerDefend() {
      var responseEl = document.getElementById('response-zone');
      if (responseEl) { responseEl.style.display = 'none'; }

      var player = this._player;
      var defIdx = -1;
      for (var i = 0; i < player.hand.length; i++) {
        if (player.hand[i].cardType === 'defense') { defIdx = i; break; }
      }

      if (defIdx < 0) {
        this._onSkipDefend();
        return;
      }

      var defCard = player.hand[defIdx];
      var self = this;

      MediCard.Audio.playCardPlay(defCard.rarity);
      MediCard.QuestionPopup.show(defCard, function(result) {
        self._trackAnswer(result);
        self._player.hand.splice(defIdx, 1);
        MediCard.GameState.discardPile.push(defCard);

        if (result.correct) {
          self._flashPhase('🛡️ 防御成功！攻击被免疫');
          MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#3b82f6', 6);
        } else {
          self._flashPhase('❌ 防御失败，受到伤害');
          self._applyAIAttackDamage();
        }

        self._attackInProgress = null;
        self._turnActive = true;
        var cont = self._aiContinuePlay;
        self._aiContinuePlay = null;
        self._updateDisplay();
        if (cont && self._aiPlayer.alive && self._player.alive) {
          setTimeout(cont, 600);
        }
      }, '你');
    },

    _onSkipDefend() {
      var responseEl = document.getElementById('response-zone');
      if (responseEl) { responseEl.style.display = 'none'; }

      this._applyAIAttackDamage();
      this._attackInProgress = null;
      this._turnActive = true;

      var cont = this._aiContinuePlay;
      this._aiContinuePlay = null;
      this._updateDisplay();
      if (cont && this._aiPlayer.alive && this._player.alive) {
        setTimeout(cont, 600);
      }
    },

    _applyAIAttackDamage() {
      var ai = this._aiPlayer;
      var player = this._player;

      // Build damage breakdown
      var parts = [];
      var baseDmg = 1;
      var bonus = 0;
      var armorReduction = 0;
      var weaponBonus = 0;
      var identityBonus = MediCard.IdentitySkills.getDamageBonus(ai, player);
      var attackPotionBonus = (ai.attackBonus || 0);

      // AI equipment bonus
      if (ai.equipment && ai.equipment.weapon && ai.equipment.weapon.cardSubtype === 'shouShuDao') {
        weaponBonus = 1;
      }

      bonus = identityBonus + weaponBonus + attackPotionBonus;
      var totalDmg = baseDmg + bonus;

      // Player armor
      if (player.equipment && player.equipment.armor && player.equipment.armor.cardSubtype === 'baiDaGua') {
        armorReduction = 1;
        totalDmg = Math.max(0, totalDmg - armorReduction);
      }
      // Player immunity
      if (player.immuneUntilNextTurn) {
        player.immuneUntilNextTurn = false;
        this._flashPhase('🛡️ 免疫屏障挡住了伤害！');
        this._log('immunity_blocked', '免疫屏障挡住AI攻击');
        return;
      }
      var dmg = MediCard.Resources.dealDamage(player, totalDmg);
      this._gameStats.damageTaken += dmg.actual;

      MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, dmg.actual, 'damage');
      MediCard.CardVisuals.screenShake();
      MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#ef4444', 6);
      MediCard.Audio.playDamage(dmg.actual, false);

      // Build clear damage formula
      parts.push('基础1');
      if (weaponBonus) parts.push('手术刀+1');
      if (identityBonus) parts.push('身份加成+' + identityBonus);
      if (attackPotionBonus) parts.push('药效+' + attackPotionBonus);
      if (armorReduction) parts.push('白大褂护甲-' + armorReduction);
      var formula = parts.join(' → ');
      this._flashPhase('💔 AI攻击命中！' + formula + ' = ' + dmg.actual + ' 点伤害');
      this._log('damage_taken', '玩家受到' + dmg.actual + '伤害, 剩余HP:' + player.resources.hp.current);

      if (!player.alive) {
        this._log('player_defeated', '玩家被击败');
        this._endGame();
      }
    },

    /* ============ End Turn & Discard Phase ============ */

    _endTurn() {
      var gs = MediCard.GameState;
      var victory = MediCard.Victory.check(gs.players);
      if (victory) {
        this._endGame(victory);
        return;
      }

      this._turnActive = false;
      // Reset player's attack bonus
      this._player.attackBonus = 0;

      var player = this._player;
      var limit = MediCard.Resources.getHandLimit(player);
      var excess = player.hand.length - limit;

      if (this._isMultiplayer) {
        // Multiplayer: discard phase then advance turn
        var self = this;
        var doEnd = function() {
          if (!self._isHost) {
            // Client: send end turn to host, wait for sync
            MediCard.NetworkClient.sendEndTurn();
            self._turnActive = false;
            self._updateDisplay();
          } else {
            self._continueNewTurn();
          }
        };
        if (excess > 0) {
          this._startDiscardPhase(excess, doEnd);
        } else {
          doEnd();
        }
        return;
      }

      // Single player
      if (excess > 0) {
        this._startDiscardPhase(excess, function() {
          this._executeAITurn();
        }.bind(this));
      } else {
        this._executeAITurn();
      }
    },

    _startDiscardPhase(excess, callback) {
      var self = this;
      this._pendingDiscard = { needed: excess, callback: callback };
      this._isDiscardPhase = true;
      this._selectedDiscardIndices = [];

      var phaseEl = document.getElementById('phase-indicator');
      if (phaseEl) {
        phaseEl.textContent = '💔 弃牌阶段：请选择 ' + excess + ' 张牌后点击弃牌按钮';
        phaseEl.style.color = 'var(--accent-yellow)';
      }

      // Update play button to discard button
      this._updateDiscardButton();

      var handEl = document.getElementById('player-hand');
      if (handEl) {
        handEl.style.outline = '2px solid var(--accent-yellow)';
        handEl.style.borderRadius = '8px';
      }

      this._renderDiscardHand();
    },

    _renderDiscardHand() {
      var container = document.getElementById('player-hand');
      if (!container) return;
      var player = this._player;
      var self = this;

      container.innerHTML = '';
      container.className = 'hand-cards';

      var count = player.hand.length;
      var isMobile = window.innerWidth <= 480;
      var maxAngle = isMobile ? (count > 4 ? 20 : 25) : 35;
      var totalAngle = Math.min(count * (isMobile ? 3 : 5), maxAngle);
      var startAngle = -totalAngle / 2;
      var angleStep = count > 1 ? totalAngle / (count - 1) : 0;
      var liftMult = isMobile ? 1.4 : 2;

      player.hand.forEach(function(card, idx) {
        var cardEl = MediCard.CardVisuals.createCardElement(card);
        var angle = startAngle + angleStep * idx;
        var translateY = Math.abs(angle) * liftMult;

        cardEl.style.setProperty('--fan-angle', angle + 'deg');
        cardEl.style.setProperty('--fan-lift', translateY + 'px');
        cardEl.style.setProperty('--fan-idx', idx + 1);

        // Highlight selected cards
        if (self._selectedDiscardIndices.indexOf(idx) >= 0) {
          cardEl.style.setProperty('--fan-angle', '0deg');
          cardEl.style.setProperty('--fan-lift', '-20px');
          cardEl.style.setProperty('--fan-scale', '1.05');
          cardEl.style.setProperty('--fan-idx', '50');
          cardEl.style.boxShadow = '0 0 14px rgba(251,191,36,0.6)';
          cardEl.style.outline = '2px solid var(--accent-yellow)';
        }

        cardEl.addEventListener('click', function(e) {
          e.stopPropagation();
          var dIdx = self._selectedDiscardIndices.indexOf(idx);
          if (dIdx >= 0) {
            self._selectedDiscardIndices.splice(dIdx, 1);
          } else {
            self._selectedDiscardIndices.push(idx);
          }
          self._renderDiscardHand();
          self._updateDiscardButton();
        });

        container.appendChild(cardEl);
      });
    },

    /* ============ AI Turn ============ */

    _executeAITurn() {
      var self = this;
      var gs = MediCard.GameState;
      var ai = this._aiPlayer;
      var player = this._player;

      if (!ai.alive || !player.alive) {
        this._startNewTurn();
        return;
      }

      // Reset AI per-turn bonuses
      ai.attackBonus = 0;
      ai.maxAttacks = 1;

      // Switch to AI turn
      gs.currentPlayerIndex = 1;
      this._updateDisplay();
      document.getElementById('turn-indicator').textContent = 'AI 回合 — 等待中...';
      document.getElementById('phase-indicator').textContent = '判定阶段...';

      // === Judgment Phase ===
      this._runAIJudgment(function() {
        // === Draw Phase ===
        // Decrement vaccine turns
        if (ai.vaccineTurns > 0) ai.vaccineTurns--;
        // AI lord heal
        MediCard.IdentitySkills.applyTurnStartEffects(ai);
        // Draw 2 (+1 if spy)
        var extraDraw = MediCard.IdentitySkills.getExtraDraw(ai);
        gs.drawCards(1, 2 + extraDraw);
        MediCard.Audio.playCardDraw();

        // === Check skip (麻醉剂) ===
        if (ai.skipNextTurn) {
          ai.skipNextTurn = false;
          document.getElementById('phase-indicator').textContent = 'AI被麻醉，跳过回合';
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 1000);
          return;
        }

        // === Play Phase ===
        if (ai.skipNextPlayPhase) {
          ai.skipNextPlayPhase = false;
          document.getElementById('phase-indicator').textContent = 'AI被隔离观察，跳过出牌阶段';
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 800);
          return;
        }

        document.getElementById('phase-indicator').textContent = 'AI 正在思考...';
        self._updateDisplay();
        setTimeout(function() { self._playAICards(); }, 800);
      });
    },

    _runAIJudgment(callback) {
      var ai = this._aiPlayer;
      if (!ai.delayedTactics || ai.delayedTactics.length === 0) {
        callback();
        return;
      }

      var self = this;
      var dt = ai.delayedTactics.slice(); // Copy
      ai.delayedTactics = [];

      function processNext() {
        if (dt.length === 0) {
          callback();
          return;
        }
        var card = dt.shift();
        // AI answers delayed tactic
        var correctChance = { easy: 0.3, normal: 0.55, hard: 0.75 }[self._difficulty] || 0.55;
        var answeredCorrectly = Math.random() < correctChance;

        if (answeredCorrectly) {
          self._flashPhase('⚖️ AI判定成功！' + (card.cardName || '延时') + '被化解');
          MediCard.GameState.discardPile.push(card);
          setTimeout(processNext, 400);
        } else {
          var effect = MediCard.CardEffects.resolveDelayedTactic(card, ai, false);
          self._flashPhase(effect.message);
          MediCard.GameState.discardPile.push(card);
          if (effect.lethal) {
            self._endGame();
            return;
          }
          setTimeout(processNext, 600);
        }
      }
      processNext();
    },

    _playAICards() {
      var self = this;
      var gs = MediCard.GameState;
      var ai = this._aiPlayer;
      var player = this._player;
      var correctChance = { easy: 0.3, normal: 0.55, hard: 0.75 }[this._difficulty] || 0.55;
      var delay = 700;

      var aiAttacksThisTurn = 0;

      function playNextAICard() {
        if (!ai.alive || !player.alive || ai.hand.length === 0) {
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 600);
          return;
        }

        // Pick a playable card (non-defense for normal play)
        var playableIndices = [];
        for (var i = 0; i < ai.hand.length; i++) {
          var c = ai.hand[i];
          if (c.cardType === 'defense') continue;
          // 急救 only if HP <= 1
          if (c.cardSubtype === 'jiJiu' && ai.resources.hp.current > 1) continue;
          // Limit attacks per AI turn
          var aiMaxAtt = ai.maxAttacks || 1;
          if (c.cardType === 'attack' && aiAttacksThisTurn >= aiMaxAtt) continue;
          playableIndices.push(i);
        }

        if (playableIndices.length === 0) {
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 600);
          return;
        }

        var idx = playableIndices[Math.floor(Math.random() * playableIndices.length)];
        var card = ai.hand[idx];

        // Remove from hand
        ai.hand.splice(idx, 1);

        switch (card.cardType) {
          case 'attack':
            aiAttacksThisTurn++;
            document.getElementById('phase-indicator').textContent = 'AI 使用攻击牌 — 你来答题！';
            self._updateDisplay();
            MediCard.Audio.playCardPlay(card.rarity);
            MediCard.QuestionPopup.show(card, function(result) {
              self._trackAnswer(result);
              gs.discardPile.push(card);
              if (result.correct) {
                self._flashPhase('🛡️ 你答对了！AI攻击被闪避');
                MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#3b82f6', 4);
                self._updateDisplay();
                setTimeout(playNextAICard, delay);
              } else {
                document.getElementById('phase-indicator').textContent = '答错了！你可以使用防御牌';
                self._updateDisplay();
                self._startResponsePhase(card);
                self._aiContinuePlay = playNextAICard;
              }
            }, '你');
            break;

          case 'heal':
            var healCorrect = Math.random() < correctChance;
            gs.discardPile.push(card);
            if (healCorrect) {
              var healed = MediCard.Resources.healDamage(ai, 1);
              if (healed > 0) {
                document.getElementById('phase-indicator').textContent = 'AI治疗成功！+1HP';
                MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, healed, 'heal');
                MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#10b981', 3);
              }
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，治疗牌作废';
            }
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
            break;

          case 'tactic':
            gs.discardPile.push(card);
            var tacCorrect = Math.random() < correctChance;
            if (tacCorrect) {
              self._resolveAITactic(card, ai, player);
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，锦囊作废';
            }
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
            break;

          case 'equipment':
            gs.discardPile.push(card);
            var eqCorrect = Math.random() < correctChance;
            if (eqCorrect) {
              var slot = card.equipSlot;
              if (slot) {
                var old = ai.equipment[slot];
                if (old) gs.discardPile.push(old);
                ai.equipment[slot] = card;
                document.getElementById('phase-indicator').textContent = 'AI装备了 ' + card.cardName;
                MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#10b981', 4);
              }
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，装备作废';
            }
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
            break;

          case 'delayed':
            gs.discardPile.push(card);
            var dlyCorrect = Math.random() < correctChance;
            if (dlyCorrect) {
              if (card.cardSubtype === 'yiMiao') {
                ai.vaccineTurns = 3;
                document.getElementById('phase-indicator').textContent = 'AI使用了疫苗接种！';
              } else {
                if (player.vaccineTurns > 0) {
                  document.getElementById('phase-indicator').textContent = '玩家有疫苗保护，AI延时锦囊无效';
                } else {
                  if (!player.delayedTactics) player.delayedTactics = [];
                  player.delayedTactics.push(card);
                  document.getElementById('phase-indicator').textContent = 'AI对玩家使用了 ' + card.cardName;
                }
              }
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，延时锦囊作废';
            }
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
            break;

          default:
            gs.discardPile.push(card);
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
        }
      }

      playNextAICard();
    },

    _resolveAITactic(card, ai, player) {
      switch (card.cardSubtype) {
        case 'huiZhen':
          var drawn = MediCard.GameState.drawCards(1, 2);
          document.getElementById('phase-indicator').textContent = 'AI会诊！摸了' + drawn.length + '张牌';
          break;
        case 'wuZhen':
          if (player.hand.length > 0 && !this._hasEquip(player, 'fangHu', 'accessory')) {
            var rIdx = Math.floor(Math.random() * player.hand.length);
            var discarded = player.hand.splice(rIdx, 1)[0];
            MediCard.GameState.discardPile.push(discarded);
            document.getElementById('phase-indicator').textContent = 'AI误诊！你弃了1张牌';
          } else {
            document.getElementById('phase-indicator').textContent = 'AI误诊失败';
          }
          break;
        case 'geLi':
          if (!this._hasEquip(player, 'fangHu', 'accessory')) {
            player.skipNextPlayPhase = true;
            document.getElementById('phase-indicator').textContent = 'AI隔离观察！你下回合不能出牌';
          }
          break;
        case 'jiJiu':
          MediCard.Resources.healDamage(ai, 1);
          document.getElementById('phase-indicator').textContent = 'AI急救！恢复1点血';
          break;
        case 'biaoBen':
          if (MediCard.GameState.deck.length > 0) {
            var peekCount = Math.min(3, MediCard.GameState.deck.length);
            var peeked = MediCard.GameState.deck.slice(-peekCount);
            // AI picks random one
            var pickIdx = Math.floor(Math.random() * peeked.length);
            var picked = peeked[pickIdx];
            var actualIdx = MediCard.GameState.deck.length - 1 - pickIdx;
            ai.hand.push(MediCard.GameState.deck.splice(actualIdx, 1)[0]);
            document.getElementById('phase-indicator').textContent = 'AI标本检索！获得了卡牌';
          }
          break;
        case 'yaoXiao':
          ai.attackBonus = (ai.attackBonus || 0) + 1;
          document.getElementById('phase-indicator').textContent = 'AI药效增强！攻击伤害+1';
          break;
        case 'mianYi':
          ai.immuneUntilNextTurn = true;
          document.getElementById('phase-indicator').textContent = 'AI免疫屏障！下回合免疫伤害';
          break;
        case 'duoJi':
          ai.maxAttacks = (ai.maxAttacks || 1) + 1;
          document.getElementById('phase-indicator').textContent = 'AI多重打击！本回合可攻击' + ai.maxAttacks + '次';
          break;
        case 'jiaoCha':
          var dmg = MediCard.Resources.dealDamage(player, 1);
          this._gameStats.damageTaken += dmg.actual;
          MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, 1, 'damage');
          MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#ef4444', 3);
          document.getElementById('phase-indicator').textContent = 'AI交叉感染！你受到1点伤害';
          if (!player.alive) { this._endGame(); }
          break;
      }
    },

    /* ============ New Turn (Player) ============ */

    _startNewTurn() {
      var player = this._player;
      var gs = MediCard.GameState;

      // Switch to player turn
      gs.currentPlayerIndex = 0;
      this._turnActive = true;

      // Check victory
      var victory = MediCard.Victory.check(gs.players);
      if (victory) {
        this._endGame(victory);
        return;
      }

      // === Judgment Phase for Player ===
      var self = this;
      var dt = player.delayedTactics || [];
      player.delayedTactics = [];
      if (dt.length > 0) {
        this._runPlayerJudgment(dt, 0, function() {
          self._continueNewTurn();
        });
      } else {
        this._continueNewTurn();
      }
    },

    _runPlayerJudgment(delayedCards, idx, callback) {
      var self = this;
      var player = this._player;
      if (idx >= delayedCards.length) { callback(); return; }

      var card = delayedCards[idx];
      // Player needs to answer the delayed tactic question
      MediCard.QuestionPopup.show(card, function(result) {
        self._trackAnswer(result);
        if (result.correct) {
          self._flashPhase('⚖️ 判定成功！' + (card.cardName || '延时') + '被化解');
          MediCard.GameState.discardPile.push(card);
        } else {
          var effect = MediCard.CardEffects.resolveDelayedTactic(card, player, false);
          self._flashPhase(effect.message);
          MediCard.GameState.discardPile.push(card);
          if (effect.lethal) { self._endGame(); return; }
        }
        self._runPlayerJudgment(delayedCards, idx + 1, callback);
      }, '你');
    },

    _continueNewTurn() {
      var self = this;
      var gs = MediCard.GameState;

      if (this._isMultiplayer) {
        // Multiplayer: cycle to next alive player
        var prevPlayerIdx = gs.currentPlayerIndex;
        gs.nextPlayer();
        var cp = gs.getCurrentPlayer();
        if (!cp || !cp.alive) {
          this._endGame();
          return;
        }
        this._turnActive = true;
        this._isDiscardPhase = false;
        this._selectedCardIndex = -1;
        this._selectedDiscardIndices = [];
        this._pendingCard = null;
        this._attackInProgress = null;
        this._playedCardsThisTurn = [];
        this._attacksThisTurn = 0;
        this._attackTargetIndex = -1;
        this._pendingAttackCardIndex = -1;
        if (cp.maxAttacks === undefined) cp.maxAttacks = 1;
        if (cp.attackBonus === undefined) cp.attackBonus = 0;

        // Apply turn start effects
        if (cp.vaccineTurns > 0) cp.vaccineTurns--;
        if (cp.skipNextTurn) {
          cp.skipNextTurn = false;
          this._flashPhase('💉 ' + cp.name + ' 的回合被跳过');
          setTimeout(function() { self._continueNewTurn(); }, 1000);
          return;
        }
        MediCard.IdentitySkills.applyTurnStartEffects(cp);
        var extraDraw = MediCard.IdentitySkills.getExtraDraw(cp);
        gs.drawCards(gs.currentPlayerIndex, 2 + extraDraw);

        // Sync turn change to other players (only if local player initiated)
        if (!this._skipSyncBroadcast) {
          this._sendSync({
            type: 'turn_change',
            prevPlayerIndex: prevPlayerIdx,
            currentPlayerIndex: gs.currentPlayerIndex,
            deckCount: gs.deck.length,
            currentHand: cp.hand.slice(),
            players: gs.players.map(function(p) {
              return { hp: p.resources.hp.current, maxHp: p.resources.hp.max, mp: p.resources.mp.current, alive: p.alive, handCount: p.hand.length };
            })
          });
        }
        this._skipSyncBroadcast = false;

        if (gs.currentPlayerIndex === this._myPlayerIndex) {
          this._player = cp;
          this._updateDisplay();
        } else {
          this._updateDisplay();
          // AI or remote player turn — wait for their actions
          if (cp.isAI) {
            setTimeout(function() { self._executeAITurn(); }, 1200);
          }
        }
        return;
      }

      // Single player mode
      var player = this._player;
      var ai = this._aiPlayer;

      // Decrement vaccine turns
      if (player.vaccineTurns > 0) player.vaccineTurns--;

      // Check skip (麻醉剂)
      if (player.skipNextTurn) {
        player.skipNextTurn = false;
        this._flashPhase('💉 麻醉剂生效！你的回合被跳过');
        MediCard.GameState.currentPlayerIndex = 0;
        this._turnActive = false;
        setTimeout(function() { self._executeAITurnQuick(); }, 800);
        return;
      }

      // Apply lord heal
      MediCard.IdentitySkills.applyTurnStartEffects(player);

      // Draw 2 cards (+1 if spy) — always draw even when hand is full
      var extraDraw = MediCard.IdentitySkills.getExtraDraw(player);
      var handLimit = MediCard.Resources.getHandLimit(player);
      var drawn = gs.drawCards(0, 2 + extraDraw);
      if (drawn.length > 0) MediCard.Audio.playCardDraw();

      // Reset attack bonus
      player.attackBonus = 0;

      // 听诊器 - peek opponent card
      if (player.equipment && player.equipment.tool && player.equipment.tool.cardSubtype === 'tingZhenQi') {
        var aiHand = ai.hand;
        if (aiHand.length > 0) {
          var peekCard = aiHand[Math.floor(Math.random() * aiHand.length)];
          this._flashPhase('🩺 听诊器探查：AI有1张 ' + (peekCard.cardName || '卡牌'));
        }
      }

      this._selectedCardIndex = -1;
      this._selectedDiscardIndices = [];
      this._pendingCard = null;
      this._attackInProgress = null;
      this._playedCardsThisTurn = [];
      this._attacksThisTurn = 0;
      player.maxAttacks = 1;

      this._log('turn_start', '玩家回合开始, HP:' + player.resources.hp.current + ', 手牌:' + player.hand.length);

      if (!player.alive) {
        this._endGame();
        return;
      }

      // If hand exceeds limit after drawing, force discard phase immediately
      if (player.hand.length > handLimit) {
        this._flashPhase('📥 摸了' + drawn.length + '张牌 (手牌' + player.hand.length + '/' + handLimit + '，请弃牌)');
        var self = this;
        this._startDiscardPhase(player.hand.length - handLimit, function() {
          self._updateDisplay();
          var turnEl = document.getElementById('turn-indicator');
          if (turnEl) turnEl.textContent = '你的回合';
          var phaseEl = document.getElementById('phase-indicator');
          if (phaseEl) { phaseEl.style.color = ''; phaseEl.textContent = '选择卡牌出牌'; }
        });
        return;
      }

      this._updateDisplay();
      var turnEl = document.getElementById('turn-indicator');
      if (turnEl) turnEl.textContent = '你的回合';
      var phaseEl = document.getElementById('phase-indicator');
      if (phaseEl) phaseEl.textContent = '选择卡牌出牌';
    },

    // Quick AI turn with no play (when player turn skipped)
    _executeAITurnQuick() {
      var self = this;
      var gs = MediCard.GameState;
      var ai = this._aiPlayer;
      gs.currentPlayerIndex = 1;
      this._updateDisplay();

      // Just draw for AI, no play (quick turnaround)
      if (ai.vaccineTurns > 0) ai.vaccineTurns--;
      gs.drawCards(1, 2);
      self._enforceHandLimit(ai);
      self._updateDisplay();
      setTimeout(function() { self._startNewTurn(); }, 600);
    },

    /* ============ Game End ============ */

    _endGame(preChecked) {
      var gs = MediCard.GameState;
      var victory = preChecked || MediCard.Victory.check(gs.players);
      var myIdentity = this._player.identity;
      var won = false;
      var winnerIdentity = null;

      if (victory) {
        winnerIdentity = victory.winner;
        won = MediCard.Victory.isPlayerWin(myIdentity, victory.winner);
      } else {
        won = this._player.alive;
        winnerIdentity = won ? myIdentity : (myIdentity === 'lord' ? 'rebel' : 'lord');
      }

      if (won) { MediCard.Audio.playVictory(); } else { MediCard.Audio.playDefeat(); }

      // Save detailed game stats + debug log
      var totalQ = this._gameStats.questionsAnswered;
      var accuracy = totalQ > 0 ? Math.round(this._gameStats.correctAnswers / totalQ * 100) : 0;
      this._log('game_end', '游戏结束, 模式:' + (this._isMultiplayer ? '多人' : '单人') + ', 胜利:' + won + ', 正确率:' + accuracy + '%');
      MediCard.Storage.saveGameStats({
        won: won,
        accuracy: accuracy,
        accuracyDetail: this._gameStats.correctAnswers + '/' + this._gameStats.questionsAnswered,
        damageDealt: this._gameStats.damageDealt,
        damageTaken: this._gameStats.damageTaken,
        cardsPlayed: this._gameStats.cardsPlayed,
        subjects: Array.from(MediCard.GameState.selectedSubjects),
        date: new Date().toISOString(),
        difficulty: this._difficulty,
        mode: this._isMultiplayer ? 'multiplayer' : 'single',
        playerCount: gs.players.length,
        debugLog: this._debugLog.slice(-200)
      });

      MediCard.GameState.goToScreen('result');
      this._turnActive = false;
    },

    /* ============ Helpers ============ */

    _trackAnswer(result) {
      this._gameStats.questionsAnswered++;
      if (result.correct) this._gameStats.correctAnswers++;
      this._log('answer', (result.correct ? '✓正确' : '✗错误') + ' #' + this._gameStats.questionsAnswered);
    },

    /* ============ Debug Logging ============ */

    _log(action, detail) {
      var entry = {
        time: new Date().toISOString(),
        action: action,
        detail: detail,
        turn: MediCard.GameState.currentPlayerIndex,
        playerHP: this._player && this._player.resources ? this._player.resources.hp.current : 0,
        aiHP: this._aiPlayer && this._aiPlayer.resources ? this._aiPlayer.resources.hp.current : 0
      };
      this._debugLog.push(entry);
      // Auto-refresh debug panel if visible
      var panel = document.getElementById('debug-panel');
      if (panel && panel.style.display === 'block') {
        this._renderDebugLog();
      }
    },

    /** Dump debug log to console for bug hunting */
    dumpDebugLog() {
      console.log('=== MediCard Debug Log ===');
      this._debugLog.forEach(function(e, i) {
        console.log('[' + i + '] ' + e.time.substr(11, 12) + ' ' + e.action + ': ' + e.detail + ' | P:' + e.playerHP + ' AI:' + e.aiHP);
      });
      console.log('=== End Debug Log (' + this._debugLog.length + ' entries) ===');
    },

    _hasEquip(player, subtype, slot) {
      return player.equipment && player.equipment[slot] && player.equipment[slot].cardSubtype === subtype;
    },

    /** Flash opponent HP bar red to show damage was taken */
    _flashOpponentHP: function() {
      var zoneEl;
      if (this._isMultiplayer) {
        var targetIdx = this._attackTargetIndex >= 0 ? this._attackTargetIndex : 1;
        zoneEl = document.getElementById('mp-opponent-' + targetIdx);
      } else {
        zoneEl = document.getElementById('opponent-zone');
      }
      if (!zoneEl) return;
      zoneEl.style.transition = 'none';
      zoneEl.style.boxShadow = '0 0 20px rgba(239,68,68,0.6)';
      zoneEl.style.background = 'rgba(239,68,68,0.15)';
      setTimeout(function() {
        zoneEl.style.transition = 'all 0.5s ease';
        zoneEl.style.boxShadow = '';
        zoneEl.style.background = '';
      }, 100);
    },

    _updateDisplay() {
      if (MediCard.GameState.screen !== 'playing') return;
      var gs = MediCard.GameState;
      var isMyTurn = this._isMultiplayer
        ? (gs.currentPlayerIndex === this._myPlayerIndex)
        : (gs.currentPlayerIndex === 0);

      this._renderHand();
      MediCard.PlayerPanel.render(this._player, 'player-status', false);
      this._renderEquipment(this._player, 'player-equip-zone');
      this._renderDelayed(this._player, 'player-delayed-zone');

      if (this._isMultiplayer) {
        this._updateMultiplayerOpponents();
      } else {
        MediCard.PlayerPanel.render(this._aiPlayer, 'opponent-zone', true);
        this._renderEquipment(this._aiPlayer, 'opponent-equip-zone');
        this._renderDelayed(this._aiPlayer, 'opponent-delayed-zone');
      }

      var deckEl = document.getElementById('deck-count');
      if (deckEl) deckEl.textContent = gs.deck.length;
      var discEl = document.getElementById('discard-count');
      if (discEl) discEl.textContent = gs.discardPile.length;

      var turnEl = document.getElementById('turn-indicator');
      var currentPlayer = gs.getCurrentPlayer();
      if (turnEl) {
        turnEl.textContent = isMyTurn ? '你的回合' : ((currentPlayer ? currentPlayer.name : '对手') + ' 回合 — 等待中...');
      }

      var actionsEl = document.getElementById('player-actions');
      if (actionsEl) {
        actionsEl.style.opacity = isMyTurn && this._turnActive ? '1' : '0.4';
        actionsEl.style.pointerEvents = isMyTurn && this._turnActive ? 'auto' : 'none';
      }
      var handEl = document.getElementById('player-hand');
      if (handEl) {
        handEl.style.opacity = isMyTurn && this._turnActive ? '1' : '0.5';
        handEl.style.pointerEvents = isMyTurn && this._turnActive ? 'auto' : 'none';
      }

      this._updateHandLimit();
      this._updatePlayButton();
      this._updatePlayedCardsIndicator();
    },

    /** Update opponent panels in multiplayer mode */
    _updateMultiplayerOpponents: function() {
      var gs = MediCard.GameState;
      for (var i = 0; i < gs.players.length; i++) {
        if (i === this._myPlayerIndex) continue;
        var p = gs.players[i];
        var el = document.getElementById('mp-opponent-' + i);
        if (!el) continue;
        var hp = p.resources && p.resources.hp ? p.resources.hp : { current: 0, max: 0 };
        var identityInfo = p.identityInfo || MediCard.IdentityData.getIdentityInfo(p.identity) || {};
        var isTarget = (i === this._attackTargetIndex);
        el.className = 'multiplayer-opponent' + (isTarget ? ' attack-target' : '') + (p.alive ? '' : ' dead');
        el.innerHTML =
          '<span style="background:' + (identityInfo.color || '#64748b') + ';width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:8px;">' + (identityInfo.icon || '👤') + '</span>' +
          '<span style="flex:1;font-weight:600;">' + MediCard.Crypto.escapeHtml(p.name || '玩家') + '</span>' +
          '<span style="font-size:13px;color:' + (hp.current <= 1 ? '#ef4444' : '#10b981') + ';">❤️' + hp.current + '/' + hp.max + '</span>' +
          '<span style="font-size:10px;margin-left:6px;color:var(--text-muted);">🃏' + p.hand.length + '</span>' +
          (p.equipment && (p.equipment.weapon || p.equipment.armor) ? '<span style="margin-left:4px;">🔧</span>' : '');
      }
    },

    _updateHandLimit() {
      var el = document.getElementById('hand-limit');
      var player = this._player;
      var limit = MediCard.Resources.getHandLimit(player);
      var current = player.hand.length;

      if (!el) return;
      el.textContent = '🃏 手牌: ' + current + '/' + limit + '（上限=生命值）';
      el.className = 'hand-limit-indicator';
      if (current >= limit) {
        el.className += ' full';
        el.textContent = '🃏 手牌已满: ' + current + '/' + limit;
      } else if (current >= limit - 1) {
        el.className += ' warning';
      }
    },

    _enforceHandLimit(player) {
      var limit = MediCard.Resources.getHandLimit(player);
      while (player.hand.length > limit) {
        var removed = player.hand.pop();
        MediCard.GameState.discardPile.push(removed);
      }
    },

    _renderDebugLog() {
      var el = document.getElementById('debug-log-content');
      if (!el) return;
      var recent = this._debugLog.slice(-50).reverse();
      var html = '';
      recent.forEach(function(e) {
        var color = '#64748b';
        if (e.action === 'damage_dealt') color = '#ef4444';
        else if (e.action === 'damage_taken') color = '#f97316';
        else if (e.action === 'card_played') color = '#06b6d4';
        else if (e.action === 'answer') color = e.detail.indexOf('正确') >= 0 ? '#10b981' : '#ef4444';
        else if (e.action === 'turn_start') color = '#fbbf24';
        else if (e.action === 'game_end') color = '#a855f7';
        html += '<div style="font-size:10px;padding:1px 0;border-bottom:1px solid rgba(255,255,255,0.03);color:' + color + ';">' +
          '[' + e.time.substr(11, 12) + '] <b>' + e.action + '</b>: ' + e.detail +
          ' <span style="opacity:0.4;">P:' + e.playerHP + ' AI:' + e.aiHP + '</span>' +
          '</div>';
      });
      el.innerHTML = html || '<div style="font-size:11px;color:var(--text-muted);">暂无日志</div>';
    },

    /** Show usage hint for selected card */
    _showCardHint: function(card) {
      var el = document.getElementById('card-hint');
      if (!el) return;
      if (!card) {
        el.style.display = 'none';
        return;
      }
      var howToUse = '';
      switch (card.cardType) {
        case 'attack': howToUse = '⚔️ 打出后<strong>对手答题</strong>，答错受到伤害'; break;
        case 'defense': howToUse = '🛡️ 被攻击时打出，<strong>你答题</strong>，答对免疫伤害'; break;
        case 'heal': howToUse = '💚 打出后<strong>你答题</strong>，答对恢复1点生命值'; break;
        case 'tactic': howToUse = '📋 打出后<strong>你答题</strong>，答对效果生效 — ' + (card.cardEffect || ''); break;
        case 'equipment': howToUse = '🔧 打出后<strong>你答题</strong>，答对装备到对应槽位'; break;
        case 'delayed': howToUse = '⏳ 打出后<strong>你答题</strong>，答对贴到对手身上，判定阶段对手答题决定是否触发'; break;
        default: howToUse = card.cardEffect || '';
      }
      el.innerHTML = '💡 用法：' + howToUse;
      el.style.display = 'block';
    },

    _flashPhase(message) {
      var phaseEl = document.getElementById('phase-indicator');
      if (!phaseEl) return;
      phaseEl.textContent = message;
      phaseEl.style.color = 'var(--accent-yellow)';
      var self = this;
      setTimeout(function() {
        if (phaseEl) {
          phaseEl.style.color = '';
          if (MediCard.GameState.currentPlayerIndex === 0) {
            phaseEl.textContent = '选择卡牌出牌';
          } else {
            phaseEl.textContent = 'AI 正在思考...';
          }
        }
      }, 2000);
    },

    _attachEvents() {
      var self = this;
      var btnPlay = document.getElementById('btn-play-card');
      var btnEnd = document.getElementById('btn-end-turn');
      var btnSurrender = document.getElementById('btn-surrender');
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;

      if (btnPlay) {
        btnPlay.addEventListener('click', function() {
          if (MediCard.GameState.currentPlayerIndex !== myIdx) return;
          if (self._isDiscardPhase) {
            self._onDiscardButton();
          } else {
            self._onPlayButton();
          }
        });
      }

      if (btnEnd) {
        btnEnd.addEventListener('click', function() {
          if (MediCard.GameState.currentPlayerIndex === myIdx && self._turnActive && !self._attackInProgress) {
            self._playedCardsThisTurn = [];
            self._endTurn();
            self._renderHand();
          }
        });
      }

      if (btnSurrender) {
        btnSurrender.addEventListener('click', function() {
          if (confirm('确定要投降吗？')) {
            self._player.alive = false;
            self._player.resources.alive = false;
            self._player.resources.hp.current = 0;
            // Sync surrender in multiplayer
            if (self._isMultiplayer) {
              if (self._isHost) {
                self._onRemoteSurrender(self._myPlayerIndex);
              } else {
                MediCard.NetworkClient.send(MediCard.SyncProtocol.pack(
                  MediCard.SyncProtocol.MessageType.SURRENDER,
                  { playerIdx: self._myPlayerIndex }
                ));
              }
            }
            self._endGame();
          }
        });
      }

      // Debug panel toggle
      var btnDebug = document.getElementById('btn-debug-toggle');
      var btnDebugClose = document.getElementById('btn-debug-close');
      if (btnDebug) {
        btnDebug.addEventListener('click', function() {
          var panel = document.getElementById('debug-panel');
          if (panel) {
            var visible = panel.style.display === 'block';
            panel.style.display = visible ? 'none' : 'block';
            if (!visible) self._renderDebugLog();
          }
        });
      }
      if (btnDebugClose) {
        btnDebugClose.addEventListener('click', function() {
          var panel = document.getElementById('debug-panel');
          if (panel) panel.style.display = 'none';
        });
      }

      // Keyboard shortcut: Ctrl+Shift+D to dump debug log
      document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          self.dumpDebugLog();
          alert('调试日志已输出到浏览器控制台 (F12 → Console)');
        }
      });
    },

    /* ============ Play / Discard Buttons ============ */


    /** Attach multiplayer-specific events (target selection etc.) */
    _attachMultiplayerEvents: function() {
      var self = this;
      // Opponent click for attack targeting
      var opponents = document.querySelectorAll('.multiplayer-opponent');
      for (var i = 0; i < opponents.length; i++) {
        opponents[i].addEventListener('click', function() {
          var playerIdx = parseInt(this.getAttribute('data-player-index'), 10);
          if (isNaN(playerIdx)) return;
          var gs = MediCard.GameState;
          var target = gs.players[playerIdx];
          if (!target || !target.alive) return;

          if (self._pendingAttackCardIndex >= 0) {
            // Selecting target for attack
            self._attackTargetIndex = playerIdx;
            document.getElementById('attack-target-prompt').style.display = 'none';
            self._doPlayAttackOnTarget();
          }
        });
      }

      // ESC to cancel target selection
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (self._pendingAttackCardIndex >= 0) {
            self._pendingAttackCardIndex = -1;
            self._attackTargetIndex = -1;
            document.getElementById('attack-target-prompt').style.display = 'none';
            self._updateDisplay();
          }
        }
      });
    },

    /** Execute attack on selected target in multiplayer — sends intent to host, defender answers */
    _doPlayAttackOnTarget: function() {
      var cardIdx = this._pendingAttackCardIndex;
      var targetIdx = this._attackTargetIndex;
      var self = this;

      this._pendingAttackCardIndex = -1;
      this._attackTargetIndex = -1;
      this._selectedCardIndex = -1;
      var promptEl = document.getElementById('attack-target-prompt');
      if (promptEl) promptEl.style.display = 'none';

      var card = this._player.hand[cardIdx];
      if (!card) { this._updateDisplay(); return; }

      var target = MediCard.GameState.players[targetIdx];
      if (!target || !target.alive) { this._updateDisplay(); return; }

      this._log('card_played', '攻击 ' + (card.cardName || '卡牌') + ' → ' + target.name);

      // Set guard to prevent playing another card while waiting for defend answer
      this._attackInProgress = { type: 'waiting_defend', cardIndex: cardIdx };

      if (this._isHost) {
        // Host handles directly
        this._handleAttackIntent(this._myPlayerIndex, cardIdx, targetIdx);
      } else {
        // Client sends intent to host
        this._sendSync({
          type: 'attack_intent',
          cardIndex: cardIdx,
          targetIdx: targetIdx
        });
        this._flashPhase('🎯 等待对手答题...');
      }
    },

    /** Host: process an attack intent from any player */
    _handleAttackIntent: function(attackerIdx, cardIndex, targetIdx) {
      var gs = MediCard.GameState;
      var attacker = gs.players[attackerIdx];
      var defender = gs.players[targetIdx];
      if (!attacker || !defender || !attacker.alive || !defender.alive) return;

      var card = attacker.hand[cardIndex];
      if (!card) return;

      // Remove card from attacker's hand on host
      attacker.hand.splice(cardIndex, 1);

      // Store attack context
      this._attackInProgress = {
        type: 'attack',
        card: card,
        attacker: attacker,
        defender: defender,
        attackerIndex: attackerIdx,
        defenderIndex: targetIdx,
        cardIndex: cardIndex
      };

      var self = this;
      if (defender === gs.players[this._myPlayerIndex]) {
        // Host IS the defender — answer locally
        this._flashPhase('🛡️ ' + attacker.name + ' 对你使用' + (card.cardName || '杀') + '！请答题');
        MediCard.QuestionPopup.show(card, function(result) {
          self._trackAnswer(result);
          self._resolveDefendAnswer(result.correct);
        }, '你');
      } else {
        // Defender is a remote client — send question to them
        var conns = MediCard.NetworkHost._connections;
        // defender client index: player 0=host, player 1=conns[0], player 2=conns[1]
        var clientIdx = targetIdx - 1;
        if (clientIdx >= 0 && clientIdx < conns.length && conns[clientIdx].open) {
          conns[clientIdx].send(MediCard.SyncProtocol.pack(
            MediCard.SyncProtocol.MessageType.DEFEND_QUESTION,
            { card: card, attackerName: attacker.name }
          ));
          this._flashPhase('🎯 等待 ' + defender.name + ' 答题...');
        }
      }
      this._updateDisplay();
    },

    /** Client: show defend question received from host */
    _onDefendQuestion: function(data) {
      var card = data.card;
      var self = this;
      this._flashPhase('🛡️ ' + data.attackerName + ' 对你使用' + (card.cardName || '杀') + '！请答题');
      MediCard.QuestionPopup.show(card, function(result) {
        self._trackAnswer(result);
        // Send answer back to host
        MediCard.NetworkClient.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.DEFEND_ANSWER,
          { correct: result.correct }
        ));
        self._flashPhase('⏳ 等待结果...');
      }, '你');
    },

    /** Host: resolve defend answer and broadcast result */
    _resolveDefendAnswer: function(defenderCorrect) {
      var ctx = this._attackInProgress;
      if (!ctx) return;
      this._attackInProgress = null;

      var inflictedDamage = 0;
      if (defenderCorrect) {
        this._flashPhase('🛡️ ' + ctx.defender.name + ' 答对了！攻击被闪避');
      } else {
        // Calculate damage
        var damage = 1;
        var parts = ['基础1'];
        var attacker = ctx.attacker;
        var defender = ctx.defender;

        if (attacker.attackBonus > 0) {
          damage += attacker.attackBonus;
          parts.push('加成+' + attacker.attackBonus);
        }
        if (attacker.equipment && attacker.equipment.weapon && attacker.equipment.weapon.cardSubtype === 'shouShuDao') {
          damage += 1;
          parts.push('手术刀+1');
        }
        if (attacker.identity === 'rebel' && defender.identity === 'lord') {
          damage += 1;
          parts.push('反贼+1');
        }
        if (defender.equipment && defender.equipment.armor && defender.equipment.armor.cardSubtype === 'baiDaGua') {
          damage = Math.max(1, damage - 1);
          parts.push('白大褂-1');
        }

        inflictedDamage = damage;
        defender.resources.hp.current = Math.max(0, defender.resources.hp.current - damage);
        this._gameStats.damageDealt += damage;
        this._log('damage_dealt', attacker.name + '→' + defender.name + ' ' + parts.join(' → ') + ' = ' + damage + '伤害');

        var defName = MediCard.Crypto.escapeHtml(defender.name);
        this._flashPhase('⚔️ ' + defName + ' 受到 ' + damage + ' 点伤害！(' + parts.join(' → ') + ' = ' + damage + ')');

        try { MediCard.Audio.playDamage(damage, damage >= 3); } catch(e) {}

        if (defender.resources.hp.current <= 0) {
          defender.alive = false;
          this._flashPhase('💀 ' + defName + ' 被击败！');
        }
      }

      // Broadcast result to all clients
      if (this._isMultiplayer) {
        this._sendSync({
          type: 'action_result',
          sourceIdx: ctx.attackerIndex,
          data: {
            cardType: 'attack',
            cardIndex: ctx.cardIndex,
            targetIdx: ctx.defenderIndex,
            damage: inflictedDamage,
            defenderAlive: ctx.defender.alive,
            defenderCorrect: defenderCorrect
          }
        });
      }

      this._attacksThisTurn++;
      MediCard.GameState.discardPile.push(ctx.card);
      this._updateDisplay();

      // Check game over
      if (!ctx.defender.alive) {
        var self = this;
        var victory = MediCard.Victory.check(MediCard.GameState.players);
        if (victory) {
          setTimeout(function() { self._endGame(victory); }, 1500);
        }
      }
    },
    _onPlayButton() {
      if (!this._turnActive) return;
      if (this._isMultiplayer && MediCard.GameState.currentPlayerIndex !== this._myPlayerIndex) return;
      if (!this._isMultiplayer && MediCard.GameState.currentPlayerIndex !== 0) return;
      if (this._attackInProgress) return;
      if (this._selectedCardIndex < 0) return;

      var card = this._player.hand[this._selectedCardIndex];
      if (!card) return;
      if (card.cardType === 'defense') {
        this._flashPhase('🛡️ 防御牌只能在被攻击时使用');
        this._selectedCardIndex = -1;
        this._renderHand();
        this._updatePlayButton();
        return;
      }

      this._tryPlayCard(this._selectedCardIndex);
      this._updatePlayButton();
      this._updatePlayedCardsIndicator();
    },

    _onDiscardButton() {
      if (!this._isDiscardPhase || !this._pendingDiscard) return;

      var selected = this._selectedDiscardIndices.slice().sort(function(a, b) { return b - a; });
      if (selected.length === 0) {
        this._flashPhase('💔 请先选择要弃置的卡牌');
        return;
      }

      for (var i = 0; i < selected.length; i++) {
        var idx = selected[i];
        var card = this._player.hand[idx];
        this._player.hand.splice(idx, 1);
        MediCard.GameState.discardPile.push(card);
        this._pendingDiscard.needed--;
      }

      this._selectedDiscardIndices = [];
      var handEl = document.getElementById('player-hand');
      if (handEl) handEl.style.outline = '';

      if (this._pendingDiscard.needed <= 0) {
        this._isDiscardPhase = false;
        var cb = this._pendingDiscard.callback;
        this._pendingDiscard = null;
        var phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) { phaseEl.style.color = ''; phaseEl.textContent = 'AI 正在思考...'; }
        this._updatePlayButton();
        this._renderHand();
        cb();
      } else {
        var phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) phaseEl.textContent = '💔 还需弃置 ' + this._pendingDiscard.needed + ' 张牌';
        this._updateDiscardButton();
        this._renderDiscardHand();
        var hEl = document.getElementById('player-hand');
        if (hEl) {
          hEl.style.outline = '2px solid var(--accent-yellow)';
          hEl.style.borderRadius = '8px';
        }
      }
    },

    _updatePlayButton() {
      var btn = document.getElementById('btn-play-card');
      if (!btn) return;
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;
      var isMyTurn = MediCard.GameState.currentPlayerIndex === myIdx && this._turnActive && !this._attackInProgress;
      var hasSelection = this._selectedCardIndex >= 0;

      if (this._isDiscardPhase) {
        this._updateDiscardButton();
        return;
      }

      btn.textContent = '🃏 出牌';
      btn.className = 'btn btn-play-card';
      btn.disabled = !(isMyTurn && hasSelection);
      if (btn.disabled) {
        btn.style.opacity = '0.5';
      } else {
        btn.style.opacity = '1';
      }
    },

    _updateDiscardButton() {
      var btn = document.getElementById('btn-play-card');
      if (!btn) return;
      var count = this._selectedDiscardIndices.length;
      btn.textContent = '🗑️ 弃牌' + (count > 0 ? ' (' + count + ')' : '');
      btn.className = 'btn btn-discard';
      btn.disabled = count === 0;
      btn.style.opacity = count > 0 ? '1' : '0.5';
    },

    _updatePlayedCardsIndicator() {
      var el = document.getElementById('played-cards-indicator');
      if (!el) return;
      var count = this._playedCardsThisTurn.length;
      if (count === 0) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      var labels = this._playedCardsThisTurn.map(function(c) {
        var typeInfo = MediCard.CardData.getTypeInfo(c.cardType);
        return (typeInfo ? typeInfo.icon : '🃏') + ' ' + (c.cardName || '卡牌');
      });
      el.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">本回合已出牌:</span> ' +
        '<span style="font-size:12px;font-weight:600;color:var(--accent-cyan);">' + labels.join(', ') + '</span>';
    },

  };

  // Slot name/icon helpers
  function _slotName(slot) {
    var names = { weapon: '武器', armor: '防具', accessory: '饰品', mount: '坐骑', tool: '工具' };
    return names[slot] || slot;
  }
  function _slotIcon(slot) {
    var icons = { weapon: '🔪', armor: '👨‍⚕️', accessory: '😷', mount: '🚑', tool: '🩺' };
    return icons[slot] || '⬡';
  }

  window.MediCard = MediCard;
})();
