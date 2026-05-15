/**
 * MediCard Duel — P2P Client (V5.5)
 * Client connection for multiplayer games via PeerJS
 * Receives game state, sends player actions
 * V5.5: WebSocket relay fallback when WebRTC DataChannel blocked
 */
/* global Peer */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.NetworkClient = {
    _peer: null,
    _hostConn: null,
    _myIndex: -1,
    _gameState: null,
    _onStateUpdate: null,
    _onGameStart: null,
    _onCardEffect: null,
    _onTurnChange: null,
    _relay: null,
    _relayReady: false,
    _dcOpen: false,
    _roomCode: null,
    _clientId: null,
    _recentMsgs: [],     // dedup: recently seen (type|timestamp) keys

    joinRoom(roomCode, playerName) {
      if (typeof Peer === 'undefined') {
        alert('联机模块加载中，请稍后再试。');
        MediCard.GameState.goToScreen('title');
        return;
      }

      var cfg = MediCard.Config.peerjs;
      this._roomCode = roomCode;
      this._clientId = 'medicard-' + roomCode + '-client-' + Math.random().toString(36).substr(2, 6);
      this._dcOpen = false;
      this._relayReady = false;

      // ── Set up relay transport (guaranteed TCP fallback) ──
      this._relay = MediCard.RelayTransport;
      var self = this;

      this._relay.on('open', function() {
        self._relayReady = true;
        console.log('[P2P-Client] Relay transport ready for room', roomCode);
      });

      this._relay.on('data', function(msg) {
        self._handleRelayData(msg.payload);
      });

      this._relay.on('error', function(err) {
        console.warn('[P2P-Client] Relay error:', err.message);
      });

      // Connect relay using the same client ID
      this._relay.connect(roomCode, this._clientId);

      // ── Set up PeerJS (signaling + optional P2P) ──
      try {
        console.log('[P2P-Client] Creating peer:', this._clientId, 'sig:', cfg.host + ':' + cfg.port + cfg.path);
        this._peer = new Peer(this._clientId, {
          host: cfg.host, port: cfg.port, path: cfg.path, key: cfg.key, secure: cfg.secure, debug: cfg.debug
        });

        this._peer.on('open', function(id) {
          console.log('[P2P-Client] Signaling connected, my ID:', id);
          var hostId = 'medicard-' + roomCode + '-host';
          console.log('[P2P-Client] Connecting to host peer:', hostId);
          var conn = this._peer.connect(hostId, { reliable: true });
          this._setupConnection(conn, playerName);
        }.bind(this));

        this._peer.on('disconnected', function() {
          console.warn('[P2P-Client] Signaling disconnected — attempting reconnect...');
          if (this._peer && !this._peer.destroyed) {
            this._peer.reconnect();
          }
        }.bind(this));

        this._peer.on('error', function(err) {
          console.error('[P2P-Client] Peer error:', err.type, err.message);
          var msg = '无法连接到房间';
          if (err.type === 'network') msg = '网络连接失败，请确认主机地址和端口正确 (TCP ' + cfg.port + ')';
          else if (err.type === 'peer-unavailable') msg = '找不到主机，请确认房间号正确且主机在线';
          else if (err.type === 'server-error') msg = '信令服务器错误，请重试';
          alert(msg + '\n\n(' + err.type + ': ' + err.message + ')');
          MediCard.GameState.goToScreen('title');
        });
      } catch (e) {
        console.error('[P2P-Client] Peer creation failed:', e);
        alert('联机初始化失败，请使用单人模式。');
        MediCard.GameState.goToScreen('title');
      }
    },

    _setupConnection(conn, playerName) {
      this._hostConn = conn;

      conn.on('iceStateChanged', function(state) {
        console.log('[P2P-Client] ICE state:', state);
      });

      conn.on('open', function() {
        console.log('[P2P-Client] DataChannel OPEN — P2P connection established!');
        this._dcOpen = true;
        // Send JOIN_REQUEST with relay client ID so host can reach us via relay too
        conn.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.JOIN_REQUEST,
          { name: playerName, relayId: this._clientId }
        ));
      }.bind(this));

      conn.on('data', function(data) {
        this._handleData(data);
      }.bind(this));

      conn.on('close', function() {
        console.warn('[P2P-Client] DataChannel closed');
        this._dcOpen = false;
        // Don't disconnect — relay is still active
        if (!this._relayReady) {
          alert('与主机的连接已断开。');
          MediCard.GameState.goToScreen('title');
        }
      }.bind(this));
    },

    /** Handle data from either DataChannel or relay */
    _handleData(data) {
      var msg = MediCard.SyncProtocol.unpack(data);
      if (!msg) return;

      // Dedup: skip messages already received via the other transport
      var key = msg.t + '|' + msg.ts;
      if (this._recentMsgs.indexOf(key) >= 0) return;
      this._recentMsgs.push(key);
      if (this._recentMsgs.length > 50) this._recentMsgs.shift();

      switch (msg.t) {
        case MediCard.SyncProtocol.MessageType.JOIN_ACCEPT:
          var infoEl = document.getElementById('room-info');
          if (infoEl) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '<p style="color:#10b981;">✅ 已加入房间！' + msg.d.roomCode + '</p>';
          }
          break;

        case MediCard.SyncProtocol.MessageType.JOIN_REJECT:
          alert('加入房间失败: ' + msg.d.reason);
          MediCard.GameState.goToScreen('lobby');
          break;

        case MediCard.SyncProtocol.MessageType.FULL_STATE:
          if (msg.d.type === 'players') {
            this._updatePlayerList(msg.d.players);
          }
          break;

        case MediCard.SyncProtocol.MessageType.GAME_START:
          this._myIndex = msg.d.yourIndex;
          this._gameState = msg.d;
          if (this._onGameStart) {
            this._onGameStart(msg.d);
          }
          break;

        case MediCard.SyncProtocol.MessageType.DELTA_STATE:
          if (msg.d.type === 'card_played') {
            if (this._onCardEffect) {
              this._onCardEffect(msg.d);
            }
          } else if (msg.d.type === 'turn_change') {
            this._gameState = msg.d;
            if (msg.d.gameOver) {
              MediCard.GameState.goToScreen('result');
            }
            if (this._onTurnChange) {
              this._onTurnChange(msg.d);
            }
          } else if (msg.d.type === 'surrender') {
            if (this._onTurnChange) {
              this._onTurnChange(msg.d);
            }
          }
          break;

        case MediCard.SyncProtocol.MessageType.GAME_OVER:
          MediCard.GameState.goToScreen('result');
          break;

        case MediCard.SyncProtocol.MessageType.PING:
          this.send(MediCard.SyncProtocol.pack(
            MediCard.SyncProtocol.MessageType.PONG, {}
          ));
          break;
      }
    },

    /** Handle data received via relay transport */
    _handleRelayData(payload) {
      // Unpack from relay wrapper (payload is raw protocol message)
      this._handleData(payload);
    },

    /** Send a message through the best available transport */
    send(message) {
      // Prefer DataChannel when open (lower latency)
      if (this._hostConn && this._hostConn.open) {
        try {
          this._hostConn.send(message);
          return;
        } catch(e) {
          console.warn('[P2P-Client] DataChannel send failed, falling back to relay');
        }
      }
      // Fall back to relay
      if (this._relayReady) {
        this._relay.send(message);
      }
    },

    sendPlayCard(cardIndex) {
      this.send(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.PLAY_CARD,
        { cardIndex: cardIndex }
      ));
    },

    sendAnswer(correct, choice) {
      this.send(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.ANSWER_QUESTION,
        { correct: correct, choice: choice }
      ));
    },

    sendEndTurn() {
      this.send(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.END_TURN,
        {}
      ));
    },

    sendReady() {
      this.send(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.PLAYER_READY,
        { ready: true }
      ));
    },

    _updatePlayerList(players) {
      var slots = document.getElementById('player-slots');
      if (!slots) return;
      var html = '';
      players.forEach(function(p) {
        html += '<div class="player-slot filled' + (p.ready ? ' ready' : '') + '">' +
          '<div class="player-slot-icon">' + (p.isHost ? '👑' : '🎮') + '</div>' +
          '<div class="player-slot-name">' + p.name + '</div>' +
          '</div>';
      });
      slots.innerHTML = html;
    },

    /** Register callbacks for game events */
    onGameStart(cb) { this._onGameStart = cb; },
    onCardEffect(cb) { this._onCardEffect = cb; },
    onTurnChange(cb) { this._onTurnChange = cb; },

    /** Get whether it's this client's turn */
    isMyTurn() {
      return this._gameState && this._gameState.currentPlayerIndex === this._myIndex;
    },

    getMyHand() {
      if (!this._gameState) return [];
      var me = this._gameState.players[this._myIndex];
      return me ? (me.hand || []) : [];
    },

    getMyIdentity() {
      if (!this._gameState) return null;
      var me = this._gameState.players[this._myIndex];
      return me ? me.identity : null;
    }
  };

  window.MediCard = MediCard;
})();
