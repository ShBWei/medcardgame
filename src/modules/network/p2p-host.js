/**
 * MediCard Duel — P2P Host (V5.5)
 * Host authority for multiplayer games via PeerJS
 * Handles room creation, game start, state sync, turn coordination
 * V5.5: WebSocket relay fallback when WebRTC DataChannel blocked
 */
/* global Peer */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.NetworkHost = {
    _peer: null,
    _connections: [],
    _connected: false,
    _gameStarted: false,
    _playerData: null,
    _syncGameState: null,
    _relay: null,
    _relayReady: false,
    _dcOpen: {},       // peerId → bool — whether DataChannel is open
    _recentMsgs: [],   // dedup: recently seen (type|timestamp) keys
    _roomCode: null,

    createRoom(playerName) {
      if (typeof Peer === 'undefined') {
        alert('联机模块加载中，请稍后再试。');
        MediCard.GameState.goToScreen('title');
        return;
      }

      var cfg = MediCard.Config.peerjs;
      var roomCode = MediCard.RoomManager.createRoom(playerName);
      this._roomCode = roomCode;
      var peerId = 'medicard-' + roomCode + '-host';

      // ── Set up relay transport (guaranteed TCP fallback) ──
      this._relay = MediCard.RelayTransport;
      this._relayReady = false;
      this._dcOpen = {};
      var self = this;

      this._relay.on('open', function() {
        self._relayReady = true;
        console.log('[P2P-Host] Relay transport ready for room', roomCode);
      });

      this._relay.on('data', function(msg) {
        self._handleRelayMessage(msg.from, msg.payload);
      });

      this._relay.on('peerJoin', function(info) {
        console.log('[P2P-Host] Relay peer joined:', info.clientId);
      });

      this._relay.on('peerLeave', function(info) {
        console.log('[P2P-Host] Relay peer left:', info.clientId);
        self._dcOpen[info.clientId] = false;
      });

      this._relay.on('error', function(err) {
        console.warn('[P2P-Host] Relay error:', err.message);
      });

      // Connect relay using the same peer ID
      this._relay.connect(roomCode, peerId);

      // ── Set up PeerJS (signaling + optional P2P) ──
      try {
        console.log('[P2P-Host] Creating peer:', peerId, 'sig:', cfg.host + ':' + cfg.port + cfg.path);
        this._peer = new Peer(peerId, {
          host: cfg.host, port: cfg.port, path: cfg.path, key: cfg.key, secure: cfg.secure, debug: cfg.debug
        });

        this._peer.on('open', function(id) {
          this._connected = true;
          console.log('[P2P-Host] Peer connected, signaling OK. ID:', id);
          var infoEl = document.getElementById('room-info');
          if (infoEl) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '' +
              '<div class="room-code-label">房间号</div>' +
              '<div class="room-code">' + roomCode + '</div>' +
              '<p style="color:var(--text-muted);font-size:12px;">等待玩家加入...</p>';
          }
          this._updateLobbySlots();
        }.bind(this));

        this._peer.on('connection', function(conn) {
          console.log('[P2P-Host] Incoming P2P connection from:', conn.peer);
          this._connections.push(conn);
          this._dcOpen[conn.peer] = false;
          this._setupConnection(conn);
        }.bind(this));

        this._peer.on('disconnected', function() {
          console.warn('[P2P-Host] Signaling disconnected — attempting reconnect...');
          if (this._peer && !this._peer.destroyed) {
            this._peer.reconnect();
          }
        }.bind(this));

        this._peer.on('error', function(err) {
          console.error('[P2P-Host] Peer error:', err.type, err.message);
          var msg = '联机连接失败';
          if (err.type === 'unavailable-id') msg = '房间ID已被占用，请重新创建';
          else if (err.type === 'network') msg = '网络连接失败，请检查防火墙/端口转发设置 (需开放TCP ' + cfg.port + ')';
          else if (err.type === 'server-error') msg = '信令服务器错误，请重启服务器';
          alert(msg + '\n\n(' + err.type + ': ' + err.message + ')');
          MediCard.GameState.goToScreen('title');
        });
      } catch (e) {
        console.error('[P2P-Host] Peer creation failed:', e);
        alert('联机初始化失败，请使用单人模式。');
        MediCard.GameState.goToScreen('title');
      }
    },

    _setupConnection(conn) {
      var self = this;

      // Log ICE connection state for diagnostics
      conn.on('iceStateChanged', function(state) {
        console.log('[P2P-Host] ICE state (' + conn.peer + '):', state);
      });

      // Track DataChannel open state
      conn.on('open', function() {
        console.log('[P2P-Host] DataChannel OPEN for', conn.peer);
        self._dcOpen[conn.peer] = true;
      });

      conn.on('data', function(data) {
        var msg = MediCard.SyncProtocol.unpack(data);
        if (!msg) return;

        switch (msg.t) {
          case MediCard.SyncProtocol.MessageType.JOIN_REQUEST:
            var name = msg.d.name || 'Guest';
            // Include relay client ID for fallback
            var relayId = msg.d.relayId || conn.peer;
            if (MediCard.RoomManager.addPlayer(name, conn.peer, relayId)) {
              conn.send(MediCard.SyncProtocol.pack(
                MediCard.SyncProtocol.MessageType.JOIN_ACCEPT,
                { roomCode: MediCard.RoomManager.roomCode, playerId: conn.peer,
                  players: MediCard.RoomManager.players,
                  relayRoom: self._roomCode }
              ));
              self._updateLobbySlots();
              self._broadcastPlayers();
            } else {
              conn.send(MediCard.SyncProtocol.pack(
                MediCard.SyncProtocol.MessageType.JOIN_REJECT,
                { reason: '房间已满' }
              ));
            }
            break;

          case MediCard.SyncProtocol.MessageType.PLAY_CARD:
          case MediCard.SyncProtocol.MessageType.END_TURN:
          case MediCard.SyncProtocol.MessageType.ANSWER_QUESTION:
          case MediCard.SyncProtocol.MessageType.DEFEND_ANSWER:
          case MediCard.SyncProtocol.MessageType.SURRENDER:
            if (self._gameStarted) {
              self._dispatchGameMessage(conn.peer, msg.t, msg.d);
            }
            break;

          case MediCard.SyncProtocol.MessageType.PING:
            conn.send(MediCard.SyncProtocol.pack(
              MediCard.SyncProtocol.MessageType.PONG, {}
            ));
            break;
        }
      });

      conn.on('close', function() {
        console.log('[P2P-Host] DataChannel CLOSED for', conn.peer);
        self._dcOpen[conn.peer] = false;
        var idx = self._connections.indexOf(conn);
        if (idx >= 0) self._connections.splice(idx, 1);
        MediCard.RoomManager.removePlayer(conn.peer);
        self._broadcastPlayers();
        self._updateLobbySlots();
      });
    },

    /** Handle game actions received via relay transport (fallback path) */
    _handleRelayMessage(fromId, payload) {
      if (!this._gameStarted || !payload) return;
      var msg = MediCard.SyncProtocol.unpack(payload);
      if (!msg) return;
      this._dispatchGameMessage(fromId, msg.t, msg.d);
    },

    /** Dispatch game actions to the appropriate handler */
    _dispatchGameMessage(peerId, msgType, data) {
      // Dedup: skip duplicate messages already received via other transport
      var key = msgType + '|' + (data && data.ts ? data.ts : Date.now());
      if (this._recentMsgs.indexOf(key) >= 0) return;
      this._recentMsgs.push(key);
      if (this._recentMsgs.length > 50) this._recentMsgs.shift();

      switch (msgType) {
        case MediCard.SyncProtocol.MessageType.PLAY_CARD:
          this._handlePlayCard(peerId, data);
          break;
        case MediCard.SyncProtocol.MessageType.END_TURN:
          this._handleEndTurn(peerId);
          break;
        case MediCard.SyncProtocol.MessageType.ANSWER_QUESTION:
          this._handleAnswer(peerId, data);
          break;
        case MediCard.SyncProtocol.MessageType.DEFEND_ANSWER:
          this._handleDefendAnswer(peerId, data);
          break;
        case MediCard.SyncProtocol.MessageType.SURRENDER:
          this._handleSurrender(peerId);
          break;
      }
    },

    /** Check if a connection is available (DataChannel or relay) */
    _isConnected(peerId) {
      return this._dcOpen[peerId] || this._relayReady;
    },

    broadcast(message) {
      var packed = MediCard.SyncProtocol.pack(message.t, message.d);
      if (!packed) packed = message; // already packed
      // Send via DataChannel to all open connections
      this._connections.forEach(function(conn) {
        if (conn.open) {
          try { conn.send(packed); } catch(e) { console.warn('[P2P-Host] DataChannel send failed:', e.message); }
        }
      });
      // Also send via relay (guaranteed delivery for clients without DataChannel)
      if (this._relayReady) {
        this._relay.send(packed);
      }
    },

    broadcastTo(peerId, message) {
      var packed = MediCard.SyncProtocol.pack(message.t, message.d);
      if (!packed) packed = message;
      // Try DataChannel first
      var conn = this._connections.find(function(c) { return c.peer === peerId; });
      if (conn && conn.open) {
        try { conn.send(packed); return; } catch(e) {}
      }
      // Fall back to relay
      if (this._relayReady) {
        this._relay.sendTo(peerId, packed);
      }
    },

    _broadcastPlayers() {
      this.broadcast({
        t: MediCard.SyncProtocol.MessageType.FULL_STATE,
        d: { type: 'players', players: MediCard.RoomManager.players }
      });
    },

    _updateLobbySlots() {
      var slots = document.getElementById('player-slots');
      if (!slots) return;
      var max = MediCard.Config.defaults.maxPlayers;
      var players = MediCard.RoomManager.players;
      var html = '';
      for (var i = 0; i < max; i++) {
        var p = players[i];
        if (p) {
          html += '<div class="player-slot filled' + (p.ready ? ' ready' : '') + '">' +
            '<div class="player-slot-icon">' + (p.isHost ? '👑' : '🎮') + '</div>' +
            '<div class="player-slot-name">' + p.name + '</div>' +
            '</div>';
        } else {
          html += '<div class="player-slot"><div class="player-slot-icon">❓</div><div class="player-slot-name">等待中</div></div>';
        }
      }
      slots.innerHTML = html;
    },

    /** Start game: generate deck, assign identities, deal hands, broadcast state */
    startGame() {
      this._gameStarted = true;
      var players = MediCard.RoomManager.players;

      // Assign identities
      MediCard.IdentityData.assignIdentities(players);

      // Initialize resources for all players
      players.forEach(function(p) {
        p.resources = MediCard.Resources.createPlayerResources();
        p.hand = [];
        p.alive = true;
        p.shield = 0;
      });

      // Generate full 120-card deck with tactics, equipment, delayed cards
      var selectedIds = Array.from(MediCard.QuestionLoader._selectedSubjects);
      var deck = MediCard.CardData.generateFullDeck(selectedIds, MediCard.QuestionLoader);
      if (!deck || deck.length === 0) {
        deck = MediCard.CardData.generateBasicDeck(selectedIds, MediCard.QuestionLoader);
      }

      // Shuffle and deal
      var shuffled = deck.slice();
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
      }

      // Deal 5 cards to each player
      players.forEach(function(p, idx) {
        p.hand = shuffled.slice(idx * 5, (idx + 1) * 5);
      });

      // Store remaining as deck
      var dealtCount = players.length * 5;
      var remainingDeck = shuffled.slice(dealtCount);
      var discardPile = [];

      this._syncGameState = {
        deck: remainingDeck,
        discardPile: discardPile,
        players: players,
        currentPlayerIndex: 0
      };

      var self = this;

      // Broadcast to all clients via both DataChannel and relay
      players.forEach(function(p) {
        var stateForPlayer = {
          type: 'game_start',
          yourIndex: players.indexOf(p),
          deckCount: remainingDeck.length,
          discardCount: 0,
          currentPlayerIndex: 0,
          players: players.map(function(op, oi) {
            return {
              name: op.name,
              identity: (oi === 0 || p.isHost) ? op.identity : null,
              identityRevealed: (oi === 0 || p.isHost),
              resources: op.resources,
              handCount: op.hand.length,
              alive: true,
              isHost: op.isHost,
              hand: (op === p || (p.isHost && op === p)) ? op.hand : null
            };
          })
        };

        if (p.isHost) {
          // Host uses local state — handled by screen-battle multiplayer path
        } else {
          self.broadcastTo(p.peerId, {
            t: MediCard.SyncProtocol.MessageType.GAME_START,
            d: stateForPlayer
          });
        }
      });

      // Navigate to battle for host (screen-lobby handles via callback)
    },

    _handlePlayCard(peerId, data) {
      var gs = this._syncGameState;
      if (!gs) return;
      var playerIdx = gs.players.findIndex(function(p) { return p.peerId === peerId; });
      if (playerIdx < 0 || playerIdx !== gs.currentPlayerIndex) return;
      var player = gs.players[playerIdx];
      var cardIdx = data.cardIndex;

      if (cardIdx >= player.hand.length) return;
      var card = player.hand[cardIdx];
      if (!MediCard.CardEffects.canPlay(player, card)) return;

      var targetIdx = (playerIdx + 1) % gs.players.length;
      var target = gs.players[targetIdx];
      if (!target.alive) {
        for (var i = 0; i < gs.players.length; i++) {
          var t = gs.players[(playerIdx + i + 1) % gs.players.length];
          if (t.alive) { target = t; targetIdx = (playerIdx + i + 1) % gs.players.length; break; }
        }
      }

      var fx = MediCard.CardEffects.resolve(card, player, target);

      var rebelBonus = MediCard.IdentitySkills.getDamageBonus(player, target);
      if (rebelBonus > 0 && fx.type === 'attack') {
        fx.actual += rebelBonus;
      }

      player.hand.splice(cardIdx, 1);
      gs.discardPile.push(card);

      this.broadcast({
        t: MediCard.SyncProtocol.MessageType.DELTA_STATE,
        d: {
          type: 'card_played',
          sourceIdx: playerIdx,
          targetIdx: targetIdx,
          cardPlayed: { name: card.cardName, rarity: card.rarity, type: card.cardType },
          effect: fx,
          sourceHP: player.resources.hp.current,
          targetHP: target.resources.hp.current,
          targetAlive: target.alive
        }
      });
    },

    _handleAnswer(peerId, data) {
      this.broadcast({
        t: MediCard.SyncProtocol.MessageType.ANSWER_QUESTION,
        d: { peerId: peerId, correct: data.correct, choice: data.choice }
      });
    },

    _handleDefendAnswer(peerId, data) {
      this.broadcast({
        t: MediCard.SyncProtocol.MessageType.DEFEND_ANSWER,
        d: { peerId: peerId, choice: data.choice }
      });
    },

    _handleSurrender(peerId) {
      var gs = this._syncGameState;
      if (!gs) return;
      var playerIdx = gs.players.findIndex(function(p) { return p.peerId === peerId; });
      if (playerIdx < 0) return;
      gs.players[playerIdx].alive = false;
      this.broadcast({
        t: MediCard.SyncProtocol.MessageType.DELTA_STATE,
        d: {
          type: 'surrender',
          playerIdx: playerIdx,
          players: gs.players.map(function(p) {
            return { hp: p.resources.hp.current, alive: p.alive, handCount: p.hand.length };
          })
        }
      });
    },

    _handleEndTurn(peerId) {
      var gs = this._syncGameState;
      if (!gs) return;
      var playerIdx = gs.players.findIndex(function(p) { return p.peerId === peerId; });
      if (playerIdx < 0 || playerIdx !== gs.currentPlayerIndex) return;

      gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
      if (!gs.players[gs.currentPlayerIndex].alive) {
        for (var i = 0; i < gs.players.length; i++) {
          gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
          if (gs.players[gs.currentPlayerIndex].alive) break;
        }
      }

      var nextPlayer = gs.players[gs.currentPlayerIndex];
      var drawn = [];
      for (var d = 0; d < MediCard.Config.defaults.drawPerTurn && gs.deck.length > 0; d++) {
        var drawnCard = gs.deck.pop();
        drawn.push(drawnCard);
        nextPlayer.hand.push(drawnCard);
      }
      MediCard.IdentitySkills.applyTurnStartEffects(nextPlayer);

      var victory = MediCard.Victory.check(gs.players);

      this.broadcast({
        t: MediCard.SyncProtocol.MessageType.DELTA_STATE,
        d: {
          type: 'turn_change',
          currentPlayerIndex: gs.currentPlayerIndex,
          drawnCount: drawn.length,
          deckCount: gs.deck.length,
          players: gs.players.map(function(p) {
            return { hp: p.resources.hp.current, mp: p.resources.mp.current,
                     kp: p.resources.kp.current, alive: p.alive, handCount: p.hand.length };
          }),
          gameOver: victory ? true : false,
          winner: victory ? victory.winner : null
        }
      });
    }
  };

  window.MediCard = MediCard;
})();
