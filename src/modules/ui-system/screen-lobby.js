/**
 * MediCard 医杀 — Lobby Screen (V5.2)
 * Online 2-5 player identity game: create/join room, ready, start game via PeerJS P2P
 */
/* global Peer */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenLobby = {
    _mode: null,       // 'host' | 'client'
    _roomCode: null,
    _players: [],
    _maxPlayers: 2,
    _ready: false,
    _gameStarting: false,
    _startPoll: null,

    render() {
      var screen = document.getElementById('screen-lobby');
      if (!screen) return;

      this._mode = null;
      this._roomCode = null;
      this._players = [];
      this._maxPlayers = 2;
      this._ready = false;
      this._gameStarting = false;
      if (this._startPoll) clearInterval(this._startPoll);

      var currentUser = MediCard.Storage.getCurrentUser();
      var playerName = currentUser ? currentUser.username : (MediCard.Storage.getPlayerName() || '医学战士');

      screen.innerHTML = '' +
        '<div class="lobby-header">' +
          '<h2>🌐 联机对战</h2>' +
          '<p>创建房间或输入房间号加入好友的对局（2-5人身份局）</p>' +
        '</div>' +
        '<div id="lobby-name-row">' +
          '<input class="glass-input lobby-name-input" id="lobby-name" placeholder="输入你的昵称" value="' + playerName + '">' +
        '</div>' +
        '<div id="lobby-code-row" style="display:none;margin-top:12px;text-align:center;">' +
          '<input class="glass-input lobby-code-input" id="lobby-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" placeholder="输入6位房间号" style="width:200px;text-align:center;font-size:20px;letter-spacing:4px;">' +
          '<button class="btn btn-primary" id="btn-confirm-join" style="margin-left:8px;min-height:44px;">加入</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-cancel-join" style="margin-left:4px;">取消</button>' +
        '</div>' +
        '<div id="lobby-actions-row" class="lobby-actions">' +
          '<div class="lobby-create-group">' +
            '<button class="btn btn-primary btn-lg" id="btn-create-room">🏠 创建房间</button>' +
            '<select class="glass-input" id="lobby-player-count" style="width:auto;padding:8px 12px;margin-left:8px;">' +
              '<option value="2">2人局</option>' +
              '<option value="3">3人局</option>' +
              '<option value="4">4人局</option>' +
              '<option value="5">5人局</option>' +
            '</select>' +
          '</div>' +
          '<button class="btn btn-secondary btn-lg" id="btn-join-room">🚪 加入房间</button>' +
        '</div>' +
        '<div id="room-panel" style="display:none;"></div>' +
        '<div class="player-slots" id="player-slots"></div>' +
        '<div id="lobby-game-actions" style="display:none;"></div>' +
        '<div style="margin-top:var(--space-md);">' +
          '<button class="btn btn-ghost btn-sm" id="btn-lobby-back">← 返回</button>' +
        '</div>';
    },

    attachEvents() {
      var self = this;

      // Create room
      var btnCreate = document.getElementById('btn-create-room');
      if (btnCreate) btnCreate.addEventListener('click', function() {
        var name = (document.getElementById('lobby-name').value || '').trim() || '医学战士';
        MediCard.Storage.savePlayerName(name);
        var countSel = document.getElementById('lobby-player-count');
        var maxPlayers = countSel ? parseInt(countSel.value, 10) : 2;
        self._createRoom(name, maxPlayers);
      });

      // Join room — toggle code input row
      var btnJoin = document.getElementById('btn-join-room');
      if (btnJoin) btnJoin.addEventListener('click', function() {
        var name = (document.getElementById('lobby-name').value || '').trim() || '医学战士';
        MediCard.Storage.savePlayerName(name);
        var codeRow = document.getElementById('lobby-code-row');
        if (codeRow) {
          codeRow.style.display = 'block';
          var codeInput = document.getElementById('lobby-code');
          if (codeInput) { codeInput.value = ''; codeInput.focus(); }
          var actionsRow = document.getElementById('lobby-actions-row');
          if (actionsRow) actionsRow.style.display = 'none';
        }
      });

      // Confirm join
      var btnConfirmJoin = document.getElementById('btn-confirm-join');
      if (btnConfirmJoin) btnConfirmJoin.addEventListener('click', function() {
        var name = (document.getElementById('lobby-name').value || '').trim() || '医学战士';
        var codeInput = document.getElementById('lobby-code');
        var code = codeInput ? codeInput.value.trim() : '';
        if (code && /^\d{6}$/.test(code)) {
          var codeRow = document.getElementById('lobby-code-row');
          if (codeRow) codeRow.style.display = 'none';
          self._joinRoom(code, name);
        } else {
          alert('请输入6位数字房间号');
        }
      });

      // Cancel join
      var btnCancelJoin = document.getElementById('btn-cancel-join');
      if (btnCancelJoin) btnCancelJoin.addEventListener('click', function() {
        var codeRow = document.getElementById('lobby-code-row');
        if (codeRow) codeRow.style.display = 'none';
        var actionsRow = document.getElementById('lobby-actions-row');
        if (actionsRow) actionsRow.style.display = '';
      });

      // Enter key on code input
      var codeInput = document.getElementById('lobby-code');
      if (codeInput) codeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var btn = document.getElementById('btn-confirm-join');
          if (btn) btn.click();
        }
      });

      // Back
      var btnBack = document.getElementById('btn-lobby-back');
      if (btnBack) btnBack.addEventListener('click', function() {
        self._cleanupNetwork();
        if (self._startPoll) clearInterval(self._startPoll);
        MediCard.GameState.goToScreen('title');
      });
    },

    /* ============ Host: Create Room ============ */
    _reconnectAttempts: 0,
    _maxReconnectAttempts: 5,
    _reconnectBaseDelay: 1000,     // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    _healthCheckInterval: null,   // Periodic ping to detect silent disconnects

    _createRoom(playerName, maxPlayers) {
      var self = this;
      this._mode = 'host';
      this._maxPlayers = maxPlayers;
      this._reconnectAttempts = 0;

      console.log('[Lobby] _createRoom called, name=' + playerName + ', maxPlayers=' + maxPlayers);

      if (typeof Peer === 'undefined') {
        alert('PeerJS 联机库未加载，请检查网络连接后刷新页面。');
        return;
      }

      var roomCode = MediCard.RoomManager.createRoom(playerName, maxPlayers);
      this._roomCode = roomCode;
      this._players = MediCard.RoomManager.players;

      var cfg = MediCard.Config.peerjs;
      var peerId = 'medicard-' + roomCode + '-host';
      console.log('[Lobby] Creating Peer, id=' + peerId + ', cfg=', JSON.stringify(cfg));

      try {
        this._intentionallyDestroying = true;
        if (MediCard.NetworkHost._peer) {
          try { MediCard.NetworkHost._peer.destroy(); } catch(e) {}
        }
        this._intentionallyDestroying = false;
        MediCard.NetworkHost._connections = [];

        MediCard.NetworkHost._peer = new Peer(peerId, {
          host: cfg.host, port: cfg.port, path: cfg.path, key: cfg.key, secure: cfg.secure,
          config: cfg.config || { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
          debug: 0  // Silence PeerJS debug noise; use our own logging
        });

        MediCard.NetworkHost._peer.on('open', function(id) {
          MediCard.NetworkHost._connected = true;
          self._reconnectAttempts = 0; // Reset on successful connection
          self._showRoomPanel();
          self._renderPlayerSlots();
        });

        MediCard.NetworkHost._peer.on('connection', function(conn) {
          MediCard.NetworkHost._connections.push(conn);
          self._setupHostConnection(conn);
        });

        MediCard.NetworkHost._peer.on('error', function(err) {
          console.error('[Lobby] Peer error:', err.type, err.message);
          if (err.type === 'unavailable-id') {
            alert('房间号冲突，请重新创建房间。');
          } else if (err.type === 'server-error' || err.type === 'network') {
            alert('无法连接到联机服务器，请确保服务器已启动。\n(' + err.message + ')');
          } else {
            alert('创建房间失败 [' + err.type + ']: ' + (err.message || '未知错误'));
          }
          MediCard.GameState.goToScreen('title');
        });

        MediCard.NetworkHost._peer.on('disconnected', function() {
          if (self._intentionallyDestroying) return;
          self._reconnectAttempts++;
          console.log('[Lobby] Host Peer disconnected, attempt ' + self._reconnectAttempts + '/' + self._maxReconnectAttempts);
          if (self._reconnectAttempts <= self._maxReconnectAttempts &&
              MediCard.NetworkHost._peer && !MediCard.NetworkHost._peer.destroyed) {
            var delay = self._reconnectBaseDelay * Math.pow(2, self._reconnectAttempts - 1);
            console.log('[Lobby] Reconnecting in ' + delay + 'ms...');
            setTimeout(function() {
              if (MediCard.NetworkHost._peer && !MediCard.NetworkHost._peer.destroyed) {
                MediCard.NetworkHost._peer.reconnect();
              }
            }, delay);
          } else {
            console.log('[Lobby] Max reconnect attempts reached for host, giving up');
            try { MediCard.NetworkHost._peer.destroy(); } catch(e) {}
            alert('联机连接已断开（重试' + self._maxReconnectAttempts + '次均失败）。\n请检查服务器状态后重试。');
            MediCard.GameState.goToScreen('title');
          }
        });

        // ── Initialize relay transport for cross-network data fallback ──
        this._relayReady = false;
        MediCard.NetworkHost._relayReady = false;
        var relay = MediCard.RelayTransport;
        relay.on('open', function() {
          self._relayReady = true;
          MediCard.NetworkHost._relayReady = true;
          console.log('[Lobby] Relay host ready for room', roomCode);
        });
        relay.on('data', function(msg) {
          self._onRelayHostData(msg);
        });
        relay.on('error', function(err) {
          console.warn('[Lobby] Relay host error:', err.message);
        });
        relay.connect(roomCode, peerId);

      } catch (e) {
        alert('联机初始化失败: ' + e.message);
        MediCard.GameState.goToScreen('title');
      }
    },

    _setupHostConnection(conn) {
      var self = this;

      conn.on('open', function() {});

      conn.on('data', function(data) {
        var msg = MediCard.SyncProtocol.unpack(data);
        if (!msg) return;

        switch (msg.t) {
          case MediCard.SyncProtocol.MessageType.JOIN_REQUEST:
            var name = msg.d.name || 'Guest';
            if (MediCard.RoomManager.addPlayer(name, conn.peer)) {
              conn.send(MediCard.SyncProtocol.pack(
                MediCard.SyncProtocol.MessageType.JOIN_ACCEPT,
                { roomCode: self._roomCode, players: MediCard.RoomManager.players, maxPlayers: self._maxPlayers, selectedSubjects: MediCard.GameState.selectedSubjects.slice() }
              ));
              self._players = MediCard.RoomManager.players.slice();
              self._renderPlayerSlots();
              self._broadcastPlayers();
            } else {
              conn.send(MediCard.SyncProtocol.pack(
                MediCard.SyncProtocol.MessageType.JOIN_REJECT,
                { reason: '房间已满（' + MediCard.RoomManager.maxPlayers + '人）' }
              ));
            }
            break;

          case MediCard.SyncProtocol.MessageType.PLAYER_READY:
            MediCard.RoomManager.setPlayerReady(conn.peer);
            self._players = MediCard.RoomManager.players.slice();
            self._renderPlayerSlots();
            self._broadcastPlayers();
            break;

          case MediCard.SyncProtocol.MessageType.PING:
            conn.send(MediCard.SyncProtocol.pack(MediCard.SyncProtocol.MessageType.PONG, {}));
            break;
        }
      });

      conn.on('close', function() {
        var idx = MediCard.NetworkHost._connections.indexOf(conn);
        if (idx >= 0) MediCard.NetworkHost._connections.splice(idx, 1);
        MediCard.RoomManager.removePlayer(conn.peer);
        self._players = MediCard.RoomManager.players.slice();
        self._renderPlayerSlots();
        self._broadcastPlayers();
      });

      conn.on('error', function(err) {
        console.error('[Lobby] Host connection error:', err.type, err.message);
      });

      // Periodic health ping: server-initiated keepalive for NAT binding + stale detection
      var healthPing = setInterval(function() {
        if (!conn.open) { clearInterval(healthPing); return; }
        try {
          conn.send(MediCard.SyncProtocol.pack(MediCard.SyncProtocol.MessageType.PING, {}));
        } catch(e) { clearInterval(healthPing); }
      }, 15000);
      conn.on('close', function() { clearInterval(healthPing); });
    },

    _broadcastPlayers() {
      if (!MediCard.NetworkHost._connections) return;
      var msg = MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.FULL_STATE,
        { type: 'players', players: MediCard.RoomManager.players, maxPlayers: this._maxPlayers }
      );
      for (var i = 0; i < MediCard.NetworkHost._connections.length; i++) {
        var conn = MediCard.NetworkHost._connections[i];
        if (conn.open) conn.send(msg);
      }
      // Also broadcast via relay (cross-network fallback)
      if (this._relayReady) {
        MediCard.RelayTransport.send(msg);
      }
    },

    /* ============ Client: Join Room ============ */
    _joinRoom(roomCode, playerName) {
      var self = this;
      this._mode = 'client';
      this._roomCode = roomCode;
      this._reconnectAttempts = 0;

      if (typeof Peer === 'undefined') {
        alert('PeerJS 联机库未加载，请检查网络连接后刷新页面。');
        return;
      }

      var cfg = MediCard.Config.peerjs;
      var clientId = 'medicard-' + roomCode + '-client-' + Math.random().toString(36).substr(2, 6);

      try {
        this._intentionallyDestroying = true;
        if (MediCard.NetworkClient._peer) {
          try { MediCard.NetworkClient._peer.destroy(); } catch(e) {}
        }
        this._intentionallyDestroying = false;

        MediCard.NetworkClient._peer = new Peer(clientId, {
          host: cfg.host, port: cfg.port, path: cfg.path, key: cfg.key, secure: cfg.secure,
          config: cfg.config || { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
          debug: 0
        });

        MediCard.NetworkClient._peer.on('open', function(id) {
          self._reconnectAttempts = 0;
          var hostId = 'medicard-' + roomCode + '-host';
          var conn = MediCard.NetworkClient._peer.connect(hostId, { reliable: true });
          self._setupClientConnection(conn, playerName);
        });

        MediCard.NetworkClient._peer.on('error', function(err) {
          console.error('[Lobby] Client Peer error:', err.type, err.message);
          if (err.type === 'server-error' || err.type === 'network') {
            alert('无法连接到联机服务器，请确保服务器已启动。\n(' + err.message + ')');
          } else {
            alert('加入房间失败: ' + (err.message || err.type || '未知错误') + '\n请确认房间号正确且房主在线。');
          }
          MediCard.GameState.goToScreen('title');
        });

        MediCard.NetworkClient._peer.on('disconnected', function() {
          if (self._intentionallyDestroying) return;
          self._reconnectAttempts++;
          console.log('[Lobby] Client Peer disconnected, attempt ' + self._reconnectAttempts + '/' + self._maxReconnectAttempts);
          if (self._reconnectAttempts <= self._maxReconnectAttempts &&
              MediCard.NetworkClient._peer && !MediCard.NetworkClient._peer.destroyed) {
            var delay = self._reconnectBaseDelay * Math.pow(2, self._reconnectAttempts - 1);
            console.log('[Lobby] Client reconnecting in ' + delay + 'ms...');
            setTimeout(function() {
              if (MediCard.NetworkClient._peer && !MediCard.NetworkClient._peer.destroyed) {
                MediCard.NetworkClient._peer.reconnect();
              }
            }, delay);
          } else {
            console.log('[Lobby] Max reconnect attempts reached for client');
            try { MediCard.NetworkClient._peer.destroy(); } catch(e) {}
            alert('无法连接到联机服务器（重试' + self._maxReconnectAttempts + '次均失败）。\n请检查服务器状态后重试。');
            MediCard.GameState.goToScreen('title');
          }
        });

        // ── Initialize relay transport for cross-network data fallback ──
        this._relayReady = false;
        this._dcOpened = false;
        var relay = MediCard.RelayTransport;
        relay.on('open', function() {
          self._relayReady = true;
          console.log('[Lobby] Relay client ready for room', roomCode);
          // If DataChannel hasn't opened yet, send JOIN_REQUEST via relay immediately
          if (!self._dcOpened) {
            console.log('[Lobby] Sending JOIN_REQUEST via relay (DataChannel not open yet)');
            relay.send(MediCard.SyncProtocol.pack(
              MediCard.SyncProtocol.MessageType.JOIN_REQUEST,
              { name: playerName, relayId: clientId }
            ));
          }
        });
        relay.on('data', function(msg) {
          self._onRelayClientData(msg);
        });
        relay.on('error', function(err) {
          console.warn('[Lobby] Relay client error:', err.message);
        });
        relay.connect(roomCode, clientId);

      } catch (e) {
        alert('联机初始化失败: ' + e.message);
        MediCard.GameState.goToScreen('title');
      }
    },

    _setupClientConnection(conn, playerName) {
      var self = this;
      MediCard.NetworkClient._hostConn = conn;
      var _connectionOpened = false;
      var _connectionTimer = null;

      // Connection timeout: 30 seconds (cross-network ICE gathering can be slow)
      _connectionTimer = setTimeout(function() {
        if (!_connectionOpened) {
          try { conn.close(); } catch(e) {}
          alert('连接房主超时（30秒），请确认：\n1. 房间号输入正确\n2. 房主仍在房间中\n3. 双方网络均能访问服务器\n\n提示：不同网络下P2P连接需要更长时间建立');
          self._cleanupNetwork();
          MediCard.GameState.goToScreen('lobby');
        }
      }, 30000);

      conn.on('open', function() {
        _connectionOpened = true;
        self._dcOpened = true;
        if (_connectionTimer) { clearTimeout(_connectionTimer); _connectionTimer = null; }
        conn.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.JOIN_REQUEST,
          { name: playerName }
        ));
        self._showRoomPanel();
        self._renderPlayerSlots();
      });

      conn.on('data', function(data) {
        var msg = MediCard.SyncProtocol.unpack(data);
        if (!msg) return;

        switch (msg.t) {
          case MediCard.SyncProtocol.MessageType.JOIN_ACCEPT:
            self._roomCode = msg.d.roomCode;
            self._players = msg.d.players || [];
            self._maxPlayers = msg.d.maxPlayers || 2;
            if (msg.d.selectedSubjects && msg.d.selectedSubjects.length > 0) {
              MediCard.GameState.setSelectedSubjects(msg.d.selectedSubjects);
              MediCard.QuestionLoader.init(msg.d.selectedSubjects);
            }
            self._renderPlayerSlots();
            break;

          case MediCard.SyncProtocol.MessageType.JOIN_REJECT:
            alert('加入失败: ' + msg.d.reason);
            self._cleanupNetwork();
            MediCard.GameState.goToScreen('lobby');
            break;

          case MediCard.SyncProtocol.MessageType.FULL_STATE:
            if (msg.d.type === 'players') {
              self._players = msg.d.players;
              self._maxPlayers = msg.d.maxPlayers || self._maxPlayers;
              self._renderPlayerSlots();
            } else if (msg.d.type === 'subjects') {
              if (msg.d.subjects && msg.d.subjects.length > 0) {
                MediCard.GameState.setSelectedSubjects(msg.d.subjects);
                MediCard.QuestionLoader.init(msg.d.subjects);
              }
            }
            break;

          case MediCard.SyncProtocol.MessageType.GAME_START:
            self._onGameStartAsClient(msg.d);
            break;

          case MediCard.SyncProtocol.MessageType.PING:
            conn.send(MediCard.SyncProtocol.pack(MediCard.SyncProtocol.MessageType.PONG, {}));
            break;
        }
      });

      conn.on('close', function() {
        if (_connectionTimer) { clearTimeout(_connectionTimer); _connectionTimer = null; }
        if (!_connectionOpened) {
          alert('无法连接到房主，可能原因：\n1. 房主已离开房间\n2. 网络防火墙阻止了P2P连接\n3. 房间号输入错误\n\n请确认后重试。');
          self._cleanupNetwork();
          MediCard.GameState.goToScreen('lobby');
        } else {
          alert('与房主的连接已断开');
          self._cleanupNetwork();
          MediCard.GameState.goToScreen('title');
        }
      });

      conn.on('error', function(err) {
        if (_connectionTimer) { clearTimeout(_connectionTimer); _connectionTimer = null; }
        console.error('[Lobby] Client connection error:', err.type, err.message);
        if (!_connectionOpened) {
          alert('连接房主失败 [' + (err.type || 'unknown') + ']\n请确认房间号正确且房主在线。');
          self._cleanupNetwork();
          MediCard.GameState.goToScreen('lobby');
        }
      });

      // Periodic health ping: keep NAT binding alive + detect stale connections
      var healthPing = setInterval(function() {
        if (!conn.open) { clearInterval(healthPing); return; }
        try {
          conn.send(MediCard.SyncProtocol.pack(MediCard.SyncProtocol.MessageType.PING, {}));
        } catch(e) { clearInterval(healthPing); }
      }, 15000);
      conn.on('close', function() { clearInterval(healthPing); });
    },

    /* ============ UI Rendering ============ */
    _showRoomPanel() {
      var panel = document.getElementById('room-panel');
      var actionsRow = document.getElementById('lobby-actions-row');
      var nameRow = document.getElementById('lobby-name-row');
      if (!panel) return;

      if (actionsRow) actionsRow.style.display = 'none';
      if (nameRow) nameRow.style.display = 'none';

      var count = this._players.length;
      var max = this._maxPlayers;

      panel.style.display = 'block';
      panel.innerHTML = '' +
        '<div class="room-code-display">' +
          '<div class="room-code-label">房间号</div>' +
          '<div class="room-code">' + this._roomCode + '</div>' +
        '</div>' +
        '<p style="text-align:center;font-size:13px;color:var(--accent-cyan);margin-top:8px;">' +
          '将此房间号分享给好友（' + count + '/' + max + '人）' +
        '</p>' +
        (this._mode === 'client'
          ? '<p style="text-align:center;font-size:13px;color:#10b981;margin-top:4px;">已连接到房间，等待房主开始游戏...</p>'
          : '<p style="text-align:center;font-size:13px;color:var(--text-muted);margin-top:4px;">等待其他玩家加入...（需至少2人）</p>');

      // Game actions
      var gameActions = document.getElementById('lobby-game-actions');
      if (gameActions) {
        gameActions.style.display = 'block';
        if (this._mode === 'host') {
          gameActions.innerHTML = '' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">' +
              '<button class="btn btn-secondary" id="btn-add-ai">🤖 添加AI</button>' +
              '<select class="glass-input" id="ai-difficulty" style="width:auto;padding:8px 12px;">' +
                '<option value="easy">简单</option>' +
                '<option value="normal" selected>普通</option>' +
                '<option value="hard">困难</option>' +
              '</select>' +
            '</div>' +
            '<button class="btn btn-gold btn-lg" id="btn-start-game" disabled style="margin-top:12px;">⚔️ 开始对决</button>';
          var self = this;
          setTimeout(function() { self._wireStartButton(); self._wireAddAIButton(); }, 100);
        } else {
          gameActions.innerHTML = '<button class="btn btn-primary btn-lg" id="btn-ready">✅ 准备</button>';
          var self2 = this;
          setTimeout(function() { self2._wireReadyButton(); }, 100);
        }
      }
    },

    _wireStartButton() {
      var self = this;
      var btn = document.getElementById('btn-start-game');
      if (!btn) return;

      btn.addEventListener('click', function() {
        if (!MediCard.RoomManager.canStart()) {
          alert('需要至少2名玩家都准备就绪才能开始！');
          return;
        }
        self._gameStarting = true;
        if (self._startPoll) clearInterval(self._startPoll);
        self._startGameAsHost();
      });

      // Poll for player count changes
      this._startPoll = setInterval(function() {
        var count = MediCard.RoomManager.getPlayerCount();
        var allReady = MediCard.RoomManager.allReady();
        var canStart = MediCard.RoomManager.canStart();
        if (count >= 2 && allReady && canStart) {
          btn.disabled = false;
          btn.textContent = '⚔️ 开始对决（' + count + '人局）';
        } else if (count >= 2) {
          btn.disabled = true;
          btn.textContent = '⏳ 等待所有玩家准备...（' + count + '/' + self._maxPlayers + '）';
        } else {
          btn.disabled = true;
          btn.textContent = '⏳ 等待玩家加入（' + count + '/' + self._maxPlayers + '）...';
        }
      }, 500);
    },

    _wireReadyButton() {
      var self = this;
      var btn = document.getElementById('btn-ready');
      if (!btn) return;

      btn.addEventListener('click', function() {
        if (self._ready) return;
        self._ready = true;
        btn.textContent = '✅ 已准备，等待房主开始';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        if (MediCard.NetworkClient) {
          MediCard.NetworkClient.sendReady();
        }
      });
    },

    _wireAddAIButton() {
      var self = this;
      var btn = document.getElementById('btn-add-ai');
      if (!btn) return;
      btn.addEventListener('click', function() {
        if (MediCard.RoomManager.getPlayerCount() >= self._maxPlayers) {
          alert('房间已满，无法添加更多AI');
          return;
        }
        var diffEl = document.getElementById('ai-difficulty');
        var diff = diffEl ? diffEl.value : 'normal';
        var aiNumber = MediCard.RoomManager.players.filter(function(p) { return p.isAI; }).length + 1;
        var name = 'AI-' + ({ easy: '简单', normal: '普通', hard: '困难' }[diff] || '普通') + '-' + aiNumber;
        MediCard.RoomManager.addAIPlayer(name, diff);
        self._players = MediCard.RoomManager.players.slice();
        self._renderPlayerSlots();
        self._updateRoomInfo();
      });
    },

    _updateRoomInfo() {
      var panel = document.getElementById('room-panel');
      if (!panel || panel.style.display === 'none') return;
      var count = this._players.length;
      var max = this._maxPlayers;
      var infoEl = panel.querySelector('p');
      if (infoEl) {
        infoEl.innerHTML = '将此房间号分享给好友（' + count + '/' + max + '人）';
      }
    },

    _renderPlayerSlots() {
      var slots = document.getElementById('player-slots');
      if (!slots) return;

      var max = this._maxPlayers;
      var players = this._players;
      var html = '';

      for (var i = 0; i < max; i++) {
        var p = players[i];
        if (p) {
          var icon = p.isHost ? '👑' : (p.isAI ? '🤖' : '🎮');
          var status = p.isAI ? ' AI机器人 · ' + ({ easy: '简单', normal: '普通', hard: '困难' }[p.aiDifficulty] || '普通') : (p.ready ? ' ✓已准备' : ' 未准备...');
          var statusColor = p.isAI ? '#a855f7' : (p.ready ? '#10b981' : 'var(--text-muted)');
          html += '<div class="player-slot filled' + (p.ready ? ' ready' : '') + (p.isAI ? ' ai' : '') + '">' +
            '<div class="player-slot-icon">' + icon + '</div>' +
            '<div class="player-slot-name">' + p.name + '</div>' +
            '<div style="font-size:10px;color:' + statusColor + ';">' + status + '</div>' +
            '</div>';
        } else {
          html += '<div class="player-slot"><div class="player-slot-icon">❓</div><div class="player-slot-name">等待加入</div></div>';
        }
      }
      slots.innerHTML = html;
    },

    /* ============ Game Start ============ */
    _startGameAsHost() {
      var players = MediCard.RoomManager.players;
      var self = this;

      // Use subjects selected by host earlier
      var selectedSubjects = MediCard.GameState.selectedSubjects.slice();
      if (selectedSubjects.length === 0) {
        selectedSubjects = MediCard.Config.subjectCategories[0].subjects;
      }
      MediCard.QuestionLoader.init(selectedSubjects);

      // Assign identities based on player count
      MediCard.IdentityData.assignIdentities(players);

      // Initialize resources
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        p.resources = MediCard.Resources.createPlayerResources();
        p.hand = [];
        p.alive = true;
        p.shield = 0;
        p.equipment = { weapon: null, armor: null, accessory: null, mount: null, tool: null };
        p.delayedTactics = [];
        p.attackBonus = 0;
        p.immuneUntilNextTurn = false;
        p.skipNextPlayPhase = false;
        p.skipNextTurn = false;
        p.vaccineTurns = 0;
      }

      // Generate full 120-card deck with tactics, equipment, delayed cards
      var selectedIds = Array.from(MediCard.QuestionLoader._selectedSubjects);
      var deck = MediCard.CardData.generateFullDeck(selectedIds, MediCard.QuestionLoader);
      if (!deck || deck.length === 0) {
        // Fallback to basic deck
        deck = MediCard.CardData.generateBasicDeck(selectedIds, MediCard.QuestionLoader);
      }

      // Deal 5 cards each
      for (var pi = 0; pi < players.length; pi++) {
        for (var c = 0; c < 5 && deck.length > 0; c++) {
          players[pi].hand.push(deck.pop());
        }
      }

      // Build game state on host
      var gs = MediCard.GameState;
      gs.players = players;
      gs.deck = deck;
      gs.discardPile = [];
      gs.currentPlayerIndex = 0;
      gs.mode = 'multiplayer';
      gs.isHost = true;

      // Notify ALL clients with game start data
      for (var ci = 0; ci < MediCard.NetworkHost._connections.length; ci++) {
        var conn = MediCard.NetworkHost._connections[ci];
        if (!conn.open) continue;
        // Map connection index to player index, skipping AI players
        var clientIdx = -1;
        var _nonAiCnt = 0;
        for (var _pi = 1; _pi < players.length; _pi++) {
          if (!players[_pi].isAI) {
            if (_nonAiCnt === ci) { clientIdx = _pi; break; }
            _nonAiCnt++;
          }
        }
        if (clientIdx < 0) continue; // safety: skip if mapping fails
        conn.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.GAME_START,
          {
            yourIndex: clientIdx,
            totalPlayers: players.length,
            deckCount: deck.length,
            players: players.map(function(p, pi) {
              var isMe = pi === clientIdx;
              return {
                name: p.name,
                identity: (pi === 0 || isMe) ? p.identity : null,
                identityRevealed: (pi === 0 || isMe),
                identityInfo: (pi === 0 || isMe) ? MediCard.IdentityData.getIdentityInfo(p.identity) : null,
                resources: {
                  hp: { current: p.resources.hp.current, max: p.resources.hp.max },
                  mp: { current: p.resources.mp.current, max: p.resources.mp.max },
                  kp: { current: p.resources.kp.current, max: p.resources.kp.max },
                  alive: true
                },
                handCount: p.hand.length,
                alive: true,
                isHost: p.isHost,
                isAI: !!p.isAI,
                aiDifficulty: p.aiDifficulty || 'normal',
                equipment: p.equipment,
                hand: isMe ? p.hand.slice() : []
              };
            })
          }
        ));
      }

      // Also broadcast GAME_START via relay for clients without DataChannel
      if (this._relayReady) {
        for (var ri = 0; ri < players.length; ri++) {
          var rp = players[ri];
          if (rp.isHost || rp.isAI) continue;
          var riPack = MediCard.SyncProtocol.pack(
            MediCard.SyncProtocol.MessageType.GAME_START,
            {
              yourIndex: ri,
              totalPlayers: players.length,
              deckCount: deck.length,
              players: players.map(function(p, pi) {
                var isMe = pi === ri;
                return {
                  name: p.name,
                  identity: (pi === 0 || isMe) ? p.identity : null,
                  identityRevealed: (pi === 0 || isMe),
                  identityInfo: (pi === 0 || isMe) ? MediCard.IdentityData.getIdentityInfo(p.identity) : null,
                  resources: {
                    hp: { current: p.resources.hp.current, max: p.resources.hp.max },
                    mp: { current: p.resources.mp.current, max: p.resources.mp.max },
                    kp: { current: p.resources.kp.current, max: p.resources.kp.max },
                    alive: true
                  },
                  handCount: p.hand.length,
                  alive: true,
                  isHost: p.isHost,
                  isAI: !!p.isAI,
                  aiDifficulty: p.aiDifficulty || 'normal',
                  equipment: p.equipment,
                  hand: isMe ? p.hand.slice() : []
                };
              })
            }
          );
          MediCard.RelayTransport.send(riPack);
        }
      }

      if (this._startPoll) clearInterval(this._startPoll);

      // Navigate to battle
      MediCard.ScreenBattle._isMultiplayer = true;
      MediCard.ScreenBattle._isHost = true;
      MediCard.ScreenBattle._multiplayerPlayers = players;
      MediCard.ScreenBattle._multiplayerDeck = deck;
      MediCard.ScreenBattle._multiplayerTotalPlayers = players.length;
      if (MediCard.BattleLogger) MediCard.BattleLogger.log('SYSTEM', 'game_start_host', 'Host started game with ' + players.length + ' players');
      MediCard.UI.startGame();
    },

    _onGameStartAsClient(data) {
      var myIdx = data.yourIndex;
      var totalPlayers = data.totalPlayers;
      var players = data.players.map(function(p, i) {
        return {
          id: 'player_' + i,
          name: p.name,
          identity: p.identity,
          identityRevealed: p.identityRevealed,
          identityInfo: p.identityInfo,
          resources: p.resources,
          hand: i === myIdx ? (p.hand || []) : [],
          alive: true,
          isAI: !!p.isAI,
          aiDifficulty: p.aiDifficulty || 'normal',
          isHost: p.isHost,
          peerId: p.isAI ? ('ai_' + i) : (i === 0 ? 'host' : 'client_' + i),
          equipment: { weapon: null, armor: null, accessory: null, mount: null, tool: null },
          delayedTactics: [],
          attackBonus: 0,
          immuneUntilNextTurn: false,
          skipNextPlayPhase: false,
          skipNextTurn: false,
          vaccineTurns: 0,
          maxAttacks: 1
        };
      });

      var gs = MediCard.GameState;
      gs.players = players;
      gs.deck = [];
      gs.discardPile = [];
      gs.deckCount = data.deckCount;
      gs.currentPlayerIndex = 0;
      gs.mode = 'multiplayer';
      gs.isHost = false;

      if (this._startPoll) clearInterval(this._startPoll);

      MediCard.ScreenBattle._isMultiplayer = true;
      MediCard.ScreenBattle._isHost = false;
      MediCard.ScreenBattle._multiplayerPlayers = players;
      MediCard.ScreenBattle._multiplayerTotalPlayers = totalPlayers;
      MediCard.ScreenBattle._myPlayerIndex = myIdx;
      if (MediCard.BattleLogger) MediCard.BattleLogger.log('SYSTEM', 'game_start_client', 'Client joined game, myIndex=' + myIdx);
      MediCard.UI.startGame();
    },

    /* ============ Relay Message Handlers (cross-network fallback) ============ */

    /** Host: handle relay data from clients */
    _onRelayHostData: function(msg) {
      var M = MediCard.SyncProtocol.MessageType;
      var data = MediCard.SyncProtocol.unpack(msg.payload);
      if (!data) return;
      var fromId = msg.from;

      switch (data.t) {
        case M.JOIN_REQUEST:
          var name = data.d.name || 'Guest';
          if (MediCard.RoomManager.addPlayer(name, fromId, fromId)) {
            MediCard.RelayTransport.sendTo(fromId, MediCard.SyncProtocol.pack(
              M.JOIN_ACCEPT, { roomCode: this._roomCode, players: MediCard.RoomManager.players,
                maxPlayers: this._maxPlayers, selectedSubjects: MediCard.GameState.selectedSubjects.slice() }
            ));
            this._players = MediCard.RoomManager.players.slice();
            this._renderPlayerSlots();
            this._broadcastPlayers();
          } else {
            MediCard.RelayTransport.sendTo(fromId, MediCard.SyncProtocol.pack(
              M.JOIN_REJECT, { reason: '房间已满（' + MediCard.RoomManager.maxPlayers + '人）' }
            ));
          }
          break;

        case M.PLAYER_READY:
          MediCard.RoomManager.setPlayerReady(fromId);
          this._players = MediCard.RoomManager.players.slice();
          this._renderPlayerSlots();
          this._broadcastPlayers();
          break;

        case M.PING:
          MediCard.RelayTransport.sendTo(fromId, MediCard.SyncProtocol.pack(M.PONG, {}));
          break;
      }
    },

    /** Client: handle relay data from host */
    _onRelayClientData: function(msg) {
      var M = MediCard.SyncProtocol.MessageType;
      var data = MediCard.SyncProtocol.unpack(msg.payload);
      if (!data) return;

      switch (data.t) {
        case M.JOIN_ACCEPT:
          this._roomCode = data.d.roomCode;
          this._players = data.d.players || [];
          this._maxPlayers = data.d.maxPlayers || 2;
          if (data.d.selectedSubjects && data.d.selectedSubjects.length > 0) {
            MediCard.GameState.setSelectedSubjects(data.d.selectedSubjects);
            MediCard.QuestionLoader.init(data.d.selectedSubjects);
          }
          this._showRoomPanel();
          this._renderPlayerSlots();
          break;

        case M.JOIN_REJECT:
          alert('加入失败: ' + data.d.reason);
          this._cleanupNetwork();
          MediCard.GameState.goToScreen('lobby');
          break;

        case M.FULL_STATE:
          if (data.d.type === 'players') {
            this._players = data.d.players;
            this._maxPlayers = data.d.maxPlayers || this._maxPlayers;
            this._renderPlayerSlots();
          } else if (data.d.type === 'subjects') {
            if (data.d.subjects && data.d.subjects.length > 0) {
              MediCard.GameState.setSelectedSubjects(data.d.subjects);
              MediCard.QuestionLoader.init(data.d.subjects);
            }
          }
          break;

        case M.GAME_START:
          this._onGameStartAsClient(data.d);
          break;

        case M.PING:
          MediCard.RelayTransport.send(MediCard.SyncProtocol.pack(M.PONG, {}));
          break;
      }
    },

    /* ============ Helpers ============ */
    _cleanupNetwork() {
      this._intentionallyDestroying = true;
      if (MediCard.NetworkHost && MediCard.NetworkHost._peer) {
        try { MediCard.NetworkHost._peer.destroy(); } catch(e) {}
        MediCard.NetworkHost._peer = null;
      }
      if (MediCard.NetworkClient && MediCard.NetworkClient._peer) {
        try { MediCard.NetworkClient._peer.destroy(); } catch(e) {}
        MediCard.NetworkClient._peer = null;
      }
      this._intentionallyDestroying = false;
      // Close relay transport
      if (MediCard.RelayTransport && MediCard.RelayTransport.isOpen()) {
        MediCard.RelayTransport.close();
      }
      this._relayReady = false;
      if (MediCard.NetworkHost) MediCard.NetworkHost._relayReady = false;
      MediCard.RoomManager.reset();
    }
  };

  window.MediCard = MediCard;
})();
