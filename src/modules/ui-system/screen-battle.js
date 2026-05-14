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
    _jueshaPlayedThisTurn: false,  // max 1 绝杀 per turn
    _duelInProgress: null,        // { attacker, defender, card, iteration, answerCount }
    _juedouDefending: null,      // { attacker, defender, iteration } — AI vs player 决斗
    _turnCount: 0,               // track turn count for turn-proportional effects (e.g. 雷电牌)
    _debugLog: [],
    // Game stats tracking
    _gameStats: { questionsAnswered: 0, correctAnswers: 0, score: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 },
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
    _lastSentAction: 0,           // rate-limit: timestamp of last action sent
    _lastProcessedMsgId: null,    // dedup: last processed message ID (playerIdx:cardIndex)

    /* ============ Multiplayer Helpers ============ */

    /** Get the first alive opponent (player != self). Returns { player, index } or null. */
    _getFirstOpponent: function() {
      var gs = MediCard.GameState;
      for (var i = 0; i < gs.players.length; i++) {
        if (i !== this._myPlayerIndex && gs.players[i].alive) {
          return { player: gs.players[i], index: i };
        }
      }
      return null;
    },

    /** Get all alive opponents (player != self). Returns [{ player, index }]. */
    _getAllOpponents: function() {
      var gs = MediCard.GameState;
      var result = [];
      for (var i = 0; i < gs.players.length; i++) {
        if (i !== this._myPlayerIndex && gs.players[i].alive) {
          result.push({ player: gs.players[i], index: i });
        }
      }
      return result;
    },

    /* ============ Init ============ */

    init() {
      var gs = MediCard.GameState;
      gs.init();

      // Global click handler to dismiss equipment popup
      var self = this;
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.equipment-card.equipped')) {
          self._removeEquipmentPopup();
        }
      });

      // Load difficulty from storage
      this._difficulty = MediCard.Storage.get('difficulty', 'normal');

      // Snapshot multiplayer state before reset
      var isMulti = this._isMultiplayer && this._multiplayerPlayers;
      var mpPlayers = this._multiplayerPlayers;
      var mpDeck = this._multiplayerDeck;
      var mpTotalPlayers = this._multiplayerTotalPlayers;
      var mpIsHost = this._isHost;
      this._isMultiplayer = false;
      this._isHost = false;
      this._multiplayerPlayers = null;
      this._multiplayerDeck = null;

      // Check for multiplayer mode (set by lobby)
      if (isMulti) {
        this._isMultiplayer = true;
        this._isHost = mpIsHost;
        this._multiplayerPlayers = mpPlayers;
        this._multiplayerDeck = mpDeck;
        this._multiplayerTotalPlayers = mpTotalPlayers;
        this._initMultiplayer(gs);
        return;
      }

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

      // Load subjects async, then build deck when ready
      var self = this;
      var selectedIds = Array.from(MediCard.QuestionLoader._selectedSubjects);
      if (selectedIds.length === 0) {
        selectedIds = MediCard.Config.subjectCategories[0].subjects;
        MediCard.QuestionLoader.init(selectedIds);
      }

      // Show brief loading state in battlefield
      var screen = document.getElementById('screen-battle');
      if (screen) {
        screen.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:16px;">⏳ 正在加载题库...</div>';
      }

      MediCard.QuestionLoader.onReady(function() {
        self._finishInit(gs, selectedIds);
      });
    },

    /** Second half of init — runs after subject data is loaded */
    _finishInit: function(gs, selectedIds) {
      var deck = MediCard.CardData.generateFullDeck(selectedIds, MediCard.QuestionLoader);
      if (!deck || deck.length === 0) {
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
      this._responseTimer = null;
      this._pendingDiscard = null;
      this._aiContinuePlay = null;
      this._turnActive = true;
      this._isDiscardPhase = false;
      this._playedCardsThisTurn = [];
      this._attacksThisTurn = 0;
      this._jueshaPlayedThisTurn = false;
      this._duelInProgress = null;
      this._juedouDefending = null;
      this._debugLog = [];
      this._attackTargetIndex = -1;
      this._pendingAttackCardIndex = -1;
      this._turnCount = 0;

      // Reset game stats
      this._gameStats = { questionsAnswered: 0, correctAnswers: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 };
      this._log('game_start', '游戏开始, 难度:' + this._difficulty);

      // BattleLogger init for single player
      if (MediCard.BattleLogger) {
        MediCard.BattleLogger.init(false, 0, false);
        MediCard.BattleLogger.wrap(this, '_updatePlayButton',
          function() {
            var s = MediCard.ScreenBattle;
            var gs = MediCard.GameState;
            MediCard.BattleLogger.log('STATE_CHANGE', 'update_play_button', '',
              { cardSelected: s._selectedCardIndex >= 0, currentPlayerIndex: gs.currentPlayerIndex });
          },
          null
        );
      }

      // Now that everything is ready, render the battle screen
      this.render();
    },

    /** Initialize multiplayer mode from lobby data */
    _initMultiplayer: function(gs) {
      if (MediCard.MultiplayerAdapter) MediCard.MultiplayerAdapter.anchorLog('lobby', 'battle', 'game_start');
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
      this._duelInProgress = null;
      this._juedouDefending = null;
      this._turnActive = true;
      this._isDiscardPhase = false;
      this._playedCardsThisTurn = [];
      this._attacksThisTurn = 0;
      this._debugLog = [];
      this._attackTargetIndex = -1;
      this._pendingAttackCardIndex = -1;
      this._skipSyncBroadcast = false;
      this._turnCount = 0;

      this._gameStats = { questionsAnswered: 0, correctAnswers: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 };
      this._log('game_start', '多人游戏开始, 玩家数:' + gs.players.length);

      // BattleLogger init for multiplayer
      if (MediCard.BattleLogger) {
        MediCard.BattleLogger.init(true, this._myPlayerIndex, this._isHost);
        MediCard.BattleLogger.wrap(this, '_updatePlayButton',
          function() {
            var s = MediCard.ScreenBattle;
            var gs = MediCard.GameState;
            MediCard.BattleLogger.log('STATE_CHANGE', 'update_play_button', '',
              { cardSelected: s._selectedCardIndex >= 0, currentPlayerIndex: gs.currentPlayerIndex });
          },
          null
        );
      }

      this._setupMultiplayerSync();
      this.render();
    },

    /* ============ Multiplayer P2P Sync ============ */

    _setupMultiplayerSync: function() {
      var self = this;
      var gs = MediCard.GameState;

      if (this._isHost) {
        // Host: remove lobby-phase handlers, install battle-phase handlers
        var conns = MediCard.NetworkHost._connections;
        for (var ci = 0; ci < conns.length; ci++) {
          (function(conn, clientIdx) {
            // [SYNC] Strip old lobby handlers to prevent triple-processing
            if (typeof conn.off === 'function') { conn.off('data'); }
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
                    if (msg.d.isJuesha) {
                      self._resolveMpJueshaAnswer(msg.d.correct);
                    } else if (msg.d.isJuedou) {
                      self._resolveMpJuedouAnswer(msg.d.correct);
                    } else {
                      self._resolveDefendAnswer(msg.d.correct);
                    }
                  }
                  break;
                case MediCard.SyncProtocol.MessageType.SURRENDER:
                  self._onRemoteSurrender(clientIdx);
                  break;
                case MediCard.SyncProtocol.MessageType.TIME_EXTEND_VOTE:
                  self._onTimeExtendVote(clientIdx, msg.d);
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

        // Periodic connection health check — detect dropped clients
        var dropCheckInterval = setInterval(function() {
          if (!self._isHost || !MediCard.GameState.players) return;
          var conns = MediCard.NetworkHost && MediCard.NetworkHost._connections;
          if (!conns) return;
          var gs = MediCard.GameState;
          for (var ci = 0; ci < conns.length; ci++) {
            var playerIdx = ci + 1; // host is always player 0
            if (!conns[ci].open && gs.players[playerIdx] && gs.players[playerIdx].alive) {
              gs.players[playerIdx].alive = false;
              if (MediCard.MultiplayerAdapter) MediCard.MultiplayerAdapter.anchorLog(
                'player_alive', 'player_disconnected', 'drop_check_p' + playerIdx);
              self._logAction('🔌 ' + (gs.players[playerIdx].name || '玩家' + (playerIdx + 1)) + ' 连接断开');
              self._flashPhase('🔌 ' + (gs.players[playerIdx].name || '一名玩家') + ' 断开连接');
              self._sendSync({ type: 'player_disconnected', targetIdx: playerIdx });
              self._updateDisplay();
              self._checkGameEnd();
            }
          }
        }, 5000);
        this._dropCheckInterval = dropCheckInterval;
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
            } else if (msg.t === MediCard.SyncProtocol.MessageType.TIME_EXTEND_GRANTED) {
              self._onTimeExtendGranted(msg.d);
            }
          });
        }
      }
    },

    /** Send a sync event to all other players */
    _sendSync: function(data) {
      // Rate-limit: prevent rapid-fire sends (<500ms between client actions)
      if (!this._isHost && Date.now() - this._lastSentAction < 500) return;
      this._lastSentAction = Date.now();

      if (MediCard.BattleLogger) MediCard.BattleLogger.log('NETWORK', 'send_sync', data.type || 'unknown', { isHost: this._isHost });

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
      // Dedup: skip duplicate messages (same player + card index)
      var msgId = playerIdx + ':' + (data.cardIndex != null ? data.cardIndex : '') + ':' + (data.type || '');
      if (msgId === this._lastProcessedMsgId) return;
      this._lastProcessedMsgId = msgId;

      var gs = MediCard.GameState;
      if (gs.currentPlayerIndex !== playerIdx) return;
      var player = gs.players[playerIdx];
      if (!player || !player.alive) return;

      // Offensive intent: route by card type
      if (data.type === 'attack_intent' || data.type === 'offensive_intent') {
        var ct = data.cardType || 'attack';
        if (ct === 'juesha') {
          this._handleJueshaMpIntent(playerIdx, data.cardIndex, data.targetIdx);
        } else if (ct === 'juedou') {
          this._handleJuedouMpIntent(playerIdx, data.cardIndex, data.targetIdx);
        } else {
          this._handleAttackIntent(playerIdx, data.cardIndex, data.targetIdx);
        }
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
      // Organ removal (器官摘除)
      if (data.cardSubtype === 'qiGuanZhaiChu' && data.targetIdx != null) {
        var qgTarget = gs.players[data.targetIdx];
        if (qgTarget && qgTarget.alive) {
          if (data.qgMode === 'equipment' && data.qgEquipSlot && qgTarget.equipment) {
            var oldEq = qgTarget.equipment[data.qgEquipSlot];
            if (oldEq) { qgTarget.equipment[data.qgEquipSlot] = null; gs.discardPile.push(oldEq); }
          } else if (data.qgMode === 'hand' && qgTarget.hand && data.qgHandIdx >= 0 && data.qgHandIdx < qgTarget.hand.length) {
            gs.discardPile.push(qgTarget.hand.splice(data.qgHandIdx, 1)[0]);
          }
        }
      }
      // Sample collection (样本采集)
      if (data.cardSubtype === 'yangBenCaiJi' && data.targetIdx != null) {
        var ybSrc = gs.players[data.targetIdx];
        var ybActor = gs.players[playerIdx];
        if (ybSrc && ybSrc.alive && ybActor && ybActor.alive) {
          if (data.ybMode === 'equipment' && data.ybEquipSlot && ybSrc.equipment) {
            var stolenEq = ybSrc.equipment[data.ybEquipSlot];
            if (stolenEq) {
              ybSrc.equipment[data.ybEquipSlot] = null;
              var oldEq = ybActor.equipment[data.ybEquipSlot];
              if (oldEq) gs.discardPile.push(oldEq);
              ybActor.equipment[data.ybEquipSlot] = stolenEq;
            }
          } else if (data.ybMode === 'hand' && ybSrc.hand && data.ybHandIdx >= 0 && data.ybHandIdx < ybSrc.hand.length) {
            ybActor.hand.push(ybSrc.hand.splice(data.ybHandIdx, 1)[0]);
          }
        }
      }
      // Thunder point (雷电牌) chain judgment
      if (data.cardSubtype === 'leiDian' && data.targetIdx != null && data.ldChosen !== undefined) {
        var ldTarget = gs.players[data.targetIdx];
        var ldSrc = gs.players[playerIdx];
        var srcName = (ldSrc && ldSrc.name) || '对手';
        var tgtName = (ldTarget && ldTarget.name) || '玩家';
        if (data.ldMatch && ldTarget && ldTarget.alive) {
          var ldDmg = MediCard.CardEffects.applyDamage(ldTarget, data.ldDamage || 3);
          this._logAction('⚡ ' + srcName + ' 雷电牌击中 ' + tgtName + '！数字[' + data.ldRolled + ']，' + ldDmg + '伤害');
          if (data.sourceIdx !== this._myPlayerIndex) this._flashPhase('⚡ 雷电牌击中 ' + tgtName + '！数字' + data.ldRolled);
        } else {
          this._logAction('⚡ 雷电牌判定 ' + tgtName + '：[' + data.ldRolled + '] ≠ [' + data.ldChosen + ']');
        }
        if (ldTarget && !ldTarget.alive) this._checkGameEnd();
      }

      this._updateDisplay();
      // Broadcast result to all clients
      this._sendSync({ type: 'action_result', sourceIdx: playerIdx, data: data });
    },

    /** Host: handle end turn from a remote client */
    _onRemoteEndTurn: function(playerIdx) {
      var gs = MediCard.GameState;
      if (gs.currentPlayerIndex !== playerIdx) {
        console.warn('[Battle] _onRemoteEndTurn ignored: gs.currentPlayerIndex=' + gs.currentPlayerIndex + ' !== playerIdx=' + playerIdx);
        if (MediCard.BattleLogger) MediCard.BattleLogger.log('SYSTEM', 'remote_end_turn_ignored',
          'currentPlayerIndex=' + gs.currentPlayerIndex + ' !== playerIdx=' + playerIdx);
        return;
      }
      console.log('[Battle] _onRemoteEndTurn: playerIdx=' + playerIdx + ' ending turn, advancing via _continueNewTurn');
      this._continueNewTurn();
    },

    /** Host: handle answer from remote client */
    _onRemoteAnswer: function(playerIdx, data) {
      // Forward answer result to all clients
      this._sendSync({ type: 'answer_result', sourceIdx: playerIdx, correct: data.correct });
    },

    /** Host: handle surrender from remote client */
    /** Host: handle time-extension vote from a client */
    _onTimeExtendVote: function(clientIdx, data) {
      if (!data || !data.questionId) return;
      var VE = MediCard.TimerCalculator && MediCard.TimerCalculator.VoteExtender;
      if (!VE) return;

      var result = VE.vote(data.questionId, data.playerId || ('c' + clientIdx));
      if (!result || result.alreadyVoted) return;

      // Broadcast vote count to all clients for UI sync
      this._sendSync({
        type: 'time_extend_vote_sync',
        questionId: data.questionId,
        state: VE.getState(data.questionId)
      });

      if (result.reached) {
        var bonus = result.bonus;
        // Apply locally
        if (MediCard.QuestionPopup && MediCard.QuestionPopup.applyTimeExtension) {
          MediCard.QuestionPopup.applyTimeExtension(data.questionId, bonus);
        }
        // Broadcast to all clients
        var conns = MediCard.NetworkHost._connections;
        var pkt = MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.TIME_EXTEND_GRANTED,
          { questionId: data.questionId, bonus: bonus, extensionCount: result.extensionsGranted }
        );
        for (var i = 0; i < conns.length; i++) {
          if (conns[i].open) conns[i].send(pkt);
        }
      }
    },

    /** Client: apply time extension granted by host */
    _onTimeExtendGranted: function(data) {
      if (!data || !data.questionId) return;
      if (MediCard.QuestionPopup && MediCard.QuestionPopup.applyTimeExtension) {
        MediCard.QuestionPopup.applyTimeExtension(data.questionId, data.bonus);
      }
    },

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
            var isOffensiveAction = (data.data.cardType === 'attack' || data.data.cardType === 'juesha' || data.data.cardType === 'juedou');
            if (isOffensiveAction && data.data.damage > 0) {
              var target = gs.players[data.data.targetIdx];
              if (target && target.alive) {
                target.resources.hp.current = Math.max(0, target.resources.hp.current - data.data.damage);
                if (target.resources.hp.current <= 0) {
                  target.alive = false;
                }
              }
            }
            // Card removal: skip for our own non-attack actions (already removed locally),
            // but DO remove for our own offensive actions (delayed removal via host confirmation)
            var isOwnAction = data.sourceIdx === this._myPlayerIndex;
            if (!isOwnAction || isOffensiveAction) {
              if (data.data.cardIndex < (p.hand ? p.hand.length : 0)) {
                p.hand.splice(data.data.cardIndex, 1);
              }
            }
            if (data.data.healAmount && p.alive) {
              p.resources.hp.current = Math.min(p.resources.hp.max, p.resources.hp.current + data.data.healAmount);
            }
            // Organ removal (器官摘除)
            if (data.data.cardSubtype === 'qiGuanZhaiChu' && data.data.targetIdx != null) {
              var qgt = gs.players[data.data.targetIdx];
              if (qgt && qgt.alive) {
                if (data.data.qgMode === 'equipment' && data.data.qgEquipSlot && qgt.equipment) {
                  var oldE = qgt.equipment[data.data.qgEquipSlot];
                  if (oldE) { qgt.equipment[data.data.qgEquipSlot] = null; gs.discardPile.push(oldE); }
                } else if (data.data.qgMode === 'hand' && qgt.hand && data.data.qgHandIdx >= 0 && data.data.qgHandIdx < qgt.hand.length) {
                  gs.discardPile.push(qgt.hand.splice(data.data.qgHandIdx, 1)[0]);
                }
              }
              // Show notification on other players' screens
              if (data.sourceIdx !== this._myPlayerIndex) {
                var srcName = (p && p.name) || '对手';
                var tgtName = (qgt && qgt.name) || '对手';
                if (data.data.qgMode === 'equipment') {
                  this._flashPhase('🫁 ' + srcName + ' 器官摘除了 ' + tgtName + ' 的装备');
                  this._logAction(srcName + ' 器官摘除了 ' + tgtName + ' 的装备');
                } else {
                  this._flashPhase('🫁 ' + srcName + ' 器官摘除了 ' + tgtName + ' 的1张手牌');
                  this._logAction(srcName + ' 器官摘除了 ' + tgtName + ' 的1张手牌');
                }
              }
            }
            // Sample collection (样本采集)
            if (data.data.cardSubtype === 'yangBenCaiJi' && data.data.targetIdx != null) {
              var ybs = gs.players[data.data.targetIdx];
              var yba = p; // the actor
              if (ybs && ybs.alive && yba && yba.alive) {
                if (data.data.ybMode === 'equipment' && data.data.ybEquipSlot && ybs.equipment) {
                  var se = ybs.equipment[data.data.ybEquipSlot];
                  if (se) {
                    ybs.equipment[data.data.ybEquipSlot] = null;
                    var oe = yba.equipment[data.data.ybEquipSlot];
                    if (oe) gs.discardPile.push(oe);
                    yba.equipment[data.data.ybEquipSlot] = se;
                  }
                } else if (data.data.ybMode === 'hand' && ybs.hand && data.data.ybHandIdx >= 0 && data.data.ybHandIdx < ybs.hand.length) {
                  yba.hand.push(ybs.hand.splice(data.data.ybHandIdx, 1)[0]);
                }
              }
              // Show notification on other players' screens
              if (data.sourceIdx !== this._myPlayerIndex) {
                var ybSrcName = (p && p.name) || '对手';
                var ybTgtName2 = (ybs && ybs.name) || '对手';
                if (data.data.ybMode === 'equipment') {
                  this._flashPhase('🧪 ' + ybSrcName + ' 样本采集了 ' + ybTgtName2 + ' 的装备');
                  this._logAction(ybSrcName + ' 样本采集了 ' + ybTgtName2 + ' 的装备');
                } else {
                  this._flashPhase('🧪 ' + ybSrcName + ' 样本采集了 ' + ybTgtName2 + ' 的1张手牌');
                  this._logAction(ybSrcName + ' 样本采集了 ' + ybTgtName2 + ' 的1张手牌');
                }
              }
            }
            // Thunder point (雷电牌) chain judgment
            if (data.data.cardSubtype === 'leiDian' && data.data.targetIdx != null && data.data.ldChosen !== undefined) {
              var ldt = gs.players[data.data.targetIdx];
              var ldSn = (p && p.name) || '对手';
              var ldTn = (ldt && ldt.name) || '玩家';
              if (data.data.ldMatch && ldt && ldt.alive) {
                var ldd = MediCard.CardEffects.applyDamage(ldt, data.data.ldDamage || 3);
                this._logAction('⚡ ' + ldSn + ' 雷电牌击中 ' + ldTn + '！数字[' + data.data.ldRolled + ']，' + ldd + '伤害');
                if (data.sourceIdx !== this._myPlayerIndex) this._flashPhase('⚡ 雷电牌击中 ' + ldTn + '！');
              } else {
                this._logAction('⚡ 雷电牌判定 ' + ldTn + '：[' + data.data.ldRolled + '] ≠ [' + data.data.ldChosen + ']');
              }
              if (ldt && !ldt.alive) this._checkGameEnd();
            }
          }
          // Clear waiting state if this was our own attack + show result
          if (this._attackInProgress && this._attackInProgress.type === 'waiting_defend') {
            this._attackInProgress = null;
            this._pendingCard = null;
            if (data.data && (data.data.cardType === 'attack' || data.data.cardType === 'juesha' || data.data.cardType === 'juedou')) {
              this._attacksThisTurn++;
              var isJuesha = data.data.cardType === 'juesha';
              var isJuedou = data.data.cardType === 'juedou';
              var defName = (gs.players[data.data.targetIdx] || {}).name || '对手';
              if (data.data.damage > 0) {
                this._flashPhase((isJuesha ? '💀' : (isJuedou ? '⚔️' : '⚔️')) + ' ' + defName + ' 受到 ' + data.data.damage + ' 点伤害！');
                this._logAction((isJuesha ? '绝杀' : (isJuedou ? '决斗' : '攻击')) + '命中 ' + defName + '，造成' + data.data.damage + '点伤害');
              } else {
                this._flashPhase('🛡️ ' + defName + ' 答对了！' + (isJuesha ? '绝杀' : (isJuedou ? '决斗' : '攻击')) + '被闪避');
                this._logAction(defName + ' 答对题目，' + (isJuesha ? '绝杀' : (isJuedou ? '决斗' : '攻击')) + '被闪避');
              }
            }
          }
          this._updateDisplay();
          break;

        case 'turn_change':
          // Host advanced the turn
          console.log('[Battle] turn_change received: currentPlayerIndex=' + data.currentPlayerIndex +
            ' myPlayerIndex=' + this._myPlayerIndex +
            ' handSize=' + (data.currentHand ? data.currentHand.length : 0) +
            ' deckCount=' + data.deckCount +
            ' isHost=' + this._isHost);
          if (MediCard.BattleLogger) MediCard.BattleLogger.log('STATE_CHANGE', 'turn_change_recv',
            'newIdx=' + data.currentPlayerIndex + ' myIdx=' + this._myPlayerIndex,
            { _hostCurrentIdx: data.currentPlayerIndex });
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
            console.log('[Battle] turn_change: MY TURN! Setting _turnActive=true, updating hand');
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
            var identEff = MediCard.IdentitySkills.applyTurnStartEffects(this._player);
            if (identEff && identEff.healed > 0) {
              this._flashPhase('👑 君威：回合开始时恢复' + identEff.healed + '点HP');
            }
            if (this._player.vaccineTurns > 0) this._player.vaccineTurns--;
            if (!this._player.maxAttacks) this._player.maxAttacks = 1;
            if (this._player.attackBonus === undefined) this._player.attackBonus = 0;
          } else {
            this._turnActive = false;
            this._attackInProgress = null;
            this._pendingCard = null;
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

        case 'time_extend_vote_sync':
          // Host broadcast vote state to clients — update local VoteExtender UI
          if (data.state && data.questionId) {
            if (MediCard.TimerCalculator && MediCard.TimerCalculator.VoteExtender) {
              MediCard.TimerCalculator.VoteExtender.setState(data.questionId, data.state);
            }
            // Also update the vote-extend row in the popup
            var statusEl = document.getElementById('vote-extend-status');
            if (statusEl && data.state) {
              var s = data.state;
              if (s.extensionsGranted > 0) {
                statusEl.innerHTML = '<span style="color:#10b981;">+' + s.bonus.toFixed(1) + 'x 已加时</span>';
              } else if (s.voteCount > 0) {
                statusEl.textContent = s.voteCount + '/' + s.threshold + ' 票';
                statusEl.style.color = 'var(--accent-yellow)';
              }
            }
          }
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
      // Sync button states after render (buttons start disabled in HTML template)
      this._updateDisplay();
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
            '<div class="phase-status-area">' +
              '<div class="phase-indicator" id="phase-indicator">' + phaseText + '</div>' +
              '<div class="action-log" id="action-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
            '</div>' +
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
          '<button class="btn btn-ghost btn-sm" id="btn-surrender" style="flex:1;">🏳️ 投降</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-discard-action" disabled style="flex:1;">🗑️ 弃牌</button>' +
          '<button class="btn btn-play-card btn-lg" id="btn-play-card" disabled style="flex:2;min-height:48px;font-size:16px;font-weight:700;">🃏 出牌</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-end-turn" style="flex:1;">⏭️ 结束</button>' +
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
          self_._renderOpponentEquipmentInline(p) +
          '</div>';
      }

      screen.innerHTML = '' +
        '<div class="multiplayer-opponents" id="opponents-zone">' + oppHtml + '</div>' +
        '<div class="battlefield" id="battlefield">' +
          '<div class="battlefield-center">' +
            '<div class="duel-mode-badge">' + modeLabel + '</div>' +
            '<div class="turn-indicator" id="turn-indicator">' + turnLabel + '</div>' +
            '<div class="phase-status-area">' +
              '<div class="phase-indicator" id="phase-indicator">' + phaseText + '</div>' +
              '<div class="action-log" id="action-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
            '</div>' +
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
          '<button class="btn btn-ghost btn-sm" id="btn-surrender" style="flex:1;">🏳️ 投降</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-discard-action" disabled style="flex:1;">🗑️ 弃牌</button>' +
          '<button class="btn btn-play-card btn-lg" id="btn-play-card" disabled style="flex:2;min-height:48px;font-size:16px;font-weight:700;">🃏 出牌</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-end-turn" style="flex:1;">⏭️ 结束</button>' +
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

    /** Render compact equipment icons for multiplayer opponent list */
    _renderOpponentEquipmentInline: function(player) {
      var eq = player.equipment || {};
      var slots = MediCard.Config.equipmentSlots || ['weapon', 'armor', 'accessory', 'mount', 'tool'];
      var html = '';
      var hasAny = false;
      for (var s = 0; s < slots.length; s++) {
        var card = eq[slots[s]];
        if (card) {
          hasAny = true;
          var def = MediCard.Config.equipmentDefs ? MediCard.Config.equipmentDefs[card.cardSubtype] : null;
          var icon = def ? def.icon : _slotIcon(slots[s]);
          var tip = MediCard.Crypto.escapeHtml(card.cardName || slots[s]) + ': ' + MediCard.Crypto.escapeHtml(card.cardEffect || '无描述');
          html += '<span style="display:inline-block;margin-left:2px;font-size:14px;cursor:help;" title="' + tip + '">' + icon + '</span>';
        }
      }
      return hasAny ? '<span style="margin-left:4px;opacity:0.9;">' + html + '</span>' : '';
    },

    _renderEquipment(player, containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      var eq = player.equipment || {};
      var slots = MediCard.Config.equipmentSlots || ['weapon', 'armor', 'accessory', 'mount', 'tool'];
      var html = '';
      var self = this;
      slots.forEach(function(slot) {
        var card = eq[slot];
        if (card) {
          var def = MediCard.Config.equipmentDefs[card.cardSubtype] || {};
          var tipId = 'eq-tip-' + containerId + '-' + slot;
          html += '<div class="equipment-card equipped" data-slot="' + slot + '" data-tip-id="' + tipId + '" style="border-color:' + (def.color || '#10b981') + ';box-shadow:0 0 8px ' + (def.color || '#10b981') + '33;">' +
            '<span style="font-size:18px;line-height:1;">' + (def.icon || '🔧') + '</span>' +
            '<span style="font-size:9px;line-height:1.1;text-align:center;max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);margin-top:1px;">' + _esc(card.cardName || slot) + '</span>' +
            '</div>';
        } else {
          html += '<div class="equipment-card empty" title="' + _slotName(slot) + '"><span style="font-size:10px;opacity:0.3;">' + _slotIcon(slot) + '</span></div>';
        }
      });
      container.innerHTML = html;

      // Attach hover/click handlers for equipment detail popups
      var cards = container.querySelectorAll('.equipment-card.equipped');
      for (var ci = 0; ci < cards.length; ci++) {
        (function(cardEl) {
          var slot = cardEl.getAttribute('data-slot');
          var eqCard = eq[slot];
          if (!eqCard) return;
          var handled = false;

          cardEl.addEventListener('mouseenter', function() {
            if (handled || window.innerWidth <= 768) return;
            self._showEquipmentPopup(cardEl, eqCard, slot);
          });
          cardEl.addEventListener('mouseleave', function() {
            self._removeEquipmentPopup();
          });
          cardEl.addEventListener('click', function(e) {
            e.stopPropagation();
            if (window.innerWidth <= 768) {
              if (handled) {
                self._removeEquipmentPopup();
                handled = false;
              } else {
                self._showEquipmentPopup(cardEl, eqCard, slot);
                handled = true;
              }
            }
          });
        })(cards[ci]);
      }
    },

    _showEquipmentPopup: function(anchorEl, card, slot) {
      this._removeEquipmentPopup();
      var def = MediCard.Config.equipmentDefs[card.cardSubtype] || {};
      var slotName = _slotName(slot);
      var self = this;

      var popup = document.createElement('div');
      popup.className = 'equipment-popup';
      popup.id = 'equipment-popup';
      popup.innerHTML = '' +
        '<div class="equipment-popup-header">' +
          '<span style="font-size:20px;">' + (def.icon || '🔧') + '</span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:13px;">' + _esc(card.cardName || slot) + '</div>' +
            '<div style="font-size:10px;color:var(--text-muted);">' + _esc(slotName) + ' · ' + _esc(card.subject || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="equipment-popup-effect">' + _esc(card.cardEffect || '无特殊效果') + '</div>';
      if (card.question) {
        popup.innerHTML += '<div class="equipment-popup-question">' +
          '<div style="font-size:9px;color:var(--text-muted);margin-bottom:2px;">关联题目</div>' +
          _esc(card.question) +
          '</div>';
      }
      // 输液袋: add use button to sacrifice for HP
      if (card.cardSubtype === 'shuYeDai') {
        popup.innerHTML += '<button class="btn btn-sm" id="btn-use-shuyedai" style="margin-top:8px;width:100%;background:rgba(16,185,129,0.2);border-color:#10b981;color:#10b981;">💧 使用输液袋（回复1HP并弃置）</button>';
      }
      popup.innerHTML += '<div class="equipment-popup-arrow"></div>';

      document.body.appendChild(popup);

      // Position relative to anchor
      var rect = anchorEl.getBoundingClientRect();
      var popupRect = popup.getBoundingClientRect();
      var top = rect.bottom + 8;
      var left = rect.left + rect.width / 2 - popupRect.width / 2;
      if (left < 8) left = 8;
      if (left + popupRect.width > window.innerWidth - 8) left = window.innerWidth - popupRect.width - 8;
      if (top + popupRect.height > window.innerHeight - 20) top = rect.top - popupRect.height - 8;
      popup.style.top = top + 'px';
      popup.style.left = left + 'px';

      // Wire 输液袋 use button
      var useBtn = document.getElementById('btn-use-shuyedai');
      if (useBtn) {
        useBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self._removeEquipmentPopup();
          self._useShuYeDai(slot);
        });
      }
    },

    /** Use 输液袋: sacrifice equipment for +1 HP */
    _useShuYeDai: function(slot) {
      var player = this._player;
      if (!player.equipment || !player.equipment[slot]) return;
      var card = player.equipment[slot];
      if (card.cardSubtype !== 'shuYeDai') return;
      player.equipment[slot] = null;
      MediCard.GameState.discardPile.push(card);
      var healed = MediCard.Resources.healDamage(player, 1);
      this._logAction('💧 使用输液袋，回复' + healed + '点HP');
      this._flashPhase('💧 输液袋：回复1点HP');
      MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, healed, 'heal');
      MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#10b981', 3);
      this._updateDisplay();
    },

    _removeEquipmentPopup: function() {
      var el = document.getElementById('equipment-popup');
      if (el) el.remove();
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
      container.className = 'player-hand hand-cards';

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
          cardEl.style.setProperty('--fan-lift', isMobile ? '-8px' : '-10px');
          cardEl.style.setProperty('--fan-scale', '1.06');
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
      var howToUse;
      switch (card.cardType) {
        case 'attack': howToUse = '打出后对手答题，答错受到伤害'; break;
        case 'defense': howToUse = '被攻击时打出，你答题，答对免疫伤害'; break;
        case 'heal': howToUse = '打出后你答题，答对恢复生命值'; break;
        case 'tactic': howToUse = '打出后你答题，答对效果生效'; break;
        case 'equipment': howToUse = '打出后你答题，答对装备到对应槽位'; break;
        case 'delayed': howToUse = '打出后你答题，答对贴到对手身上，判定阶段对手答题决定是否触发'; break;
      }
      var rarityColors = { common: '#94a3b8', rare: '#06b6d4', epic: '#a855f7', legendary: '#fbbf24' };
      var rarityColor = rarityColors[card.rarity] || '#94a3b8';

      var overlay = document.createElement('div');
      overlay.className = 'card-inspect-overlay';
      overlay.innerHTML =
        '<div class="card-inspect-modal" style="border-color:' + rarityColor + '">' +
          '<div class="card-inspect-header" style="background:' + rarityColor + '22">' +
            '<span class="card-inspect-rarity" style="color:' + rarityColor + '">' + (rarityInfo ? rarityInfo.name : '普通') + '</span>' +
            '<span class="card-inspect-type">' + (typeInfo ? typeInfo.icon + ' ' + typeInfo.name : card.cardType) + '</span>' +
            '<button class="card-inspect-close">&times;</button>' +
          '</div>' +
          '<div class="card-inspect-body">' +
            '<div class="card-inspect-name">' + (card.cardName || '未知') + '</div>' +
            '<div class="card-inspect-effect">' + (card.cardEffect || '无') + '</div>' +
            '<div class="card-inspect-details">' +
              '<div class="card-inspect-row"><span class="card-inspect-label">用法</span><span>' + howToUse + '</span></div>' +
              '<div class="card-inspect-row"><span class="card-inspect-label">学科</span><span>' + (subjectMeta.icon || '') + ' ' + (subjectMeta.name || '未知') + '</span></div>' +
              '<div class="card-inspect-row"><span class="card-inspect-label">耗能</span><span>' + (card.energyCost || 0) + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      var close = function() { if (overlay.parentNode) overlay.remove(); };
      overlay.querySelector('.card-inspect-close').addEventListener('click', close);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
      overlay.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });
      overlay.querySelector('.card-inspect-close').focus();
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

      // Heal card: cannot play at full HP
      if (card.cardType === 'heal' && player.resources.hp.current >= player.resources.hp.max) {
        this._selectedCardIndex = -1;
        this._renderHand();
        this._updatePlayButton();
        this._flashPhase('💚 生命值已满，无需治疗');
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
      // juesha counts as attack for limit purposes
      var maxAttacks = player.maxAttacks || 1;
      if ((card.cardType === 'attack' || card.cardType === 'juesha') && this._attacksThisTurn >= maxAttacks) {
        this._selectedCardIndex = -1;
        this._renderHand();
        this._updatePlayButton();
        this._flashPhase('⚔️ 本回合攻击次数已用完！（' + this._attacksThisTurn + '/' + maxAttacks + '）');
        return;
      }

      // Multiplayer attack/juesha/juedou: auto-target in 2-player, select target in 3+ player
      var isOffensiveCard = (card.cardType === 'attack' || card.cardType === 'juesha' || card.cardType === 'juedou');
      if (isOffensiveCard && this._isMultiplayer) {
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
          this._flashPhase('🎯 请选择目标（点击上方对手头像）');
        }
        return;
      }

      // Track played card
      this._playedCardsThisTurn.push(card);
      this._gameStats.cardsPlayed++;
      if (card.cardType === 'attack' || card.cardType === 'juesha') this._attacksThisTurn++;
      this._log('card_played', '打出: ' + card.cardName + ' [' + card.cardType + ']');

      this._pendingCard = { card: card, index: cardIndex };
      var self = this;

      // ── Priority guard: duel > juesha > normal attack ────
      if (this._duelInProgress) {
        this._flashPhase('⚔️ 决斗进行中，无法使用其他卡牌');
        this._selectedCardIndex = -1;
        this._pendingCard = null;
        this._renderHand();
        return;
      }
      // Max 1 绝杀 per turn
      if (card.cardType === 'juesha' && this._jueshaPlayedThisTurn) {
        this._flashPhase('💀 本回合已出过绝杀，无法再次使用');
        this._selectedCardIndex = -1;
        this._pendingCard = null;
        this._renderHand();
        return;
      }

      if (card.cardType === 'attack') {
        MediCard.Audio.playCardPlay(card.rarity);
        this._resolvePlayerAttack(card);
        return;
      }
      if (card.cardType === 'juesha') {
        MediCard.Audio.playCardPlay(card.rarity);
        this._jueshaPlayedThisTurn = true;
        this._resolvePlayerJuesha(card);
        return;
      }

      switch (card.cardType) {
        case 'juedou':
          MediCard.Audio.playCardPlay(card.rarity);
          this._resolvePlayerJuedou(card);
          break;
        case 'heal':
          MediCard.Audio.playCardPlay(card.rarity);
          MediCard.QuestionPopup.show(card, function(result) {
            self._onBasicCardAnswered(result, 'heal');
          }, '你');
          break;
        case 'tactic':
          MediCard.Audio.playCardPlay(card.rarity);
          // 病历分析: no question needed, peek and reorder top 3
          if (card.cardSubtype === 'bingLiFenXi') {
            self._player.hand.splice(self._pendingCard.index, 1);
            MediCard.GameState.discardPile.push(card);
            self._pendingCard = null;
            self._selectedCardIndex = -1;
            self._updateDisplay();
            self._executeBingLiFenXi();
            break;
          }
          // Dual-mode tactics: show mode choice before question
          if (card.cardSubtype === 'huiZhen' || card.cardSubtype === 'geLi' || card.cardSubtype === 'mianYi') {
            self._showTacticModeChoice(card);
          } else {
            MediCard.QuestionPopup.show(card, function(result) {
              self._onTacticAnswered(result);
            }, '你');
          }
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
      this._trackAnswer(result, card);

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
      var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[this._difficulty] || 0.55;
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
      var chance = { easy: 0.40, normal: 0.65, hard: 0.85 }[this._difficulty] || 0.65;
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
      var defCorrectChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[this._difficulty] || 0.55;
      var answeredCorrectly = Math.random() < defCorrectChance;

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

    /* ============ 绝杀 Resolution (Player vs AI) ============ */

    _resolvePlayerJuesha(card) {
      var ai = this._aiPlayer;
      var player = this._player;

      // Remove card from hand
      player.hand.splice(this._pendingCard.index, 1);
      MediCard.GameState.discardPile.push(card);
      this._trackAnswer({ correct: false }); // 绝杀不需要攻击方答题，算"答对"统计

      this._flashPhase('💀 绝杀！' + (ai.name || '对手') + '需要守卫牌抵挡...');

      // Check if AI has defense cards
      var defIdx = -1;
      for (var i = 0; i < ai.hand.length; i++) {
        if (ai.hand[i].cardType === 'defense') { defIdx = i; break; }
      }

      if (defIdx < 0) {
        // No defense → direct damage
        this._flashPhase('💀 无守卫牌！绝杀直接命中');
        this._applyJueshaDamageToAI();
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      // Has defense → consume 1 defense, force answer
      var defCard = ai.hand[defIdx];
      ai.hand.splice(defIdx, 1);
      MediCard.GameState.discardPile.push(defCard);
      this._flashPhase('🛡️ ' + (ai.name || '对手') + '消耗守卫牌抵挡绝杀，但必须答题！');

      // AI answers
      var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[this._difficulty] || 0.55;
      var aiCorrect = Math.random() < correctChance;

      if (aiCorrect) {
        this._flashPhase('🛡️ 答对了！绝杀被化解');
        MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#3b82f6', 4);
      } else {
        this._flashPhase('❌ 答错了！绝杀生效');
        this._applyJueshaDamageToAI();
      }

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    _applyJueshaDamageToAI() {
      var ai = this._aiPlayer;
      var player = this._player;

      var identityBonus = MediCard.IdentitySkills.getDamageBonus(player, ai);
      var attackPotionBonus = (player.attackBonus || 0);
      // 手术刀 bonus now requires answering — handled in _resolvePlayerJuesha
      var totalDmg = 1 + identityBonus + attackPotionBonus;
      var armorReduction = 0;
      if (ai.equipment && ai.equipment.armor && ai.equipment.armor.cardSubtype === 'baiDaGua') {
        armorReduction = 1;
        totalDmg = Math.max(1, totalDmg - armorReduction);
      }

      var dmg = MediCard.Resources.dealDamage(ai, totalDmg);
      this._gameStats.damageDealt += dmg.actual;

      MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, dmg.actual, 'damage');
      MediCard.CardVisuals.screenShake();
      MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#dc2626', 8);
      MediCard.Audio.playDamage(dmg.actual, dmg.actual >= 3);

      var parts = ['绝杀基础1'];
      if (identityBonus) parts.push('身份加成+' + identityBonus);
      if (attackPotionBonus) parts.push('药效+' + attackPotionBonus);
      if (armorReduction) parts.push('白大褂-1');
      this._flashPhase('💀 绝杀命中！' + parts.join(' → ') + ' = ' + dmg.actual + ' 点伤害');
      this._log('juesha_damage', '绝杀造成' + dmg.actual + '伤害, AI剩余HP:' + ai.resources.hp.current);

      if (!ai.alive) {
        this._log('ai_defeated', 'AI被绝杀击败');
        var self = this;
        setTimeout(function() { self._endGame(); }, 1500);
      }
    },

    /* ============ 决斗 Resolution (Player vs AI) ============ */

    _resolvePlayerJuedou(card) {
      var player = this._player;
      var ai = this._aiPlayer;
      var self = this;

      // Remove card from hand
      player.hand.splice(this._pendingCard.index, 1);
      MediCard.GameState.discardPile.push(card);
      this._trackAnswer({ correct: false });
      this._gameStats.cardsPlayed++;

      // Set duel state
      this._duelInProgress = { attacker: player, defender: ai, iteration: 0, totalDamage: 0 };
      this._flashPhase('⚔️ 决斗！' + (ai.name || '对手') + '必须出杀答题，无法防御！');

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();

      // Start duel loop asynchronously (each step requires display update)
      setTimeout(function() { self._duelIteration(); }, 1000);
    },

    _duelIteration() {
      var duel = this._duelInProgress;
      if (!duel) return;

      var defender = duel.defender;
      var attacker = duel.attacker;
      var self = this;

      // Increment iteration
      duel.iteration++;

      // Check if defender has an attack-type card in hand (NOT 绝杀, NOT defense)
      var atkIdx = -1;
      for (var i = 0; i < defender.hand.length; i++) {
        var c = defender.hand[i];
        if (c.cardType === 'attack' && !c.isJuesha) {
          atkIdx = i;
          break;
        }
      }

      if (atkIdx < 0) {
        // No attack card → duel fail: 1 damage
        this._flashPhase('⚔️ 决斗结束！' + (defender.name || '对手') + '无攻击牌可用，受到1点伤害');
        var dmg = MediCard.Resources.dealDamage(defender, 1);
        this._gameStats.damageDealt += dmg.actual;
        duel.totalDamage += dmg.actual;
        MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, 1, 'damage');
        MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#f97316', 4);

        if (!defender.alive) {
          this._flashPhase('💀 ' + (defender.name || '对手') + '在决斗中倒下！');
          this._duelInProgress = null;
          this._updateDisplay();
          setTimeout(function() { self._endGame(); }, 1500);
          return;
        }
        this._duelInProgress = null;
        this._updateDisplay();
        return;
      }

      // Defender plays an attack card (consumed, NOT 绝杀-procced)
      var attackCard = defender.hand[atkIdx];
      defender.hand.splice(atkIdx, 1);
      MediCard.GameState.discardPile.push(attackCard);

      this._flashPhase('⚔️ 第' + duel.iteration + '回合 — ' + (defender.name || '对手') + '出' + (attackCard.cardName || '杀') + '并答题...');

      // AI answers
      var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[this._difficulty] || 0.55;
      var aiCorrect = Math.random() < correctChance;

      if (aiCorrect) {
        this._flashPhase('🛡️ 答对了！继续出杀...');
        this._updateDisplay();
        // Continue duel loop
        setTimeout(function() { self._duelIteration(); }, 800);
      } else {
        // Wrong → 1 damage, duel ends
        this._flashPhase('❌ 答错了！决斗结束，受到1点伤害');
        var dmg2 = MediCard.Resources.dealDamage(defender, 1);
        this._gameStats.damageDealt += dmg2.actual;
        duel.totalDamage += dmg2.actual;
        MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, 1, 'damage');
        MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#f97316', 4);

        if (!defender.alive) {
          this._flashPhase('💀 ' + (defender.name || '对手') + '在决斗中倒下！');
          this._duelInProgress = null;
          this._updateDisplay();
          setTimeout(function() { self._endGame(); }, 1500);
          return;
        }
        this._duelInProgress = null;
        this._updateDisplay();
      }
    },

    /* ============ AI-initiated 决斗 (AI vs Player) ============ */

    _resolveAIJuedou(card, ai, player, playNextAICard) {
      var self = this;
      this._flashPhase('⚔️ AI发起决斗！你必须出杀答题，无法防御！');
      this._aiContinuePlay = playNextAICard;
      this._juedouDefending = { attacker: ai, defender: player, iteration: 0 };
      this._updateDisplay();
      setTimeout(function() { self._executeJuedouDefendIteration(); }, 1000);
    },

    _executeJuedouDefendIteration() {
      var duel = this._juedouDefending;
      if (!duel) return;

      var defender = duel.defender;
      var self = this;
      duel.iteration++;

      // Find a valid attack card in defender's hand (not 绝杀, not defense)
      var atkIdx = -1;
      for (var i = 0; i < defender.hand.length; i++) {
        var c = defender.hand[i];
        if (c.cardType === 'attack' && !c.isJuesha) {
          atkIdx = i; break;
        }
      }

      if (atkIdx < 0) {
        // No attack card — defender loses, takes 1 damage
        this._flashPhase('⚔️ 无攻击牌可用！决斗失败，受到1点伤害');
        var dmg = MediCard.Resources.dealDamage(defender, 1);
        this._gameStats.damageTaken += dmg.actual;
        MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, 1, 'damage');
        MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#f97316', 4);
        this._juedouDefending = null;
        this._updateDisplay();
        var cont = this._aiContinuePlay;
        this._aiContinuePlay = null;
        if (!defender.alive) {
          this._flashPhase('💀 你在决斗中倒下！');
          setTimeout(function() { self._endGame(); }, 1500);
          return;
        }
        if (cont) setTimeout(cont, 700);
        return;
      }

      // Consume the attack card
      var attackCard = defender.hand[atkIdx];
      defender.hand.splice(atkIdx, 1);
      MediCard.GameState.discardPile.push(attackCard);

      this._flashPhase('⚔️ 第' + duel.iteration + '回合 — 出' + (attackCard.cardName || '杀') + '答题');
      this._updateDisplay();

      // Player answers the question on the attack card
      MediCard.QuestionPopup.show(attackCard, function(result) {
        self._trackAnswer(result, attackCard);
        if (result.correct) {
          self._flashPhase('🛡️ 答对了！继续出杀...');
          self._updateDisplay();
          setTimeout(function() { self._executeJuedouDefendIteration(); }, 800);
        } else {
          self._flashPhase('❌ 答错了！决斗失败，受到1点伤害');
          var dmg2 = MediCard.Resources.dealDamage(defender, 1);
          self._gameStats.damageTaken += dmg2.actual;
          MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, 1, 'damage');
          MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#f97316', 4);
          self._juedouDefending = null;
          self._updateDisplay();
          var cont2 = self._aiContinuePlay;
          self._aiContinuePlay = null;
          if (!defender.alive) {
            self._flashPhase('💀 你在决斗中倒下！');
            setTimeout(function() { self._endGame(); }, 1500);
            return;
          }
          if (cont2) setTimeout(cont2, 700);
        }
      }, '你');
    },

    // ── Existing AI attack logic ──
    _applyAttackDamageToAI() {
      var ai = this._aiPlayer;
      var player = this._player;

      // Check for immuneNextHit on AI
      if (ai.immuneNextHit) {
        ai.immuneNextHit = false;
        this._flashPhase('🛡️ AI免疫屏障挡住了本次伤害！');
        this._logAction('AI免疫屏障挡住攻击伤害');
        return;
      }

      // Check for 应急预案 auto-block on AI
      var yjyIdx = -1;
      for (var yi = 0; yi < ai.hand.length; yi++) {
        if (ai.hand[yi].cardType === 'yingjiYuan' || ai.hand[yi].isYingjiYuan) { yjyIdx = yi; break; }
      }
      if (yjyIdx >= 0) {
        var yjyCard = ai.hand.splice(yjyIdx, 1)[0];
        MediCard.GameState.discardPile.push(yjyCard);
        this._flashPhase('🆘 AI应急预案发动！免疫本次伤害');
        this._logAction('AI应急预案自动消耗，免疫攻击伤害');
        this._updateDisplay();
        return;
      }

      // Build damage breakdown
      var parts = [];
      var baseDmg = 1;
      var armorReduction = 0;
      var identityBonus = MediCard.IdentitySkills.getDamageBonus(player, ai);
      var attackPotionBonus = (player.attackBonus || 0);

      var bonus = identityBonus + attackPotionBonus;
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

      parts.push('基础1');
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

    /* ============ Tactic Dual-Mode Choice ============ */

    /** Show mode choice popup for dual-mode tactics (会诊/隔离观察/免疫屏障) */
    _showTacticModeChoice: function(card) {
      var self = this;
      var names = { huiZhen: '会诊', geLi: '隔离观察', mianYi: '免疫屏障' };
      var basicDesc = {
        huiZhen: '直接摸1张牌（无需答题）',
        geLi: '目标下回合不能出攻击牌（无需答题）',
        mianYi: '免疫下一次伤害（无需答题）'
      };
      var ampDesc = {
        huiZhen: '答题：答对摸3张牌，答错无效果',
        geLi: '答题：答对目标下回合不能出任何牌，答错无效果',
        mianYi: '答题：答对免疫整个下回合，答错仍免疫下一次伤害'
      };
      var name = names[card.cardSubtype] || '锦囊';
      var bd = basicDesc[card.cardSubtype] || '直接使用（无需答题）';
      var ad = ampDesc[card.cardSubtype] || '答题增幅效果';

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '2100';

      var content = document.createElement('div');
      content.className = 'modal-content';
      content.style.cssText = 'max-width:400px;text-align:center;animation:modalEnter 250ms ease-out;padding:20px;';

      content.innerHTML = '' +
        '<h3 style="margin-bottom:4px;">📋 ' + name + '</h3>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">选择使用方式</p>' +
        '<button class="btn btn-lg" id="tac-mode-basic" style="display:block;width:100%;margin-bottom:10px;background:rgba(100,116,139,0.15);border:1px solid rgba(100,116,139,0.3);border-radius:12px;padding:14px;text-align:left;">' +
          '<div style="font-weight:700;">⚡ 基本模式</div>' +
          '<div style="font-size:12px;color:var(--text-muted);">' + bd + '</div>' +
        '</button>' +
        '<button class="btn btn-lg" id="tac-mode-amplify" style="display:block;width:100%;margin-bottom:8px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:14px;text-align:left;">' +
          '<div style="font-weight:700;color:#a855f7;">🔮 答题增幅</div>' +
          '<div style="font-size:12px;color:var(--text-muted);">' + ad + '</div>' +
        '</button>' +
        '<button class="btn btn-ghost btn-sm" id="tac-mode-cancel">取消</button>';

      overlay.appendChild(content);
      document.body.appendChild(overlay);

      document.getElementById('tac-mode-basic').addEventListener('click', function() {
        overlay.remove();
        // Remove card from hand and resolve in basic mode
        var pCard = self._pendingCard.card;
        var pIdx = self._pendingCard.index;
        self._player.hand.splice(pIdx, 1);
        MediCard.GameState.discardPile.push(pCard);
        var gs = MediCard.GameState;
        var res = MediCard.CardEffects.resolveTactic(pCard, self._player, self._aiPlayer, true, gs, false);
        self._flashPhase(res.message);
        self._logAction(res.message);
        self._pendingCard = null;
        self._selectedCardIndex = -1;
        self._updateDisplay();
      });

      document.getElementById('tac-mode-amplify').addEventListener('click', function() {
        overlay.remove();
        // Show question popup for amplify mode
        self._pendingCard.amplifyMode = true;
        MediCard.QuestionPopup.show(card, function(result) {
          self._onTacticAnswered(result);
        }, '你');
      });

      document.getElementById('tac-mode-cancel').addEventListener('click', function() {
        overlay.remove();
        self._pendingCard = null;
        self._selectedCardIndex = -1;
        self._updateDisplay();
      });

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) { overlay.remove(); }
      });
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
      this._trackAnswer(result, card);

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
      var firstOpp = this._isMultiplayer ? this._getFirstOpponent() : null;
      var opponent = firstOpp ? firstOpp.player : this._aiPlayer;
      var opponentName = opponent ? (opponent.name || '对手') : '对手';
      var oppIdx = firstOpp ? firstOpp.index : 1;
      switch (card.cardSubtype) {
        case 'huiZhen': // 会诊 - basic: 1, amplify: 3
          var isAmp = self._pendingCard && self._pendingCard.amplifyMode;
          var hzCount = isAmp ? 3 : 1;
          var drawn = MediCard.GameState.drawCards(playerIdx, hzCount);
          this._flashPhase('📋 会诊' + (isAmp ? '增幅' : '') + '！摸了 ' + drawn.length + ' 张牌');
          MediCard.Audio.playCardDraw();
          break;
        case 'wuZhen': // 误诊 - opponent discards 1
          if (opponent && opponent.hand.length > 0) {
            if (this._hasEquip(opponent, 'fangHu', 'accessory')) {
              this._flashPhase('😷 ' + opponentName + '有防护面罩，误诊无效');
            } else {
              var rIdx = Math.floor(Math.random() * opponent.hand.length);
              var discarded = opponent.hand.splice(rIdx, 1)[0];
              MediCard.GameState.discardPile.push(discarded);
              this._flashPhase('❌ 误诊！' + opponentName + '弃了1张牌');
            }
          } else {
            this._flashPhase('❌ ' + opponentName + '没有手牌可弃');
          }
          break;
        case 'geLi': // 隔离观察 - basic: no attack, amplify: no any card
          var glAmp = self._pendingCard && self._pendingCard.amplifyMode;
          if (opponent && this._hasEquip(opponent, 'fangHu', 'accessory')) {
            this._flashPhase('😷 ' + opponentName + '有防护面罩，隔离观察无效');
          } else if (opponent) {
            if (glAmp) {
              opponent.skipNextPlayPhase = true;
              this._flashPhase('🚫 隔离观察增幅！' + opponentName + '下回合不能出任何牌');
            } else {
              opponent.skipNextAttackOnly = true;
              this._flashPhase('🚫 隔离观察！' + opponentName + '下回合不能出攻击牌');
            }
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
        case 'mianYi': // 免疫屏障 - basic: immune next hit, amplify: immune full turn
          var myAmp = self._pendingCard && self._pendingCard.amplifyMode;
          if (myAmp) {
            player.immuneUntilNextTurn = true;
            this._flashPhase('🛡️ 免疫屏障增幅！下回合免疫所有伤害');
          } else {
            player.immuneNextHit = true;
            this._flashPhase('🛡️ 免疫屏障！免疫下一次伤害');
          }
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
          if (this._isMultiplayer) {
            var allOpps = this._getAllOpponents();
            for (var ji = 0; ji < allOpps.length; ji++) {
              var jcTarget = allOpps[ji];
              if (jcTarget.player.alive) {
                var jcDmg = MediCard.Resources.dealDamage(jcTarget.player, 1);
                this._gameStats.damageDealt += jcDmg.actual;
                this._flashPhase('🦠 交叉感染！' + (jcTarget.player.name || '对手') + '受到1点伤害');
                if (!jcTarget.player.alive) { this._endGame(); return; }
              }
            }
          } else {
            if (opponent && opponent.alive) {
              var jcDmgSingle = MediCard.Resources.dealDamage(opponent, 1);
              this._gameStats.damageDealt += jcDmgSingle.actual;
              this._flashPhase('🦠 交叉感染！' + opponentName + '受到1点伤害');
              if (!opponent.alive) { this._endGame(); return; }
            }
          }
          break;
        case 'qiGuanZhaiChu': // 器官摘除 — choose target + mode
          var qgOpps = self._getAllOpponents();
          if (!qgOpps || qgOpps.length === 0) {
            self._flashPhase('没有可摘除的对手');
            break;
          }
          if (qgOpps.length === 1) {
            self._promptQiGuanMode(qgOpps[0]);
          } else {
            self._promptQiGuanTarget(qgOpps);
          }
          return; // async — don't clear pendingCard or updateDisplay yet

        case 'yangBenCaiJi': // 样本采集 — randomly steal equipment or hand card
          var ybOpps = self._getAllOpponents();
          var ybTarget = ybOpps.length > 0 ? ybOpps[Math.floor(Math.random() * ybOpps.length)] : null;
          if (!ybTarget || !ybTarget.player.alive) {
            self._flashPhase('没有可采集的目标');
            break;
          }
          self._executeYangBenCaiJi(ybTarget);
          return; // async — handled in _executeYangBenCaiJi

        case 'leiDian': // 雷电牌 — number picker then chain judgment
          self._promptLeiDianNumber();
          return; // async — chain starts after number picked

        case 'bingLiFenXi': // 病历分析 — peek top 3, reorder
          self._executeBingLiFenXi();
          return; // async — handled in _executeBingLiFenXi

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
          case 'wuZhen': sd.discardTargetCount = 1; sd.discardTargetIdx = oppIdx; break;
          case 'geLi': sd.skipNextPlay = true; sd.skipTargetIdx = oppIdx; break;
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

    /* ── Organ Removal (器官摘除) helpers ── */

    /** Step 1: pick a target among multiple opponents */
    _promptQiGuanTarget: function(opponents) {
      var self = this;
      var phaseEl = document.getElementById('phase-indicator');
      if (!phaseEl) return;
      phaseEl.innerHTML = '🫁 器官摘除 — 选择摘除目标：';
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;';
      opponents.forEach(function(opp) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.style.cssText = 'background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);color:#fca5a5;min-width:80px;';
        btn.textContent = (opp.player.name || '对手') + ' ❤️' + opp.player.resources.hp.current;
        btn.addEventListener('click', function() {
          self._promptQiGuanMode(opp);
        });
        div.appendChild(btn);
      });
      // Cancel button
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost btn-sm';
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', function() { self._finishQiGuan(); });
      div.appendChild(cancelBtn);
      phaseEl.appendChild(div);
    },

    /** Step 2: pick mode — remove equipment (visible) or discard hand (blind) */
    _promptQiGuanMode: function(opp) {
      var self = this;
      var phaseEl = document.getElementById('phase-indicator');
      if (!phaseEl) return;
      // Check if target has fangHu protection
      if (this._hasEquip(opp.player, 'fangHu', 'accessory')) {
        this._flashPhase('😷 ' + (opp.player.name || '对手') + '有防护面罩，器官摘除无效');
        this._logAction('器官摘除被防护面罩免疫');
        this._finishQiGuan();
        return;
      }
      var name = opp.player.name || '对手';
      var hasEquip = opp.player.equipment && Object.keys(opp.player.equipment).some(function(s) { return opp.player.equipment[s]; });
      var hasHand = opp.player.hand && opp.player.hand.length > 0;
      phaseEl.innerHTML = '🫁 器官摘除 → ' + name + ' — 选择摘除方式：';
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;';

      if (hasEquip) {
        var eqBtn = document.createElement('button');
        eqBtn.className = 'btn btn-sm btn-primary';
        eqBtn.textContent = '🔧 摘除装备（可见）';
        eqBtn.addEventListener('click', function() { self._promptQiGuanEquipSlot(opp); });
        div.appendChild(eqBtn);
      }
      if (hasHand) {
        var hBtn = document.createElement('button');
        hBtn.className = 'btn btn-sm';
        hBtn.style.cssText = 'background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:#fdba74;';
        hBtn.textContent = '🃏 弃置手牌（盲抽）';
        hBtn.addEventListener('click', function() { self._executeQiGuanTarget_hand(opp); });
        div.appendChild(hBtn);
      }
      if (!hasEquip && !hasHand) {
        phaseEl.innerHTML = '🫁 ' + name + ' 没有可摘除的牌';
        setTimeout(function() { self._finishQiGuan(); }, 1500);
        return;
      }
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost btn-sm';
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', function() { self._finishQiGuan(); });
      div.appendChild(cancelBtn);
      phaseEl.appendChild(div);
    },

    /** Step 2b (equipment mode): pick which equipment slot to remove */
    _promptQiGuanEquipSlot: function(opp) {
      var self = this;
      var phaseEl = document.getElementById('phase-indicator');
      if (!phaseEl) return;
      var eq = opp.player.equipment || {};
      var slots = MediCard.Config.equipmentSlots || ['weapon','armor','accessory','mount','tool'];
      phaseEl.innerHTML = '🫁 器官摘除 → 选择摘除的装备：';
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;';
      var anyShown = false;
      slots.forEach(function(slot) {
        var card = eq[slot];
        if (!card) return;
        anyShown = true;
        var def = MediCard.Config.equipmentDefs[card.cardSubtype] || {};
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm';
        btn.style.cssText = 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#6ee7b7;';
        btn.textContent = (def.icon || '🔧') + ' ' + (card.cardName || slot);
        btn.title = card.cardEffect || '';
        btn.addEventListener('click', function() {
          self._executeQiGuanTarget_equip(opp, slot);
        });
        div.appendChild(btn);
      });
      if (!anyShown) {
        phaseEl.innerHTML = '🫁 该对手没有装备可摘除';
        setTimeout(function() { self._finishQiGuan(); }, 1500);
        return;
      }
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost btn-sm';
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', function() { self._finishQiGuan(); });
      div.appendChild(cancelBtn);
      phaseEl.appendChild(div);
    },

    /** Execute: remove specific equipment from opponent */
    _executeQiGuanTarget_equip: function(opp, slot) {
      var card = opp.player.equipment[slot];
      opp.player.equipment[slot] = null;
      MediCard.GameState.discardPile.push(card);
      var name = opp.player.name || '对手';
      this._flashPhase('🫁 器官摘除！摘除了 ' + name + ' 的「' + (card.cardName || slot) + '」');
      this._logAction('器官摘除：摘除了 ' + name + ' 的装备「' + (card.cardName || slot) + '」');
      // Multiplayer sync
      this._syncQiGuanResult(opp.index, 'equipment', slot);
      this._finishQiGuan();
    },

    /** Execute: randomly discard one hand card from opponent */
    _executeQiGuanTarget_hand: function(opp) {
      if (!opp.player.hand || opp.player.hand.length === 0) {
        this._flashPhase('🫁 ' + (opp.player.name || '对手') + ' 没有手牌');
        this._finishQiGuan();
        return;
      }
      var rIdx = Math.floor(Math.random() * opp.player.hand.length);
      var discarded = opp.player.hand.splice(rIdx, 1)[0];
      MediCard.GameState.discardPile.push(discarded);
      var name = opp.player.name || '对手';
      this._flashPhase('🫁 器官摘除！盲弃了 ' + name + ' 的1张手牌');
      this._logAction('器官摘除：盲弃了 ' + name + ' 的1张手牌');
      // Multiplayer sync
      this._syncQiGuanResult(opp.index, 'hand', null, rIdx);
      this._finishQiGuan();
    },

    /** Send qiGuan result to host, or broadcast if host */
    _syncQiGuanResult: function(targetIdx, mode, equipSlot, handIdx) {
      if (!this._isMultiplayer) return;
      var idx = this._pendingCard ? this._pendingCard.index : -1;
      var sd = {
        cardIndex: idx,
        cardType: 'tactic',
        cardSubtype: 'qiGuanZhaiChu',
        targetIdx: targetIdx,
        qgMode: mode,
        qgEquipSlot: equipSlot || null,
        qgHandIdx: (handIdx !== undefined ? handIdx : -1)
      };
      if (this._isHost) {
        this._sendSync({ type: 'action_result', sourceIdx: this._myPlayerIndex, data: sd });
      } else {
        this._sendSync(sd);
      }
    },

    /** Clean up after organ removal flow */
    _finishQiGuan: function() {
      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    /* ── Sample Collection (样本采集) ── */

    /** Randomly steal equipment or hand card from target opponent */
    _executeYangBenCaiJi: function(opp) {
      var self = this;
      // Check if target has fangHu protection
      if (this._hasEquip(opp.player, 'fangHu', 'accessory')) {
        this._flashPhase('😷 ' + (opp.player.name || '对手') + '有防护面罩，样本采集无效');
        this._logAction('样本采集被防护面罩免疫');
        this._finishQiGuan();
        return;
      }
      var eq = opp.player.equipment || {};
      var slots = MediCard.Config.equipmentSlots || ['weapon','armor','accessory','mount','tool'];
      var filledSlots = slots.filter(function(s) { return eq[s]; });
      var hasEquip = filledSlots.length > 0;
      var hasHand = opp.player.hand && opp.player.hand.length > 0;

      if (!hasEquip && !hasHand) {
        this._flashPhase('🧪 样本采集失败，目标没有可采集的牌');
        this._logAction('样本采集失败：目标无牌可偷');
        this._finishQiGuan();
        return;
      }

      // Random mode: prefer equipment if available (biased by count), else hand
      var mode;
      if (hasEquip && hasHand) {
        mode = Math.random() < 0.5 ? 'equipment' : 'hand';
      } else if (hasEquip) {
        mode = 'equipment';
      } else {
        mode = 'hand';
      }

      if (mode === 'equipment') {
        // Randomly pick a filled equipment slot
        var pickSlot = filledSlots[Math.floor(Math.random() * filledSlots.length)];
        var stolenCard = eq[pickSlot];
        opp.player.equipment[pickSlot] = null;
        // Auto-equip on player (replace old equipment of same slot)
        var oldEquip = this._player.equipment[pickSlot];
        if (oldEquip) MediCard.GameState.discardPile.push(oldEquip);
        this._player.equipment[pickSlot] = stolenCard;
        var name = opp.player.name || '对手';
        this._flashPhase('🧪 样本采集！偷取了 ' + name + ' 的「' + (stolenCard.cardName || pickSlot) + '」并装备');
        this._logAction('样本采集：偷取了 ' + name + ' 的装备「' + (stolenCard.cardName || pickSlot) + '」');
        this._syncYangBenResult(opp.index, 'equipment', pickSlot, -1);
      } else {
        // Randomly pick a hand card
        var rIdx = Math.floor(Math.random() * opp.player.hand.length);
        var stolenHand = opp.player.hand.splice(rIdx, 1)[0];
        this._player.hand.push(stolenHand);
        var name2 = opp.player.name || '对手';
        this._flashPhase('🧪 样本采集！偷取了 ' + name2 + ' 的1张手牌');
        this._logAction('样本采集：偷取了 ' + name2 + ' 的1张手牌');
        this._syncYangBenResult(opp.index, 'hand', null, rIdx);
      }
      this._finishQiGuan();
    },

    /** Sync yangBenCaiJi result to host/peers */
    _syncYangBenResult: function(targetIdx, mode, equipSlot, handIdx) {
      if (!this._isMultiplayer) return;
      var idx = this._pendingCard ? this._pendingCard.index : -1;
      var sd = {
        cardIndex: idx,
        cardType: 'tactic',
        cardSubtype: 'yangBenCaiJi',
        targetIdx: targetIdx,
        ybMode: mode,
        ybEquipSlot: equipSlot || null,
        ybHandIdx: (handIdx !== undefined ? handIdx : -1)
      };
      if (this._isHost) {
        this._sendSync({ type: 'action_result', sourceIdx: this._myPlayerIndex, data: sd });
      } else {
        this._sendSync(sd);
      }
    },

    /* ===== 雷电牌 (Thunder Point) — chain judgment ===== */

    /** Show 0-9 number picker for 雷电牌 */
    _promptLeiDianNumber: function() {
      var bf = document.getElementById('battlefield');
      if (!bf) return;
      var html = '<div id="leiDian-picker" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:50;text-align:center;background:rgba(15,23,42,0.95);backdrop-filter:blur(12px);border:1px solid rgba(251,191,36,0.3);border-radius:16px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">' +
        '<div style="color:var(--accent-yellow);font-weight:700;margin-bottom:10px;">⚡ 雷电牌 — 选择一个数字</div>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:10px;">从下家开始顺时针判定，数字一致时造成3点伤害</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:280px;">';
      for (var n = 0; n <= 9; n++) {
        html += '<button class="btn-leidian-num" data-num="' + n + '" style="width:44px;height:44px;border-radius:50%;border:2px solid rgba(251,191,36,0.4);background:rgba(251,191,36,0.08);color:#fbbf24;font-size:18px;font-weight:900;cursor:pointer;transition:all 0.2s;">' + n + '</button>';
      }
      html += '</div>' +
        '<button id="btn-leidian-cancel" style="margin-top:10px;padding:6px 20px;border-radius:12px;border:1px solid rgba(100,116,139,0.3);background:rgba(100,116,139,0.1);color:var(--text-muted);font-size:12px;cursor:pointer;">取消</button>' +
        '</div>';
      bf.insertAdjacentHTML('beforeend', html);
      var self = this;
      bf.querySelectorAll('.btn-leidian-num').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var num = parseInt(this.getAttribute('data-num'));
          var el = document.getElementById('leiDian-picker');
          if (el) el.remove();
          self._startLeiDianChain(num);
        });
        btn.addEventListener('mouseenter', function() { this.style.background='rgba(251,191,36,0.25)'; this.style.borderColor='#fbbf24'; });
        btn.addEventListener('mouseleave', function() { this.style.background='rgba(251,191,36,0.08)'; this.style.borderColor='rgba(251,191,36,0.4)'; });
      });
      var cancelBtn = document.getElementById('btn-leidian-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
          var el = document.getElementById('leiDian-picker');
          if (el) el.remove();
          self._pendingCard = null;
          self._selectedCardIndex = -1;
          self._updateDisplay();
        });
      }
    },

    /** Start chain judgment from next player clockwise */
    _startLeiDianChain: function(chosenNumber) {
      var gs = MediCard.GameState;
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;
      // Start from next player clockwise
      var startIdx = this._isMultiplayer
        ? ((myIdx + 1) % gs.players.length)
        : 1; // AI in singleplayer
      this._leiDianData = {
        chosenNumber: chosenNumber,
        currentTargetIdx: startIdx,
        visitedIndices: [myIdx] // Don't target self
      };
      this._logAction('雷电牌：选定数字 [' + chosenNumber + ']，开始链式判定');
      this._executeLeiDianJudgment();
    },

    /** Execute one round of chain judgment */
    _executeLeiDianJudgment: function() {
      var self = this;
      var gs = MediCard.GameState;
      var ld = this._leiDianData;
      if (!ld) return;
      // Find next alive target not already visited
      var targetIdx = ld.currentTargetIdx;
      var attempts = 0;
      while (attempts < gs.players.length) {
        var p = gs.players[targetIdx];
        if (p.alive && ld.visitedIndices.indexOf(targetIdx) < 0) break;
        targetIdx = (targetIdx + 1) % gs.players.length;
        // Skip self
        var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;
        if (targetIdx === myIdx) { targetIdx = (targetIdx + 1) % gs.players.length; }
        attempts++;
      }
      if (attempts >= gs.players.length) {
        this._logAction('雷电牌：无可判定目标，链结束');
        this._finishLeiDian();
        return;
      }
      ld.currentTargetIdx = targetIdx;
      ld.visitedIndices.push(targetIdx);
      var target = gs.players[targetIdx];

      // Check fangHu protection
      if (target.equipment && target.equipment.accessory && target.equipment.accessory.cardSubtype === 'fangHu') {
        this._logAction('雷电牌判定 ' + (target.name || '玩家') + '：防护面罩免疫');
        // Move to next
        ld.currentTargetIdx = (targetIdx + 1) % gs.players.length;
        // Skip self
        var mi = this._isMultiplayer ? this._myPlayerIndex : 0;
        if (ld.currentTargetIdx === mi) ld.currentTargetIdx = (ld.currentTargetIdx + 1) % gs.players.length;
        setTimeout(function() { self._executeLeiDianJudgment(); }, 800);
        return;
      }

      // Generate random number and display
      var randomNum = Math.floor(Math.random() * 10);
      var isMatch = (randomNum === ld.chosenNumber);
      this._showLeiDianResult(ld.chosenNumber, randomNum, isMatch, target.name || '玩家', function() {
        if (isMatch) {
          // Deal 3 damage
          var dmg = MediCard.CardEffects.applyDamage(target, 3);
          self._logAction('雷电牌击中 ' + (target.name || '玩家') + '！数字[' + randomNum + ']一致，造成' + dmg + '点伤害');
          self._gameStats.damageDealt += dmg;
          self._syncLeiDianResult(targetIdx, randomNum, true, dmg);

          if (!target.alive) {
            self._logAction((target.name || '玩家') + ' 被雷电牌击杀');
            self._checkGameEnd();
          }
          self._finishLeiDian();
        } else {
          self._logAction('雷电牌判定 ' + (target.name || '玩家') + '：数字[' + randomNum + '] ≠ [' + ld.chosenNumber + ']，传递给下一位');
          self._syncLeiDianResult(targetIdx, randomNum, false, 0);
          // Move to next player
          ld.currentTargetIdx = (targetIdx + 1) % gs.players.length;
          var mi2 = self._isMultiplayer ? self._myPlayerIndex : 0;
          if (ld.currentTargetIdx === mi2) ld.currentTargetIdx = (ld.currentTargetIdx + 1) % gs.players.length;
          setTimeout(function() { self._executeLeiDianJudgment(); }, 1200);
        }
      });
    },

    /** Center-screen random number reveal */
    _showLeiDianResult: function(chosen, rolled, isMatch, targetName, callback) {
      var bf = document.getElementById('battlefield');
      if (!bf) { if (callback) callback(); return; }
      var html = '<div id="leiDian-result" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:55;text-align:center;">' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">⚡ 雷电牌判定 · ' + targetName + '</div>' +
        '<div style="font-size:14px;color:var(--text-muted);margin-bottom:6px;">选定数字: <b style="color:#fbbf24;">' + chosen + '</b></div>' +
        '<div id="leiDian-rolled" style="font-size:64px;font-weight:900;font-family:var(--font-mono);color:' + (isMatch ? '#ef4444' : '#64748b') + ';animation:leiDian-roll 0.3s ease-out;text-shadow:0 0 30px ' + (isMatch ? 'rgba(239,68,68,0.6)' : 'rgba(100,116,139,0.4)') + ';">' + rolled + '</div>' +
        '<div style="font-size:14px;font-weight:700;margin-top:4px;color:' + (isMatch ? '#ef4444' : '#10b981') + ';">' + (isMatch ? '⚡ 命中！' : '✓ 未命中 — 传递下一位') + '</div>' +
        '</div>';
      bf.insertAdjacentHTML('beforeend', html);
      // Pulse animation
      setTimeout(function() {
        var el = document.getElementById('leiDian-rolled');
        if (el) el.style.transform = 'scale(1.3)';
        setTimeout(function() { if (el) el.style.transform = 'scale(1)'; }, 150);
      }, 100);
      // Remove after delay and callback
      setTimeout(function() {
        var el = document.getElementById('leiDian-result');
        if (el) el.remove();
        if (callback) callback();
      }, isMatch ? 1500 : 1000);
    },

    /** Cleanup after 雷电牌 chain ends */
    _finishLeiDian: function() {
      this._leiDianData = null;
      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    /** Sync 雷电牌 result for multiplayer */
    _syncLeiDianResult: function(targetIdx, rolled, isMatch, damage) {
      if (!this._isMultiplayer) return;
      var ld = this._leiDianData;
      var sd = {
        cardIndex: this._pendingCard ? this._pendingCard.index : -1,
        cardType: 'tactic',
        cardSubtype: 'leiDian',
        targetIdx: targetIdx,
        ldChosen: ld ? ld.chosenNumber : -1,
        ldRolled: rolled,
        ldMatch: isMatch,
        ldDamage: damage
      };
      if (this._isHost) {
        this._sendSync({ type: 'action_result', sourceIdx: this._myPlayerIndex, data: sd });
      } else {
        this._sendSync(sd);
      }
    },

    /* ============ AI 雷电牌 Async Chain ============ */

    /** Start AI 雷电牌 chain — walks through all alive opponents sequentially */
    _startAILeiDianChain: function(card, ai, player, onComplete) {
      var gs = MediCard.GameState;
      var chosenNumber = Math.floor(Math.random() * 10);
      // AI is at index 1 in singleplayer; skip self
      var aiIdx = gs.players.indexOf(ai);
      if (aiIdx < 0) aiIdx = 1;

      this._aiLeiDianData = {
        chosenNumber: chosenNumber,
        currentTargetIdx: 0, // start from first non-AI player
        visitedIndices: [aiIdx],
        onComplete: onComplete
      };

      this._logAction('AI雷电牌：选定数字 [' + chosenNumber + ']，开始链式判定');
      document.getElementById('phase-indicator').textContent = 'AI使用雷电牌！选定[' + chosenNumber + ']';
      this._updateDisplay();

      setTimeout(this._executeAILeiDianStep.bind(this), 600);
    },

    /** Execute one step of AI 雷电牌 chain */
    _executeAILeiDianStep: function() {
      var self = this;
      var gs = MediCard.GameState;
      var ld = this._aiLeiDianData;
      if (!ld) return;

      // Find next alive unvisited target
      var targetIdx = ld.currentTargetIdx;
      var attempts = 0;
      while (attempts < gs.players.length) {
        var p = gs.players[targetIdx];
        if (p.alive && ld.visitedIndices.indexOf(targetIdx) < 0) break;
        targetIdx = (targetIdx + 1) % gs.players.length;
        attempts++;
      }

      if (attempts >= gs.players.length) {
        this._logAction('AI雷电牌：无可判定目标，链结束');
        this._finishAILeiDian();
        return;
      }

      ld.currentTargetIdx = targetIdx;
      ld.visitedIndices.push(targetIdx);
      var target = gs.players[targetIdx];

      // Check fangHu (防护面罩) immunity
      if (target.equipment && target.equipment.accessory && target.equipment.accessory.cardSubtype === 'fangHu') {
        this._logAction('AI雷电牌判定 ' + (target.name || '玩家') + '：防护面罩免疫');
        ld.currentTargetIdx = (targetIdx + 1) % gs.players.length;
        setTimeout(function() { self._executeAILeiDianStep(); }, 800);
        return;
      }

      // Roll 0-9
      var rolled = Math.floor(Math.random() * 10);
      var isMatch = (rolled === ld.chosenNumber);

      // Show center-screen result and continue
      this._showLeiDianResult(ld.chosenNumber, rolled, isMatch, target.name || '玩家', function() {
        if (isMatch) {
          var dmg = MediCard.CardEffects.applyDamage(target, 3);
          self._logAction('AI雷电牌击中 ' + (target.name || '玩家') + '！数字[' + rolled + ']一致，造成' + dmg + '点伤害');
          document.getElementById('phase-indicator').textContent = 'AI雷电牌击中！数字[' + rolled + ']，造成' + dmg + '点伤害';
          MediCard.CardVisuals.showDamageNumber('player-status', 100, 50, dmg, 'damage');
          MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#fbbf24', 5);
          // Track damage to player in singleplayer
          if (!self._isMultiplayer) {
            self._gameStats.damageTaken += dmg;
          }
          self._updateDisplay();
          if (!target.alive) {
            self._logAction((target.name || '玩家') + ' 被AI雷电牌击杀');
            self._checkGameEnd();
            if (!target.alive) {
              self._finishAILeiDian();
              return;
            }
          }
          self._finishAILeiDian();
        } else {
          self._logAction('AI雷电牌判定 ' + (target.name || '玩家') + '：数字[' + rolled + '] ≠ [' + ld.chosenNumber + ']，传递给下一位');
          document.getElementById('phase-indicator').textContent = 'AI雷电牌未命中[' + rolled + ' ≠ ' + ld.chosenNumber + ']';
          ld.currentTargetIdx = (targetIdx + 1) % gs.players.length;
          setTimeout(function() { self._executeAILeiDianStep(); }, 1200);
        }
      });
    },

    /** Cleanup after AI 雷电牌 chain ends */
    _finishAILeiDian: function() {
      var onComplete = this._aiLeiDianData && this._aiLeiDianData.onComplete;
      this._aiLeiDianData = null;
      this._updateDisplay();
      if (onComplete) {
        setTimeout(onComplete, 600);
      }
    },

    /* ============ 病历分析 (Peek Top 3, Reorder) ============ */

    /** Execute 病历分析: peek top 3 deck cards, player reorders them */
    _executeBingLiFenXi: function() {
      var self = this;
      var gs = MediCard.GameState;
      var peeked = gs.peekDeckTop(3);
      if (peeked.length === 0) {
        this._flashPhase('牌库已空，病历分析无效');
        this._pendingCard = null;
        this._selectedCardIndex = -1;
        this._updateDisplay();
        return;
      }

      this._logAction('📋 病历分析：查看牌库顶' + peeked.length + '张牌');

      // Show peek overlay with reorder buttons
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '2100';

      var content = document.createElement('div');
      content.className = 'modal-content';
      content.style.cssText = 'max-width:500px;text-align:center;animation:modalEnter 250ms ease-out;padding:20px;';

      var html = '<h3 style="margin-bottom:8px;">📋 病历分析</h3>';
      html += '<p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">查看牌库顶' + peeked.length + '张牌，可点击上下箭头调整顺序</p>';
      html += '<div id="bingli-cards" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">';

      for (var i = 0; i < peeked.length; i++) {
        var c = peeked[i];
        var typeInfo = MediCard.CardData.getTypeInfo(c.cardType);
        var icon = typeInfo.icon || '🃏';
        var color = typeInfo.color || '#64748b';
        html += '<div class="bingli-card-row glass-panel" data-idx="' + i + '" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;">';
        html += '<span style="font-size:20px;">' + icon + '</span>';
        html += '<span style="flex:1;text-align:left;margin-left:10px;color:' + color + ';font-weight:600;">' + (c.cardName || c.cardType) + '</span>';
        html += '<div style="display:flex;gap:4px;">';
        if (i > 0) {
          html += '<button class="btn btn-ghost btn-sm bingli-up" data-idx="' + i + '">▲</button>';
        }
        if (i < peeked.length - 1) {
          html += '<button class="btn btn-ghost btn-sm bingli-down" data-idx="' + i + '">▼</button>';
        }
        html += '</div></div>';
      }

      html += '</div>';
      html += '<button class="btn btn-primary" id="bingli-confirm">✅ 确认顺序并放回</button>';
      html += '<button class="btn btn-ghost btn-sm" id="bingli-cancel" style="margin-left:8px;">取消</button>';
      content.innerHTML = html;
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      // Reorder state (indices into peeked array)
      var order = [];
      for (var o = 0; o < peeked.length; o++) order.push(o);

      function reorderUI() {
        var rows = content.querySelectorAll('.bingli-card-row');
        // Rebuild display based on current order
        var cardList = document.getElementById('bingli-cards');
        if (!cardList) return;
        cardList.innerHTML = '';
        for (var ri = 0; ri < order.length; ri++) {
          var ci = order[ri];
          var c = peeked[ci];
          var typeInfo = MediCard.CardData.getTypeInfo(c.cardType);
          var icon = typeInfo.icon || '🃏';
          var color = typeInfo.color || '#64748b';
          var row = document.createElement('div');
          row.className = 'bingli-card-row glass-panel';
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;';
          row.innerHTML = '<span style="font-size:20px;">' + icon + '</span>' +
            '<span style="flex:1;text-align:left;margin-left:10px;color:' + color + ';font-weight:600;">' + (c.cardName || c.cardType) + '</span>' +
            '<div style="display:flex;gap:4px;">' +
            (ri > 0 ? '<button class="btn btn-ghost btn-sm bingli-up" data-ri="' + ri + '">▲</button>' : '') +
            (ri < order.length - 1 ? '<button class="btn btn-ghost btn-sm bingli-down" data-ri="' + ri + '">▼</button>' : '') +
            '</div>';
          cardList.appendChild(row);
        }
        // Re-wire up/down buttons
        cardList.querySelectorAll('.bingli-up').forEach(function(btn) {
          btn.onclick = function() {
            var ri = parseInt(this.getAttribute('data-ri'));
            if (ri > 0) { var t = order[ri]; order[ri] = order[ri - 1]; order[ri - 1] = t; }
            reorderUI();
          };
        });
        cardList.querySelectorAll('.bingli-down').forEach(function(btn) {
          btn.onclick = function() {
            var ri = parseInt(this.getAttribute('data-ri'));
            if (ri < order.length - 1) { var t = order[ri]; order[ri] = order[ri + 1]; order[ri + 1] = t; }
            reorderUI();
          };
        });
      }

      // Wire initial buttons
      reorderUI();

      document.getElementById('bingli-confirm').addEventListener('click', function() {
        // Remove peeked cards from deck top (they were peeked but not drawn)
        var cardsToReplace = [];
        for (var ci = 0; ci < order.length; ci++) {
          var card = gs.drawFromPeek(0); // Draw from top
          if (card) cardsToReplace.push(card);
        }
        // Put back in chosen order (reverse order: last in order = top of deck)
        for (var ri = order.length - 1; ri >= 0; ri--) {
          var idx = order[ri];
          var cardObj = peeked[idx];
          // Find matching card in cardsToReplace
          for (var cr = 0; cr < cardsToReplace.length; cr++) {
            if (cardsToReplace[cr].id === cardObj.id) {
              gs.deck.push(cardsToReplace[cr]);
              cardsToReplace.splice(cr, 1);
              break;
            }
          }
        }
        self._logAction('📋 病历分析：已按选定顺序放回牌库顶');
        overlay.remove();
        self._pendingCard = null;
        self._selectedCardIndex = -1;
        self._updateDisplay();
      });

      document.getElementById('bingli-cancel').addEventListener('click', function() {
        overlay.remove();
        self._pendingCard = null;
        self._selectedCardIndex = -1;
        self._updateDisplay();
      });

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) { overlay.remove(); }
      });
    },

    /** Quick game-end check after damage */
    _checkGameEnd: function() {
      var v = MediCard.Victory.check(MediCard.GameState.players);
      if (v) this._endGame(v);
    },

    /** Turn-proportional 雷电牌 card injection. Probability increases with turn count. */
    _maybeInjectLeiDian: function(player) {
      if (!player || !player.hand || player.hand.length >= MediCard.Resources.getHandLimit(player)) return;
      this._turnCount++;
      var chance = Math.min(0.4, this._turnCount / 25);
      if (Math.random() < chance) {
        var ldCard = MediCard.CardData.createTacticCard ? MediCard.CardData.createTacticCard('leiDian') : null;
        if (!ldCard) {
          // Fallback: create a basic 雷电牌 card manually
          ldCard = {
            id: 'tac_leiDian_' + this._turnCount,
            cardType: 'tactic', cardSubtype: 'leiDian', cardName: '雷电牌',
            rarity: 'rare', energyCost: 1, cardEffect: '选定数字0~9，从下家开始顺时针判定，数字一致时扣3血',
            subject: 'tactic', subjectId: 'tactic'
          };
        }
        player.hand.push(ldCard);
        this._logAction('⚡ 回合' + this._turnCount + '：雷电牌概率触发，获得1张雷电牌牌');
      }
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
      this._trackAnswer(result, card);

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
      var firstOpp = this._isMultiplayer ? this._getFirstOpponent() : null;
      var opponent = firstOpp ? firstOpp.player : this._aiPlayer;
      var idx = this._pendingCard.index;

      player.hand.splice(idx, 1);
      this._trackAnswer(result, card);

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
        if (opponent && opponent.vaccineTurns > 0) {
          MediCard.GameState.discardPile.push(card);
          this._flashPhase('💉 ' + (opponent.name || '对手') + '有疫苗接种保护，无法施加负面延时锦囊');
        } else if (opponent) {
          if (!opponent.delayedTactics) opponent.delayedTactics = [];
          opponent.delayedTactics.push(card);
          this._flashPhase('⏳ 对' + (opponent.name || '对手') + '使用了 ' + card.cardName + '！将在其回合判定阶段触发');
        }
      }

      this._pendingCard = null;
      this._selectedCardIndex = -1;
      this._updateDisplay();
    },

    /* ============ Response Phase (Player attacked by AI) ============ */

    _startResponsePhase(attackCard) {
      var self = this;
      // Clean up any previous response phase (prevents timer/listener leaks)
      if (this._responseTimer) { clearInterval(this._responseTimer); this._responseTimer = null; }
      var prevResponse = document.getElementById('response-zone');
      if (prevResponse) prevResponse.style.display = 'none';

      this._attackInProgress = { card: attackCard, fromPlayer: false };
      this._turnActive = false;

      var responseEl = document.getElementById('response-zone');
      if (!responseEl) return;

      responseEl.style.display = 'flex';
      responseEl.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:16px;padding:12px;margin:8px 0;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;';

      var hasDefense = this._player.hand.some(function(c) { return c.cardType === 'defense'; });

      responseEl.innerHTML = '' +
        '<span style="color:#fca5a5;font-weight:700;">⚠️ AI攻击你！</span>' +
        '<span id="response-timer" style="font-family:var(--font-mono);font-weight:700;font-size:16px;color:#fbbf24;">15</span>' +
        '<button class="btn btn-sm" id="btn-defend" style="background:rgba(59,130,246,0.3);border-color:#3b82f6;color:#93c5fd;" ' + (!hasDefense ? 'disabled' : '') + '>🛡️ 防御' + (!hasDefense ? '(无防御牌)' : '') + '</button>' +
        '<button class="btn btn-sm btn-ghost" id="btn-skip-defend">跳过</button>';

      var timeLeft = 15;
      this._responseTimer = setInterval(function() {
        timeLeft--;
        var timerEl = document.getElementById('response-timer');
        if (timerEl) {
          timerEl.textContent = timeLeft;
          timerEl.style.color = timeLeft <= 5 ? 'var(--accent-red)' : '#fbbf24';
        }
        if (timeLeft <= 0) {
          clearInterval(self._responseTimer);
          self._responseTimer = null;
          self._onSkipDefend();
        }
      }, 1000);

      document.getElementById('btn-defend').addEventListener('click', function() {
        if (self._responseTimer) { clearInterval(self._responseTimer); self._responseTimer = null; }
        self._onPlayerDefend();
      });

      document.getElementById('btn-skip-defend').addEventListener('click', function() {
        if (self._responseTimer) { clearInterval(self._responseTimer); self._responseTimer = null; }
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
        self._trackAnswer(result, defCard);
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

      // Check for immuneNextHit (免疫屏障 basic mode)
      if (player.immuneNextHit) {
        player.immuneNextHit = false;
        this._flashPhase('🛡️ 免疫屏障挡住了本次伤害！');
        this._logAction('免疫屏障挡住AI攻击伤害');
        return;
      }

      // Check for 应急预案 auto-block
      var yjyIdx = -1;
      for (var yi = 0; yi < player.hand.length; yi++) {
        if (player.hand[yi].cardType === 'yingjiYuan' || player.hand[yi].isYingjiYuan) { yjyIdx = yi; break; }
      }
      if (yjyIdx >= 0) {
        var yjyCard = player.hand.splice(yjyIdx, 1)[0];
        MediCard.GameState.discardPile.push(yjyCard);
        this._flashPhase('🆘 应急预案发动！自动免疫本次伤害');
        this._logAction('应急预案自动消耗，免疫AI攻击伤害');
        this._updateDisplay();
        return;
      }

      // Build damage breakdown
      var parts = [];
      var baseDmg = 1;
      var armorReduction = 0;
      var identityBonus = MediCard.IdentitySkills.getDamageBonus(ai, player);
      var attackPotionBonus = (ai.attackBonus || 0);

      var bonus = identityBonus + attackPotionBonus;
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

      parts.push('基础1');
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
      if (this._duelInProgress || this._juedouDefending) { this._flashPhase('⚔️ 决斗进行中，无法结束回合'); return; }
      if (MediCard.BattleLogger) MediCard.BattleLogger.log('USER_ACTION', 'end_turn', 'Player ended turn');
      var gs = MediCard.GameState;
      var victory = MediCard.Victory.check(gs.players);
      if (victory) {
        this._endGame(victory);
        return;
      }

      // Check hand limit BEFORE ending — player must discard first
      var player = this._player;
      var limit = MediCard.Resources.getHandLimit(player);
      var excess = player.hand.length - limit;
      if (excess > 0) {
        this._flashPhase('⚠️ 手牌超过上限 ' + excess + ' 张，请先弃牌再结束回合');
        return;
      }

      this._turnActive = false;

      // Aggressively clear ALL stale state that could interfere
      this._pendingCard = null;
      this._attackInProgress = null;
      this._selectedCardIndex = -1;
      this._selectedDiscardIndices = [];
      this._pendingAttackCardIndex = -1;
      this._attackTargetIndex = -1;
      if (this._responseTimer) { clearInterval(this._responseTimer); this._responseTimer = null; }
      var respZone = document.getElementById('response-zone');
      if (respZone) respZone.style.display = 'none';

      // Reset player's attack bonus
      this._player.attackBonus = 0;

      if (this._isMultiplayer) {
        if (!this._isHost) {
          MediCard.NetworkClient.sendEndTurn();
          this._turnActive = false;
          this._updateDisplay();
        } else {
          this._continueNewTurn();
        }
        return;
      }

      // Single player
      this._executeAITurn();
    },

    _startDiscardPhase(excess, callback) {
      this._pendingDiscard = { needed: excess, callback: callback };
      this._isDiscardPhase = true;
      this._selectedDiscardIndices = [];

      var phaseEl = document.getElementById('phase-indicator');
      if (phaseEl) {
        phaseEl.textContent = '💔 弃牌阶段：请选择 ' + excess + ' 张牌后点击弃牌按钮';
        phaseEl.style.color = 'var(--accent-yellow)';
      }

      // Show discard zone indicator above the hand
      var handEl = document.getElementById('player-hand');
      if (handEl && handEl.parentNode && !document.getElementById('discard-zone-indicator')) {
        var zoneEl = document.createElement('div');
        zoneEl.id = 'discard-zone-indicator';
        zoneEl.style.cssText = 'text-align:center;padding:8px 0 4px;font-size:13px;font-weight:700;' +
          'color:rgba(239,68,68,0.9);animation:timer-pulse 1.2s ease-in-out infinite;';
        zoneEl.textContent = '⬆️ 弃牌区 — 点击手牌选择要弃置的卡牌 ⬆️';
        handEl.parentNode.insertBefore(zoneEl, handEl);
      }

      this._updateDisplay();
    },

    _onDiscardActionButton() {
      if (this._duelInProgress || this._juedouDefending) { this._flashPhase('⚔️ 决斗进行中，无法弃牌'); return; }
      if (!this._turnActive || this._attackInProgress) return;

      if (this._isDiscardPhase) {
        // In discard phase — confirm the selection
        this._onDiscardButton();
        return;
      }

      // Enter discard phase
      var limit = MediCard.Resources.getHandLimit(this._player);
      var excess = this._player.hand.length - limit;
      if (excess <= 0) {
        this._flashPhase('✅ 手牌已在安全线内，无需弃牌');
        return;
      }
      var self = this;
      this._startDiscardPhase(excess, function() {
        // No-op: cleanup is handled inline in _onDiscardButton
      });
    },

    _updateDiscardActionButton() {
      var btn = document.getElementById('btn-discard-action');
      if (!btn) return;
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;
      var isMyTurn = MediCard.GameState.currentPlayerIndex === myIdx && this._turnActive && !this._attackInProgress;
      var limit = MediCard.Resources.getHandLimit(this._player);
      var exceeds = this._player.hand.length > limit && limit > 0;

      if (this._isDiscardPhase) {
        var count = this._selectedDiscardIndices.length;
        btn.textContent = count > 0 ? '✅ 确认弃牌 (' + count + ')' : '🗑️ 请选择卡牌';
        btn.className = 'btn btn-sm';
        btn.style.cssText = 'flex:1;min-height:44px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.35);color:#fca5a5;font-weight:600;';
        btn.disabled = count === 0;
        btn.style.opacity = count > 0 ? '1' : '0.5';
      } else if (!isMyTurn) {
        btn.textContent = '🗑️ 弃牌';
        btn.className = 'btn btn-ghost btn-sm';
        btn.style.cssText = 'flex:1;';
        btn.disabled = true;
        btn.style.opacity = '0.4';
      } else if (exceeds) {
        btn.textContent = '🗑️ 弃牌';
        btn.className = 'btn btn-ghost btn-sm';
        btn.style.cssText = 'flex:1;';
        btn.disabled = false;
        btn.style.opacity = '1';
      } else {
        btn.textContent = '🗑️ 弃牌';
        btn.className = 'btn btn-ghost btn-sm';
        btn.style.cssText = 'flex:1;';
        btn.disabled = true;
        btn.style.opacity = '0.4';
      }
    },

    _renderDiscardHand() {
      var container = document.getElementById('player-hand');
      if (!container) return;
      var player = this._player;
      if (!player || !player.hand) return;
      var self = this;
      var count = player.hand.length;
      var isMobile = window.innerWidth <= 480;
      var maxAngle = isMobile ? (count > 4 ? 20 : 25) : 35;
      var totalAngle = Math.min(count * (isMobile ? 3 : 5), maxAngle);
      var startAngle = -totalAngle / 2;
      var angleStep = count > 1 ? totalAngle / (count - 1) : 0;
      var liftMult = isMobile ? 1.4 : 2;

      container.innerHTML = '';
      container.className = 'player-hand hand-cards discard-phase-active';

      player.hand.forEach(function(card, idx) {
        var cardEl = MediCard.CardVisuals.createCardElement(card);
        var angle = startAngle + angleStep * idx;
        var translateY = Math.abs(angle) * liftMult;

        cardEl.style.setProperty('--fan-angle', angle + 'deg');
        cardEl.style.setProperty('--fan-lift', translateY + 'px');
        cardEl.style.setProperty('--fan-idx', idx + 1);
        cardEl.style.pointerEvents = 'auto';

        if (self._selectedDiscardIndices.indexOf(idx) >= 0) {
          var liftPx = isMobile ? '-30px' : '-48px';
          cardEl.style.setProperty('--fan-angle', '0deg');
          cardEl.style.setProperty('--fan-lift', liftPx);
          cardEl.style.setProperty('--fan-scale', '1.05');
          cardEl.style.setProperty('--fan-idx', '50');
          cardEl.style.boxShadow = '0 -4px 20px rgba(239,68,68,0.55), 0 0 8px rgba(239,68,68,0.3)';
          cardEl.style.outline = '2px solid rgba(239,68,68,0.6)';
          cardEl.style.outlineOffset = '2px';
          cardEl.style.borderRadius = '10px';
          cardEl.classList.add('discard-selected');
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
          self._updateDiscardActionButton();
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
      this._logAction('AI进入判定阶段');

      // === Judgment Phase ===
      this._runAIJudgment(function() {
        // === Draw Phase ===
        // Decrement vaccine turns
        if (ai.vaccineTurns > 0) ai.vaccineTurns--;
        // AI lord heal
        MediCard.IdentitySkills.applyTurnStartEffects(ai);
        // Draw cards per turn config (+extra for spy identity)
        var extraDraw = MediCard.IdentitySkills.getExtraDraw(ai);
        var drawCount = MediCard.Config.defaults.drawPerTurn + extraDraw;
        gs.drawCards(1, drawCount);
        MediCard.Audio.playCardDraw();
        self._logAction('AI摸了' + drawCount + '张牌');

        // === Check skip (麻醉剂) ===
        if (ai.skipNextTurn) {
          ai.skipNextTurn = false;
          document.getElementById('phase-indicator').textContent = 'AI被麻醉，跳过回合';
          self._logAction('AI被麻醉跳过回合');
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 1000);
          return;
        }

        // === Play Phase ===
        if (ai.skipNextPlayPhase) {
          ai.skipNextPlayPhase = false;
          document.getElementById('phase-indicator').textContent = 'AI被隔离观察，跳过出牌阶段';
          self._logAction('AI被隔离观察，跳过出牌');
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 800);
          return;
        }
        if (ai.skipNextAttackOnly) {
          ai.skipNextAttackOnly = false;
          ai._skipAttacksThisTurn = true;
          self._logAction('AI被隔离观察，本回合不能出攻击牌');
        }

        document.getElementById('phase-indicator').textContent = 'AI 正在思考...';
        self._logAction('AI正在思考策略...');
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
        var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[self._difficulty] || 0.55;
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
      var diff = this._difficulty || 'normal';
      var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[diff] || 0.55;
      var attackPriority = { easy: 0.60, normal: 0.70, hard: 0.85 }[diff] || 0.70;
      var equipPriority = { easy: 0.70, normal: 0.80, hard: 0.85 }[diff] || 0.80;
      var delay = 700;

      var aiAttacksThisTurn = 0;

      function playNextAICard() {
        if (!ai.alive || !player.alive || ai.hand.length === 0) {
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 600);
          return;
        }

        // Build categorized playable lists for weighted selection
        var attackIndices = [], equipIndices = [], otherIndices = [];
        for (var i = 0; i < ai.hand.length; i++) {
          var c = ai.hand[i];
          if (c.cardType === 'defense') continue;
          // 急救 only if HP <= 1
          if (c.cardSubtype === 'jiJiu' && ai.resources.hp.current > 1) continue;
          // Limit attacks per AI turn
          var aiMaxAtt = ai.maxAttacks || 1;
          if ((c.cardType === 'attack' || c.cardType === 'juesha') && aiAttacksThisTurn >= aiMaxAtt) continue;
          // Skip attacks if 隔离观察 basic mode
          if ((c.cardType === 'attack' || c.cardType === 'juesha') && ai._skipAttacksThisTurn) continue;
          if (c.cardType === 'attack' || c.cardType === 'juesha') {
            attackIndices.push(i);
          } else if (c.cardType === 'equipment') {
            equipIndices.push(i);
          } else {
            otherIndices.push(i);
          }
        }

        var totalPlayable = attackIndices.length + equipIndices.length + otherIndices.length;
        if (totalPlayable === 0) {
          self._enforceHandLimit(ai);
          self._updateDisplay();
          setTimeout(function() { self._startNewTurn(); }, 600);
          return;
        }

        // Weighted card selection: prioritize attacks, then equipment
        var idx;
        if (attackIndices.length > 0 && Math.random() < attackPriority) {
          idx = attackIndices[Math.floor(Math.random() * attackIndices.length)];
        } else {
          var nonAttack = equipIndices.concat(otherIndices);
          if (equipIndices.length > 0 && otherIndices.length > 0) {
            idx = (Math.random() < equipPriority)
              ? equipIndices[Math.floor(Math.random() * equipIndices.length)]
              : otherIndices[Math.floor(Math.random() * otherIndices.length)];
          } else if (nonAttack.length > 0) {
            idx = nonAttack[Math.floor(Math.random() * nonAttack.length)];
          } else {
            idx = attackIndices[Math.floor(Math.random() * attackIndices.length)];
          }
        }
        var card = ai.hand[idx];

        // Remove from hand
        ai.hand.splice(idx, 1);

        switch (card.cardType) {
          case 'attack':
            aiAttacksThisTurn++;
            document.getElementById('phase-indicator').textContent = 'AI 使用攻击牌 — 你来答题！';
            self._logAction('AI使用攻击牌 — 等你答题');
            self._updateDisplay();
            MediCard.Audio.playCardPlay(card.rarity);
            MediCard.QuestionPopup.show(card, function(result) {
              self._trackAnswer(result, card);
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
                self._logAction('AI治疗自己，+1HP');
                MediCard.CardVisuals.showDamageNumber('opponent-zone', 100, 50, healed, 'heal');
                MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#10b981', 3);
              }
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，治疗牌作废';
              self._logAction('AI答错治疗题，治疗无效');
            }
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
            break;

          case 'tactic':
            gs.discardPile.push(card);
            var tacCorrect = Math.random() < correctChance;
            if (tacCorrect) {
              if (card.cardSubtype === 'leiDian') {
                // 雷电牌 async chain — handles its own continuation
                self._logAction('AI使用锦囊「雷电牌」');
                self._startAILeiDianChain(card, ai, player, playNextAICard);
                return;
              }
              self._logAction('AI使用锦囊「' + (card.cardName || '') + '」');
              self._resolveAITactic(card, ai, player);
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，锦囊作废';
              self._logAction('AI答错锦囊题，锦囊作废');
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
                self._logAction('AI装备了「' + card.cardName + '」');
                MediCard.CardVisuals.spawnParticles('opponent-zone', 100, 50, '#10b981', 4);
              }
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，装备作废';
              self._logAction('AI答错装备题，装备作废');
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
                self._logAction('AI使用了疫苗接种');
              } else {
                if (player.vaccineTurns > 0) {
                  document.getElementById('phase-indicator').textContent = '玩家有疫苗保护，AI延时锦囊无效';
                  self._logAction('疫苗保护，AI延时锦囊无效');
                } else {
                  if (!player.delayedTactics) player.delayedTactics = [];
                  player.delayedTactics.push(card);
                  document.getElementById('phase-indicator').textContent = 'AI对玩家使用了 ' + card.cardName;
                  self._logAction('AI对你使用了「' + card.cardName + '」');
                }
              }
            } else {
              document.getElementById('phase-indicator').textContent = 'AI答错了，延时锦囊作废';
              self._logAction('AI答错延时锦囊题，作废');
            }
            self._updateDisplay();
            setTimeout(playNextAICard, delay);
            break;

          case 'juedou':
            gs.discardPile.push(card);
            self._logAction('AI使用决斗！' + (player.name || '玩家') + '必须出杀答题');
            self._resolveAIJuedou(card, ai, player, playNextAICard);
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
      var gs = MediCard.GameState;
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
        case 'qiGuanZhaiChu':
          var hasEquip = player.equipment && Object.keys(player.equipment).some(function(s) { return player.equipment[s]; });
          if (hasEquip) {
            var slots = MediCard.Config.equipmentSlots || ['weapon','armor','accessory','mount','tool'];
            var filledSlots = slots.filter(function(s) { return player.equipment[s]; });
            var pickSlot = filledSlots[Math.floor(Math.random() * filledSlots.length)];
            var removed = player.equipment[pickSlot];
            player.equipment[pickSlot] = null;
            gs.discardPile.push(removed);
            document.getElementById('phase-indicator').textContent = 'AI器官摘除！摘除了你的「' + (removed.cardName || pickSlot) + '」';
            this._logAction('AI器官摘除：摘除了你的装备「' + (removed.cardName || pickSlot) + '」');
          } else if (player.hand.length > 0) {
            var rIdx = Math.floor(Math.random() * player.hand.length);
            gs.discardPile.push(player.hand.splice(rIdx, 1)[0]);
            document.getElementById('phase-indicator').textContent = 'AI器官摘除！盲弃了你1张手牌';
            this._logAction('AI器官摘除：盲弃了你1张手牌');
          } else {
            document.getElementById('phase-indicator').textContent = 'AI器官摘除失败，你没有可摘除的牌';
            this._logAction('AI器官摘除失败（无目标）');
          }
          break;
        case 'yangBenCaiJi':
          var ybEq = player.equipment || {};
          var ybSlots = MediCard.Config.equipmentSlots || ['weapon','armor','accessory','mount','tool'];
          var ybFilled = ybSlots.filter(function(s) { return ybEq[s]; });
          var ybHasEquip = ybFilled.length > 0;
          var ybHasHand = player.hand && player.hand.length > 0;
          if (!ybHasEquip && !ybHasHand) {
            document.getElementById('phase-indicator').textContent = 'AI样本采集失败，你没有可采集的牌';
            this._logAction('AI样本采集失败（无目标）');
          } else {
            var ybMode;
            if (ybHasEquip && ybHasHand) {
              ybMode = Math.random() < 0.5 ? 'equipment' : 'hand';
            } else if (ybHasEquip) {
              ybMode = 'equipment';
            } else {
              ybMode = 'hand';
            }
            if (ybMode === 'equipment') {
              var ybPick = ybFilled[Math.floor(Math.random() * ybFilled.length)];
              var ybStolen = player.equipment[ybPick];
              player.equipment[ybPick] = null;
              var ybOld = ai.equipment[ybPick];
              if (ybOld) gs.discardPile.push(ybOld);
              ai.equipment[ybPick] = ybStolen;
              document.getElementById('phase-indicator').textContent = 'AI样本采集！偷取了你的「' + (ybStolen.cardName || ybPick) + '」';
              this._logAction('AI样本采集：偷取了你的装备「' + (ybStolen.cardName || ybPick) + '」');
            } else {
              var ybRIdx = Math.floor(Math.random() * player.hand.length);
              ai.hand.push(player.hand.splice(ybRIdx, 1)[0]);
              document.getElementById('phase-indicator').textContent = 'AI样本采集！偷取了你的1张手牌';
              this._logAction('AI样本采集：偷取了你的1张手牌');
            }
          }
          break;
        case 'leiDian':
          // Handled inline in _playAICards — should not reach here
          break;
        case 'bingLiFenXi':
          // AI peeks top 3, randomly reorders (effectively no change but logs)
          if (gs.deck.length > 0) {
            var peekedCount = Math.min(3, gs.deck.length);
            document.getElementById('phase-indicator').textContent = 'AI病历分析：查看了牌库顶' + peekedCount + '张牌';
            this._logAction('AI病历分析：查看了牌库顶' + peekedCount + '张牌');
          }
          break;
      }
    },

    /* ============ Multiplayer AI Turn (host-side) ============ */

    /** Execute a full AI turn for a multiplayer AI bot. Runs on host, syncs results. */
    _executeMultiplayerAITurn: function(aiPlayer) {
      var self = this;
      var gs = MediCard.GameState;
      var ai = aiPlayer;

      if (!ai.alive) { this._continueNewTurn(); return; }

      // Pick a random alive human target (prefer non-AI, alive players)
      var humanTargets = gs.players.filter(function(p) { return p.alive && !p.isAI && p.id !== ai.id; });
      if (humanTargets.length === 0) {
        // Fallback: target any alive non-self player
        humanTargets = gs.players.filter(function(p) { return p.alive && p.id !== ai.id; });
      }
      if (humanTargets.length === 0) { this._continueNewTurn(); return; }
      var target = humanTargets[Math.floor(Math.random() * humanTargets.length)];

      var diff = ai.aiDifficulty || 'normal';
      var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[diff] || 0.55;

      // Reset per-turn state
      ai.attackBonus = 0;
      if (!ai.maxAttacks) ai.maxAttacks = 1;

      this._logAction('🤖 ' + (ai.name || 'AI') + ' 的回合开始');
      document.getElementById('phase-indicator').textContent = (ai.name || 'AI') + ' 回合 — 判定阶段...';
      this._updateDisplay();

      // === Judgment Phase ===
      this._runMultiplayerAIJudgment(ai, function() {
        // === Draw Phase ===
        if (ai.vaccineTurns > 0) ai.vaccineTurns--;
        MediCard.IdentitySkills.applyTurnStartEffects(ai);
        var extraDraw = MediCard.IdentitySkills.getExtraDraw(ai);
        gs.drawCards(gs.currentPlayerIndex, MediCard.Config.defaults.drawPerTurn + extraDraw);
        self._logAction('🤖 ' + (ai.name || 'AI') + ' 摸了' + (MediCard.Config.defaults.drawPerTurn + extraDraw) + '张牌');
        self._updateDisplay();

        // === Check skip ===
        if (ai.skipNextTurn) {
          ai.skipNextTurn = false;
          self._logAction((ai.name || 'AI') + ' 被麻醉，跳过回合');
          self._enforceHandLimit(ai);
          self._syncAIState();
          setTimeout(function() { self._continueNewTurn(); }, 1000);
          return;
        }
        if (ai.skipNextPlayPhase) {
          ai.skipNextPlayPhase = false;
          self._logAction((ai.name || 'AI') + ' 被隔离观察，跳过出牌');
          self._enforceHandLimit(ai);
          self._syncAIState();
          setTimeout(function() { self._continueNewTurn(); }, 800);
          return;
        }

        document.getElementById('phase-indicator').textContent = (ai.name || 'AI') + ' 正在思考...';
        self._logAction('🤖 ' + (ai.name || 'AI') + ' 正在思考策略...');
        self._updateDisplay();

        setTimeout(function() { self._playMultiplayerAICards(ai, target, correctChance); }, 800);
      });
    },

    /** Run judgment phase for multiplayer AI (skip delayed tactics or auto-resolve) */
    _runMultiplayerAIJudgment: function(ai, callback) {
      var self = this;
      var gs = MediCard.GameState;
      var diff = ai.aiDifficulty || 'normal';
      var correctChance = { easy: 0.25, normal: 0.55, hard: 0.80 }[diff] || 0.55;

      if (!ai.delayedTactics || ai.delayedTactics.length === 0) { callback(); return; }

      var dt = ai.delayedTactics.slice();
      ai.delayedTactics = [];

      function processNext() {
        if (dt.length === 0) { callback(); return; }
        var card = dt.shift();
        if (Math.random() < correctChance) {
          self._logAction((ai.name || 'AI') + ' 判定成功，' + (card.cardName || '延时') + '被化解');
          gs.discardPile.push(card);
          setTimeout(processNext, 400);
        } else {
          var effect = MediCard.CardEffects.resolveDelayedTactic(card, ai, false);
          self._logAction(effect.message);
          gs.discardPile.push(card);
          if (effect.lethal) {
            self._checkGameEnd();
            self._syncAIState();
            return;
          }
          setTimeout(processNext, 600);
        }
      }
      processNext();
    },

    /** Auto-play cards for multiplayer AI with sync after each action */
    _playMultiplayerAICards: function(ai, target, correctChance) {
      var self = this;
      var gs = MediCard.GameState;
      var diff = ai.aiDifficulty || 'normal';
      var attackPriority = { easy: 0.60, normal: 0.70, hard: 0.85 }[diff] || 0.70;
      var equipPriority = { easy: 0.70, normal: 0.80, hard: 0.85 }[diff] || 0.80;
      var aiAttacksThisTurn = 0;

      function playNextCard() {
        if (!ai.alive || ai.hand.length === 0) {
          self._enforceHandLimit(ai);
          self._syncAIState();
          self._logAction('🤖 ' + (ai.name || 'AI') + ' 回合结束');
          setTimeout(function() { self._continueNewTurn(); }, 800);
          return;
        }

        // Build categorized lists
        var attackIndices = [], equipIndices = [], otherIndices = [];
        for (var i = 0; i < ai.hand.length; i++) {
          var c = ai.hand[i];
          if (c.cardType === 'defense') continue;
          if (c.cardSubtype === 'jiJiu' && ai.resources.hp.current > 1) continue;
          if ((c.cardType === 'attack' || c.cardType === 'juesha') && aiAttacksThisTurn >= (ai.maxAttacks || 1)) continue;
          if ((c.cardType === 'attack' || c.cardType === 'juesha') && ai._skipAttacksThisTurn) continue;
          if (c.cardType === 'attack' || c.cardType === 'juesha') {
            attackIndices.push(i);
          } else if (c.cardType === 'equipment') {
            equipIndices.push(i);
          } else {
            otherIndices.push(i);
          }
        }

        var totalPlayable = attackIndices.length + equipIndices.length + otherIndices.length;
        if (totalPlayable === 0) {
          self._enforceHandLimit(ai);
          self._syncAIState();
          self._logAction('🤖 ' + (ai.name || 'AI') + ' 无可出牌，回合结束');
          setTimeout(function() { self._continueNewTurn(); }, 800);
          return;
        }

        // Weighted selection
        var idx;
        if (attackIndices.length > 0 && Math.random() < attackPriority) {
          idx = attackIndices[Math.floor(Math.random() * attackIndices.length)];
        } else {
          var nonAttack = equipIndices.concat(otherIndices);
          if (equipIndices.length > 0 && otherIndices.length > 0) {
            idx = (Math.random() < equipPriority)
              ? equipIndices[Math.floor(Math.random() * equipIndices.length)]
              : otherIndices[Math.floor(Math.random() * otherIndices.length)];
          } else if (nonAttack.length > 0) {
            idx = nonAttack[Math.floor(Math.random() * nonAttack.length)];
          } else {
            idx = attackIndices[Math.floor(Math.random() * attackIndices.length)];
          }
        }

        var card = ai.hand[idx];
        ai.hand.splice(idx, 1);

        switch (card.cardType) {
          case 'attack':
          case 'juesha':
            aiAttacksThisTurn++;
            var answered = Math.random() < correctChance;
            gs.discardPile.push(card);
            if (answered) {
              var atkBonus = ai.attackBonus || 0;
              var baseDmg = 1 + atkBonus;
              var dmgResult = MediCard.Resources.dealDamage(target, baseDmg);
              self._logAction('🤖 ' + (ai.name || 'AI') + ' 使用' + (card.cardName || '攻击') + '，' + (target.name || '玩家') + ' 受到' + dmgResult.actual + '点伤害');
              self._syncAIState();
              if (!target.alive) {
                self._logAction((target.name || '玩家') + ' 被击杀');
                self._checkGameEnd();
              }
            } else {
              self._logAction('🤖 ' + (ai.name || 'AI') + ' 使用' + (card.cardName || '攻击') + '但失败了');
            }
            self._updateDisplay();
            setTimeout(playNextCard, 600);
            break;

          case 'heal':
            gs.discardPile.push(card);
            if (Math.random() < correctChance) {
              MediCard.Resources.healDamage(ai, 1);
              self._logAction('🤖 ' + (ai.name || 'AI') + ' 治疗自己，+1HP');
            } else {
              self._logAction('🤖 ' + (ai.name || 'AI') + ' 治疗失败');
            }
            self._updateDisplay();
            self._syncAIState();
            setTimeout(playNextCard, 500);
            break;

          case 'tactic':
            gs.discardPile.push(card);
            if (Math.random() < correctChance) {
              self._resolveMultiplayerAITactic(card, ai, target);
            } else {
              self._logAction('🤖 ' + (ai.name || 'AI') + ' 锦囊「' + (card.cardName || '') + '」失败');
            }
            self._updateDisplay();
            self._syncAIState();
            setTimeout(playNextCard, 600);
            break;

          case 'equipment':
            gs.discardPile.push(card);
            if (Math.random() < correctChance) {
              var slot = card.equipSlot;
              if (slot) {
                var old = ai.equipment[slot];
                if (old) gs.discardPile.push(old);
                ai.equipment[slot] = card;
                self._logAction('🤖 ' + (ai.name || 'AI') + ' 装备了「' + card.cardName + '」');
              }
            } else {
              self._logAction('🤖 ' + (ai.name || 'AI') + ' 装备「' + (card.cardName || '') + '」失败');
            }
            self._updateDisplay();
            self._syncAIState();
            setTimeout(playNextCard, 500);
            break;

          default:
            gs.discardPile.push(card);
            self._updateDisplay();
            setTimeout(playNextCard, 400);
        }
      }

      playNextCard();
    },

    /** Resolve a tactic for multiplayer AI */
    _resolveMultiplayerAITactic: function(card, ai, target) {
      var gs = MediCard.GameState;
      var name = ai.name || 'AI';
      switch (card.cardSubtype) {
        case 'huiZhen':
          gs.drawCards(gs.currentPlayerIndex, 2);
          this._logAction('🤖 ' + name + ' 会诊，摸了2张牌');
          break;
        case 'wuZhen':
          if (target.hand.length > 0 && !(target.equipment && target.equipment.accessory && target.equipment.accessory.cardSubtype === 'fangHu')) {
            var rIdx = Math.floor(Math.random() * target.hand.length);
            var discarded = target.hand.splice(rIdx, 1)[0];
            gs.discardPile.push(discarded);
            this._logAction('🤖 ' + name + ' 误诊，' + (target.name || '玩家') + ' 弃了1张牌');
          }
          break;
        case 'geLi':
          if (!(target.equipment && target.equipment.accessory && target.equipment.accessory.cardSubtype === 'fangHu')) {
            target.skipNextPlayPhase = true;
            this._logAction('🤖 ' + name + ' 隔离观察，' + (target.name || '玩家') + ' 下回合不能出牌');
          }
          break;
        case 'jiJiu':
          MediCard.Resources.healDamage(ai, 1);
          this._logAction('🤖 ' + name + ' 急救，+1HP');
          break;
        case 'yaoXiao':
          ai.attackBonus = (ai.attackBonus || 0) + 1;
          this._logAction('🤖 ' + name + ' 药效增强，攻击+1');
          break;
        case 'mianYi':
          ai.immuneUntilNextTurn = true;
          this._logAction('🤖 ' + name + ' 免疫屏障');
          break;
        case 'duoJi':
          ai.maxAttacks = (ai.maxAttacks || 1) + 1;
          this._logAction('🤖 ' + name + ' 多重打击，可攻击' + ai.maxAttacks + '次');
          break;
        case 'jiaoCha':
          var jcDmg = MediCard.Resources.dealDamage(target, 1);
          this._logAction('🤖 ' + name + ' 交叉感染，' + (target.name || '玩家') + ' 受到' + jcDmg.actual + '点伤害');
          if (!target.alive) this._checkGameEnd();
          break;
        case 'biaoBen':
          if (gs.deck.length > 0) {
            var peekCount = Math.min(3, gs.deck.length);
            var pickIdx = Math.floor(Math.random() * peekCount);
            var actualIdx = gs.deck.length - 1 - pickIdx;
            ai.hand.push(gs.deck.splice(actualIdx, 1)[0]);
            this._logAction('🤖 ' + name + ' 标本检索，获得了卡牌');
          }
          break;
        case 'bingLiFenXi':
          if (gs.deck.length > 0) {
            var blCount = Math.min(3, gs.deck.length);
            this._logAction('🤖 ' + name + ' 病历分析：查看了牌库顶' + blCount + '张牌');
          }
          break;
        default:
          this._logAction('🤖 ' + name + ' 使用了「' + (card.cardName || '锦囊') + '」');
      }
    },

    /** Sync AI player state to all clients */
    _syncAIState: function() {
      if (!this._isHost) return;
      var gs = MediCard.GameState;
      this._sendSync({
        type: 'turn_change',
        currentPlayerIndex: gs.currentPlayerIndex,
        deckCount: gs.deck.length,
        players: gs.players.map(function(p) {
          return { hp: p.resources.hp.current, maxHp: p.resources.hp.max, mp: p.resources.mp.current, alive: p.alive, handCount: p.hand.length };
        })
      });
    },

    /* ============ New Turn (Player) ============ */

    _startNewTurn() {
      this._clearActionLog();
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
        self._trackAnswer(result, card);
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
        var isMyTurnNow = (gs.currentPlayerIndex === this._myPlayerIndex);
        if (isMyTurnNow) this._clearActionLog();
        this._turnActive = isMyTurnNow;
        this._isDiscardPhase = false;
        this._selectedCardIndex = -1;
        this._selectedDiscardIndices = [];
        this._pendingCard = null;
        this._attackInProgress = null;
        this._playedCardsThisTurn = [];
        this._attacksThisTurn = 0;
        this._jueshaPlayedThisTurn = false;
        this._duelInProgress = null;
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
        var identEff2 = MediCard.IdentitySkills.applyTurnStartEffects(cp);
        if (identEff2 && identEff2.healed > 0 && isMyTurnNow) {
          this._flashPhase('👑 君威：回合开始时恢复' + identEff2.healed + '点HP');
        }
        var extraDraw = MediCard.IdentitySkills.getExtraDraw(cp);
        gs.drawCards(gs.currentPlayerIndex, MediCard.Config.defaults.drawPerTurn + extraDraw);
        this._maybeInjectLeiDian(cp);

        // Sync turn change to other players (only if local player initiated)
        if (!this._skipSyncBroadcast) {
          console.log('[Battle] _continueNewTurn broadcasting turn_change: prevIdx=' + prevPlayerIdx +
            ' curIdx=' + gs.currentPlayerIndex +
            ' handSize=' + cp.hand.length +
            ' isHost=' + this._isHost);
          if (MediCard.MultiplayerAdapter) MediCard.MultiplayerAdapter.anchorLog(
            'turn_p' + prevPlayerIdx, 'turn_p' + gs.currentPlayerIndex, 'end_turn');
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

        if (isMyTurnNow) {
          this._player = cp;
          this._updateDisplay();
        } else {
          this._updateDisplay();
          // AI or remote player turn — wait for their actions
          if (cp.isAI) {
            setTimeout(function() { self._executeMultiplayerAITurn(cp); }, 1200);
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

      // Apply identity turn-start effects (e.g. lord heal)
      var identityEffect = MediCard.IdentitySkills.applyTurnStartEffects(player);
      if (identityEffect && identityEffect.healed > 0) {
        this._flashPhase('👑 君威：回合开始时恢复' + identityEffect.healed + '点HP');
        MediCard.CardVisuals.spawnParticles('player-status', 100, 50, '#10b981', 3);
      }

      // Draw 2 cards (+1 if spy) — always draw even when hand is full
      var extraDraw = MediCard.IdentitySkills.getExtraDraw(player);
      var handLimit = MediCard.Resources.getHandLimit(player);
      var drawn = gs.drawCards(0, MediCard.Config.defaults.drawPerTurn + extraDraw);
      if (drawn.length > 0) MediCard.Audio.playCardDraw();
      this._maybeInjectLeiDian(player);

      // Reset per-turn state
      player.attackBonus = 0;
      this._attacksThisTurn = 0;
      this._jueshaPlayedThisTurn = false;
      this._duelInProgress = null;
      this._playedCardsThisTurn = [];
      this._selectedCardIndex = -1;

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

      // Warn if hand exceeds limit — discard will happen at end of turn
      if (player.hand.length > handLimit) {
        this._flashPhase('📥 摸了' + drawn.length + '张牌 (手牌' + player.hand.length + '/' + handLimit + '，回合结束需弃牌)');
      } else {
        this._flashPhase('📥 摸了' + drawn.length + '张牌 (手牌' + player.hand.length + '/' + handLimit + ')');
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
      gs.drawCards(1, MediCard.Config.defaults.drawPerTurn);
      self._enforceHandLimit(ai);
      self._updateDisplay();
      setTimeout(function() { self._startNewTurn(); }, 600);
    },

    /* ============ Game End ============ */

    _endGame(preChecked) {
      var gs = MediCard.GameState;
      var victory = preChecked || MediCard.Victory.check(gs.players);
      var myIdentity = this._player.identity;
      var won;
      var winnerIdentity = null;

      if (victory) {
        winnerIdentity = victory.winner;
        won = MediCard.Victory.isPlayerWin(myIdentity, victory.winner);
      } else {
        won = this._player.alive;
        winnerIdentity = won ? myIdentity : (myIdentity === 'lord' ? 'rebel' : 'lord');
      }

      if (won) { MediCard.Audio.playVictory(); } else { MediCard.Audio.playDefeat(); }

      // Calculate score
      var correctCount = this._gameStats.correctAnswers;
      var score;
      if (won) {
        if (this._isMultiplayer) {
          var playerCount = gs.players.length;
          score = Math.floor(correctCount * (playerCount * 0.15 + 1));
        } else {
          var diffMap = { easy: 1, normal: 1.5, hard: 2 };
          var mult = diffMap[this._difficulty] || 1;
          score = Math.floor(correctCount * mult);
        }
      } else {
        score = correctCount;
      }
      this._gameStats.score = score;

      // Save detailed game stats + debug log
      var totalQ = this._gameStats.questionsAnswered;
      var accuracy = totalQ > 0 ? Math.round(correctCount / totalQ * 100) : 0;
      this._log('game_end', '游戏结束, 模式:' + (this._isMultiplayer ? '多人' : '单人') + ', 胜利:' + won + ', 正确率:' + accuracy + '%, 得分:' + score);
      MediCard.Storage.saveGameStats({
        won: won,
        score: score,
        accuracy: accuracy,
        accuracyDetail: correctCount + '/' + totalQ,
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

      // Push cumulative stats to global leaderboard server
      try {
        var MC = window.MedicalKillCommunity;
        if (MC && MC.Leaderboard && MC.Leaderboard.pushToServer) {
          var user = MediCard.Storage.getCurrentUser();
          var allStats = MediCard.Storage.getGameStats();
          var totalWins = allStats.filter(function(s) { return s.won; }).length;
          var totalGames = allStats.length;
          var cumulativeScore = allStats.reduce(function(a, s) { return a + (s.score || 0); }, 0);
          var cumulativeWinRate = totalGames > 0 ? Math.round(totalWins / totalGames * 100) : 0;
          MC.Leaderboard.pushToServer({
            userId: MediCard.Storage.getCurrentUserId(),
            name: user ? user.username : '',
            score: Math.round(cumulativeScore),
            wins: totalWins,
            totalGames: totalGames,
            winRate: cumulativeWinRate
          });
        }
      } catch(e) { /* silent */ }

      // Sync account to server for backup (stats updated)
      try { setTimeout(function() { MediCard.Storage.syncAccountToServer(); }, 1000); } catch(e) {}

      // Clean up connection drop detection interval
      if (this._dropCheckInterval) {
        clearInterval(this._dropCheckInterval);
        this._dropCheckInterval = null;
      }

      // Reset multiplayer state to prevent leakage into next game
      this._isMultiplayer = false;
      this._isHost = false;
      this._multiplayerPlayers = null;
      this._multiplayerDeck = null;
      this._multiplayerTotalPlayers = 2;
      this._myPlayerIndex = 0;

      MediCard.GameState.goToScreen('result');
      this._turnActive = false;
    },

    /* ============ Helpers ============ */

    _trackAnswer(result, card) {
      this._gameStats.questionsAnswered++;
      if (result.correct) this._gameStats.correctAnswers++;
      this._log('answer', (result.correct ? '✓正确' : '✗错误') + ' #' + this._gameStats.questionsAnswered);

      // Save wrong answers to WrongQuestionBook for review
      if (!result.correct) {
        var qId = (card && card.id) || (this._pendingCard && this._pendingCard.card && this._pendingCard.card.id);
        if (qId && MediCard.WrongQuestionBook) {
          try { MediCard.WrongQuestionBook.addWrong(qId); } catch(e) { /* silent */ }
        }
      }
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
        // Allow actions during discard phase (discard button needs to work even when _turnActive is false)
        var actionsEnabled = (isMyTurn && this._turnActive) || this._isDiscardPhase;
        actionsEl.style.opacity = actionsEnabled ? '1' : '0.4';
        actionsEl.style.pointerEvents = actionsEnabled ? 'auto' : 'none';
        if (this._isMultiplayer) {
          console.log('[Battle] _updateDisplay: myIdx=' + this._myPlayerIndex +
            ' curIdx=' + gs.currentPlayerIndex +
            ' isMyTurn=' + isMyTurn +
            ' _turnActive=' + this._turnActive +
            ' actionsEnabled=' + actionsEnabled +
            ' handSize=' + (this._player && this._player.hand ? this._player.hand.length : 0));
        }
      }
      var handEl = document.getElementById('player-hand');
      if (handEl) {
        // During discard phase, hand must remain interactive even though _turnActive is false
        var handInteractive = (isMyTurn && this._turnActive) || this._isDiscardPhase;
        handEl.style.opacity = handInteractive ? '1' : '0.5';
        handEl.style.pointerEvents = handInteractive ? 'auto' : 'none';
      }

      this._updateHandLimit();
      this._updatePlayButton();
      this._updateDiscardActionButton();
      this._updateEndTurnButton();
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
          this._renderOpponentEquipmentInline(p);
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
      var isMobile = window.innerWidth <= 480;
      var howToUse;
      switch (card.cardType) {
        case 'attack': howToUse = '⚔️ 打出后<strong>对手答题</strong>，答错受到伤害'; break;
        case 'juesha': howToUse = '💀 打出后对手须用防守牌答题，无防守牌则直接扣血'; break;
        case 'juedou': howToUse = '⚔️ 强制对手出杀答题，答错扣血，无手牌判负'; break;
        case 'defense': howToUse = '🛡️ 被攻击时打出，<strong>你答题</strong>，答对免疫伤害'; break;
        case 'heal': howToUse = '💚 打出后<strong>你答题</strong>，答对恢复1点生命值'; break;
        case 'tactic': howToUse = '📋 打出后<strong>你答题</strong>，答对效果生效 — ' + (card.cardEffect || ''); break;
        case 'equipment': howToUse = '🔧 打出后<strong>你答题</strong>，答对装备到对应槽位'; break;
        case 'delayed': howToUse = '⏳ 打出后<strong>你答题</strong>，答对贴到对手身上，判定阶段对手答题决定是否触发'; break;
        default: howToUse = card.cardEffect || '';
      }

      var html = '<div style="font-size:' + (isMobile ? '12px' : '13px') + ';color:#c4b5fd;margin-bottom:6px;">💡 ' + howToUse + '</div>';

      // For attack/juesha/juedou cards: show full question + answers so player can read before committing
      var isOffensive = card.cardType === 'attack' || card.cardType === 'juesha' || card.cardType === 'juedou';
      if (isOffensive && card.question) {
        html += '<div style="padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:6px;text-align:left;">' +
          '<div style="font-size:' + (isMobile ? '13px' : '15px') + ';font-weight:600;color:#e2e8f0;line-height:1.5;margin-bottom:6px;">📝 ' + _esc(card.question) + '</div>';
        var opts = card.options || [];
        if (opts.length > 0) {
          html += '<div style="display:flex;flex-direction:column;gap:3px;">';
          for (var oi = 0; oi < opts.length; oi++) {
            var optText = opts[oi];
            // Format: "A. option text" — preserve letter label
            var letter = optText.charAt(0);
            var cleanText = optText.length > 2 ? optText.substring(2).replace(/^\.\s*/, '') : optText;
            html += '<span style="font-size:' + (isMobile ? '11px' : '12px') + ';color:#94a3b8;padding:2px 4px;">' +
              _esc(letter) + '. ' + _esc(cleanText) + '</span>';
          }
          html += '</div>';
        }
        html += '</div>';
      }

      el.innerHTML = html;
      el.style.cssText = 'display:block;text-align:left;padding:' + (isMobile ? '10px 12px' : '8px 14px') + ';margin:4px 12px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.25);border-radius:10px;color:var(--text-secondary);max-height:' + (isMobile ? '260px' : '300px') + ';overflow-y:auto;line-height:1.5;';
    },

    _flashPhase(message) {
      var phaseEl = document.getElementById('phase-indicator');
      if (!phaseEl) return;
      phaseEl.textContent = message;
      phaseEl.style.color = 'var(--accent-yellow)';
      phaseEl.style.fontSize = '14px';
      phaseEl.style.fontWeight = '600';
      // Keep message longer, auto-restore after 5s
      if (this._flashTimer) clearTimeout(this._flashTimer);
      var self = this;
      this._flashTimer = setTimeout(function() {
        if (phaseEl) {
          phaseEl.style.color = '';
          phaseEl.style.fontSize = '';
          phaseEl.style.fontWeight = '';
          if (self._isMultiplayer) {
            phaseEl.textContent = MediCard.GameState.currentPlayerIndex === self._myPlayerIndex
              ? '选择卡牌出牌' : '等待对手操作...';
          } else {
            phaseEl.textContent = MediCard.GameState.currentPlayerIndex === 0
              ? '选择卡牌出牌' : 'AI 正在思考...';
          }
        }
        self._flashTimer = null;
      }, 4000);
    },

    /* ===== Action Log (last 2 entries stay visible) ===== */
    _actionLogEntries: [],

    _logAction(message) {
      var now = new Date();
      var pad = function(n) { return (n < 10 ? '0' : '') + n; };
      var timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      this._actionLogEntries.push({ time: timeStr, msg: message, ts: Date.now() });
      if (this._actionLogEntries.length > 12) this._actionLogEntries.shift();
      this._renderActionLog();
    },

    _renderActionLog() {
      var el = document.getElementById('action-log');
      if (!el) return;
      var now = Date.now();
      var html = '';
      var len = this._actionLogEntries.length;
      var visibleCount = 0;
      for (var i = len - 1; i >= 0; i--) {
        var e = this._actionLogEntries[i];
        var age = now - e.ts;
        // Keep last 2 entries always fully visible; older ones fade
        var isLastTwo = (i >= len - 2);
        var opacity;
        if (isLastTwo) {
          opacity = 1.0;
        } else {
          opacity = Math.max(0.3, 1 - (age - 10000) / 15000);
        }
        var isFading = (!isLastTwo && age > 10000) ? ' fading' : '';
        html += '<div class="action-log-entry' + isFading + '" style="opacity:' + opacity.toFixed(2) + ';font-size:13px;line-height:1.4;">' +
          '<span class="action-time">[' + e.time + ']</span>' + e.msg + '</div>';
        visibleCount++;
        // Only show entries that are still somewhat visible
        if (visibleCount >= 8 && !isLastTwo && age > 15000) break;
      }
      el.innerHTML = html;
    },

    _clearActionLog() {
      // Fade all entries out first, then clear after transition
      var entries = document.querySelectorAll('.action-log-entry');
      for (var i = 0; i < entries.length; i++) {
        entries[i].classList.add('fading');
        entries[i].style.opacity = '0';
      }
      var self = this;
      setTimeout(function() {
        self._actionLogEntries = [];
        var el = document.getElementById('action-log');
        if (el) el.innerHTML = '';
      }, 500);
    },

    _attachEvents() {
      var self = this;
      var btnPlay = document.getElementById('btn-play-card');
      var btnEnd = document.getElementById('btn-end-turn');
      var btnSurrender = document.getElementById('btn-surrender');
      var btnDiscard = document.getElementById('btn-discard-action');
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;

      if (btnPlay) {
        btnPlay.addEventListener('click', function() {
          if (MediCard.GameState.currentPlayerIndex !== myIdx) return;
          self._onPlayButton();
        });
      }

      if (btnDiscard) {
        btnDiscard.addEventListener('click', function() {
          if (MediCard.GameState.currentPlayerIndex !== myIdx) return;
          self._onDiscardActionButton();
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

      this._log('card_played', (card.cardName || '卡牌') + ' → ' + target.name);

      // Set per-turn limits immediately to prevent double-play before async resolve
      if (card.cardType === 'juesha') this._jueshaPlayedThisTurn = true;

      // Set guard to prevent playing another card while waiting
      this._attackInProgress = { type: 'waiting_defend', cardIndex: cardIdx };

      if (this._isHost) {
        // Host handles directly — route by card type
        if (card.cardType === 'juesha') {
          this._handleJueshaMpIntent(this._myPlayerIndex, cardIdx, targetIdx);
        } else if (card.cardType === 'juedou') {
          this._handleJuedouMpIntent(this._myPlayerIndex, cardIdx, targetIdx);
        } else {
          this._handleAttackIntent(this._myPlayerIndex, cardIdx, targetIdx);
        }
      } else {
        // Client sends intent to host
        this._sendSync({
          type: 'offensive_intent',
          cardType: card.cardType,
          cardIndex: cardIdx,
          targetIdx: targetIdx
        });
        this._flashPhase('🎯 等待对手回应...');
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
          self._trackAnswer(result, card);
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

    /** Host: process a juedou (duel) intent from any player in mp.
        Juedou forces the defender to answer — no defense cards help.
        Simplified vs single-player: one question, 1 damage if wrong. */
    _handleJuedouMpIntent: function(attackerIdx, cardIndex, targetIdx) {
      var gs = MediCard.GameState;
      var attacker = gs.players[attackerIdx];
      var defender = gs.players[targetIdx];
      if (!attacker || !defender || !attacker.alive || !defender.alive) return;

      var card = attacker.hand[cardIndex];
      if (!card) return;

      // Remove juedou card from attacker's hand on host
      attacker.hand.splice(cardIndex, 1);
      gs.discardPile.push(card);

      this._attackInProgress = {
        type: 'juedou', card: card, attacker: attacker, defender: defender,
        attackerIndex: attackerIdx, defenderIndex: targetIdx, cardIndex: cardIndex
      };

      var self = this;
      if (defender === gs.players[this._myPlayerIndex]) {
        // Host IS the defender — answer locally
        this._flashPhase('⚔️ ' + attacker.name + ' 对你使用' + (card.cardName || '决斗') + '！无法防御，请答题');
        MediCard.QuestionPopup.show(card, function(result) {
          self._trackAnswer(result, card);
          self._resolveMpJuedouAnswer(result.correct);
        }, '你');
      } else {
        // Defender is a remote client — send question
        var conns = MediCard.NetworkHost._connections;
        var clientIdx = targetIdx - 1;
        if (clientIdx >= 0 && clientIdx < conns.length && conns[clientIdx].open) {
          conns[clientIdx].send(MediCard.SyncProtocol.pack(
            MediCard.SyncProtocol.MessageType.DEFEND_QUESTION,
            { card: card, attackerName: attacker.name, isJuedou: true }
          ));
          this._flashPhase('⚔️ 等待 ' + defender.name + ' 答题（决斗）...');
        }
      }
      this._updateDisplay();
    },

    /** Host: resolve juedou defender answer in mp */
    _resolveMpJuedouAnswer: function(defenderCorrect) {
      var ctx = this._attackInProgress;
      if (!ctx) return;
      this._attackInProgress = null;

      var inflictedDamage = 0;
      if (defenderCorrect) {
        this._flashPhase('⚔️ 答对了！决斗被化解');
      } else {
        inflictedDamage = 1;
        ctx.defender.resources.hp.current = Math.max(0, ctx.defender.resources.hp.current - 1);
        this._gameStats.damageDealt += 1;
        this._log('damage_dealt', ctx.attacker.name + '→' + ctx.defender.name + ' 决斗 = 1伤害');
        this._flashPhase('⚔️ ' + ctx.defender.name + ' 受到 1 点决斗伤害！');
        if (ctx.defender.resources.hp.current <= 0) {
          ctx.defender.alive = false;
          this._flashPhase('⚰️ ' + ctx.defender.name + ' 被击败！');
        }
      }

      if (this._isMultiplayer) {
        this._sendSync({
          type: 'action_result', sourceIdx: ctx.attackerIndex,
          data: { cardType: 'juedou', cardIndex: ctx.cardIndex, targetIdx: ctx.defenderIndex,
                  damage: inflictedDamage, defenderAlive: ctx.defender.alive, defenderCorrect: defenderCorrect }
        });
      }

      this._attacksThisTurn++;
      this._updateDisplay();

      if (!ctx.defender.alive) {
        var self = this;
        var victory = MediCard.Victory.check(MediCard.GameState.players);
        if (victory) setTimeout(function() { self._endGame(victory); }, 1500);
      }
    },

    /** Client: show defend question received from host */
    _onDefendQuestion: function(data) {
      var card = data.card;
      var isJuesha = data.isJuesha || false;
      var isJuedou = data.isJuedou || false;
      var self = this;
      var label = isJuesha ? '💀 绝杀' : (isJuedou ? '⚔️ 决斗' : '🛡️');
      this._flashPhase(label + ' ' + data.attackerName + ' 对你使用' + (card.cardName || '杀') + '！请答题');
      MediCard.QuestionPopup.show(card, function(result) {
        self._trackAnswer(result, card);
        // Send answer back to host
        MediCard.NetworkClient.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.DEFEND_ANSWER,
          { correct: result.correct, isJuesha: isJuesha, isJuedou: isJuedou }
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

    /** Host: handle 绝杀 intent in multiplayer */
    _handleJueshaMpIntent: function(attackerIdx, cardIndex, targetIdx) {
      var gs = MediCard.GameState;
      var attacker = gs.players[attackerIdx];
      var defender = gs.players[targetIdx];
      if (!attacker || !defender || !attacker.alive || !defender.alive) return;

      var card = attacker.hand[cardIndex];
      if (!card) return;

      // Remove juesha card from attacker's hand
      attacker.hand.splice(cardIndex, 1);
      this._jueshaPlayedThisTurn = true;

      this._attackInProgress = {
        type: 'juesha', card: card, attacker: attacker, defender: defender,
        attackerIndex: attackerIdx, defenderIndex: targetIdx, cardIndex: cardIndex
      };

      var self = this;

      // Check if defender has defense cards
      var defIdx = -1;
      for (var i = 0; i < defender.hand.length; i++) {
        if (defender.hand[i].cardType === 'defense') { defIdx = i; break; }
      }

      if (defIdx < 0) {
        // No defense → direct damage
        this._flashPhase('💀 绝杀！' + defender.name + '无守卫牌，直接扣血');
        var dmgResult = this._applyMpJueshaDamage(attacker, defender);
        this._sendSync({
          type: 'action_result', sourceIdx: attackerIdx,
          data: { cardType: 'juesha', cardIndex: cardIndex, targetIdx: targetIdx, damage: dmgResult.actual, defenderAlive: defender.alive }
        });
        this._attackInProgress = null;
        if (!defender.alive) {
          var victory = MediCard.Victory.check(gs.players);
          if (victory) setTimeout(function() { self._endGame(victory); }, 1500);
        }
        this._attacksThisTurn++;
        gs.discardPile.push(card);
        this._updateDisplay();
        return;
      }

      // Has defense → consume 1 defense card, force answer
      var defCard = defender.hand.splice(defIdx, 1)[0];
      gs.discardPile.push(defCard);
      this._flashPhase('🛡️ 绝杀！' + defender.name + '消耗守卫牌抵挡，但必须答题！');

      // Defender is local (host answers) or remote?
      if (defender === gs.players[this._myPlayerIndex]) {
        // Host IS the defender — show question locally
        MediCard.QuestionPopup.show(card, function(result) {
          self._trackAnswer(result, card);
          self._resolveMpJueshaAnswer(result.correct);
        }, '你');
      } else {
        // Defender is remote — send question
        var conns = MediCard.NetworkHost._connections;
        var clientIdx = targetIdx - 1;
        if (clientIdx >= 0 && clientIdx < conns.length && conns[clientIdx].open) {
          conns[clientIdx].send(MediCard.SyncProtocol.pack(
            MediCard.SyncProtocol.MessageType.DEFEND_QUESTION,
            { card: card, attackerName: attacker.name, isJuesha: true }
          ));
          this._flashPhase('💀 等待 ' + defender.name + ' 答题（绝杀）...');
        }
      }
      this._updateDisplay();
    },

    /** Host: resolve 绝杀 defender answer in mp */
    _resolveMpJueshaAnswer: function(defenderCorrect) {
      var ctx = this._attackInProgress;
      if (!ctx) return;
      this._attackInProgress = null;

      var inflictedDamage = 0;
      if (defenderCorrect) {
        this._flashPhase('🛡️ 答对了！绝杀被化解');
      } else {
        var dmgResult = this._applyMpJueshaDamage(ctx.attacker, ctx.defender);
        inflictedDamage = dmgResult.actual;
      }

      if (this._isMultiplayer) {
        this._sendSync({
          type: 'action_result', sourceIdx: ctx.attackerIndex,
          data: { cardType: 'juesha', cardIndex: ctx.cardIndex, targetIdx: ctx.defenderIndex,
                  damage: inflictedDamage, defenderAlive: ctx.defender.alive, defenderCorrect: defenderCorrect }
        });
      }

      this._attacksThisTurn++;
      MediCard.GameState.discardPile.push(ctx.card);
      this._updateDisplay();

      if (!ctx.defender.alive) {
        var self = this;
        var victory = MediCard.Victory.check(MediCard.GameState.players);
        if (victory) setTimeout(function() { self._endGame(victory); }, 1500);
      }
    },

    /** Host: apply 绝杀 damage in multiplayer */
    _applyMpJueshaDamage: function(attacker, defender) {
      var weaponBonus = (attacker.equipment && attacker.equipment.weapon && attacker.equipment.weapon.cardSubtype === 'shouShuDao') ? 1 : 0;
      var identityBonus = MediCard.IdentitySkills ? MediCard.IdentitySkills.getDamageBonus(attacker, defender) : 0;
      var attackPotionBonus = (attacker.attackBonus || 0);
      var totalDmg = 1 + weaponBonus + identityBonus + attackPotionBonus;
      if (defender.equipment && defender.equipment.armor && defender.equipment.armor.cardSubtype === 'baiDaGua') {
        totalDmg = Math.max(1, totalDmg - 1);
      }
      var dmg = MediCard.Resources.dealDamage(defender, totalDmg);
      this._gameStats.damageDealt += dmg.actual;
      this._flashPhase('💀 绝杀命中！造成 ' + dmg.actual + ' 点伤害');
      return dmg;
    },

    _onPlayButton() {
      if (MediCard.BattleLogger) MediCard.BattleLogger.log('USER_ACTION', 'button_click', 'play_button',
        { turnActive: this._turnActive, cardIndex: this._selectedCardIndex });

      if (!this._turnActive) return;
      if (this._duelInProgress || this._juedouDefending) { this._flashPhase('⚔️ 决斗进行中，无法使用其他卡牌'); return; }
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

      if (this._pendingDiscard.needed <= 0) {
        this._isDiscardPhase = false;
        var cb = this._pendingDiscard.callback;
        this._pendingDiscard = null;
        var zoneEl = document.getElementById('discard-zone-indicator');
        if (zoneEl) zoneEl.remove();
        var handEl = document.getElementById('player-hand');
        if (handEl) { handEl.className = 'player-hand hand-cards'; }
        var phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) { phaseEl.style.color = ''; phaseEl.textContent = '✅ 弃牌完成，继续你的回合'; }
        this._updateDiscardActionButton();
        this._updateEndTurnButton();
        this._renderHand();
        try { cb(); } catch (e) {
          console.error('[Battle] Discard callback error:', e);
          this._flashPhase('⚠️ 游戏出错，请刷新页面');
        }
      } else {
        var phaseEl = document.getElementById('phase-indicator');
        if (phaseEl) phaseEl.textContent = '💔 还需弃置 ' + this._pendingDiscard.needed + ' 张牌';
        var zoneEl2 = document.getElementById('discard-zone-indicator');
        if (zoneEl2) zoneEl2.textContent = '⬆️ 弃牌区 — 还需选择 ' + this._pendingDiscard.needed + ' 张牌 ⬆️';
        this._updateDiscardActionButton();
        this._renderDiscardHand();
      }
    },

    _updatePlayButton() {
      var btn = document.getElementById('btn-play-card');
      if (!btn) return;
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;
      var isMyTurn = MediCard.GameState.currentPlayerIndex === myIdx && this._turnActive && !this._attackInProgress;
      var hasSelection = this._selectedCardIndex >= 0;

      btn.textContent = '🃏 出牌';
      btn.className = 'btn btn-play-card btn-lg';
      btn.style.cssText = 'flex:2;min-height:48px;font-size:16px;font-weight:700;';
      btn.disabled = !(isMyTurn && hasSelection);
      btn.style.opacity = btn.disabled ? '0.5' : '1';
    },

    _updateEndTurnButton() {
      var btn = document.getElementById('btn-end-turn');
      if (!btn) return;
      var limit = MediCard.Resources.getHandLimit(this._player);
      var exceeds = this._player.hand.length > limit && limit > 0;
      var myIdx = this._isMultiplayer ? this._myPlayerIndex : 0;
      var isMyTurn = MediCard.GameState.currentPlayerIndex === myIdx && this._turnActive && !this._attackInProgress;
      var isDiscard = this._isDiscardPhase;

      var canEnd = isMyTurn && !isDiscard && !exceeds;
      btn.textContent = '⏭️ 结束';
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.cssText = 'flex:1;';
      btn.disabled = !canEnd;
      btn.style.opacity = canEnd ? '1' : '0.4';
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

  function _esc(str) {
    if (!str || typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.MediCard = MediCard;
})();
