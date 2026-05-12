/**
 * MediCard Duel — P2P Client
 * Client connection for multiplayer games via PeerJS
 * Receives game state, sends player actions
 */
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

    joinRoom(roomCode, playerName) {
      if (typeof Peer === 'undefined') {
        alert('联机模块加载中，请稍后再试。');
        MediCard.GameState.goToScreen('title');
        return;
      }

      var cfg = MediCard.Config.peerjs;
      var clientId = 'medicard-' + roomCode + '-client-' + Math.random().toString(36).substr(2, 6);

      try {
        this._peer = new Peer(clientId, {
          host: cfg.host, port: cfg.port, path: cfg.path, secure: cfg.secure, debug: cfg.debug
        });

        this._peer.on('open', function() {
          var hostId = 'medicard-' + roomCode + '-host';
          var conn = this._peer.connect(hostId, { reliable: true });
          this._setupConnection(conn, playerName);
        }.bind(this));

        this._peer.on('error', function(err) {
          // Peer connection issue
          alert('无法连接到房间: ' + err.message);
          MediCard.GameState.goToScreen('title');
        });
      } catch (e) {
        // Peer creation failed
        alert('联机初始化失败，请使用单人模式。');
        MediCard.GameState.goToScreen('title');
      }
    },

    _setupConnection(conn, playerName) {
      this._hostConn = conn;

      conn.on('open', function() {
        conn.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.JOIN_REQUEST,
          { name: playerName }
        ));
      });

      conn.on('data', function(data) {
        var msg = MediCard.SyncProtocol.unpack(data);
        if (!msg) return;

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
            }
            break;

          case MediCard.SyncProtocol.MessageType.ANSWER_QUESTION:
            // Handle answer result from other players
            break;

          case MediCard.SyncProtocol.MessageType.GAME_OVER:
            MediCard.GameState.goToScreen('result');
            break;

          case MediCard.SyncProtocol.MessageType.PING:
            conn.send(MediCard.SyncProtocol.pack(
              MediCard.SyncProtocol.MessageType.PONG, {}
            ));
            break;
        }
      }.bind(this));

      conn.on('close', function() {
        alert('与主机的连接已断开。');
        MediCard.GameState.goToScreen('title');
      });
    },

    send(message) {
      if (this._hostConn && this._hostConn.open) {
        this._hostConn.send(message);
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
