/**
 * MediCard Duel — P2P Host
 * Host authority for multiplayer games via PeerJS
 * Handles room creation, game start, state sync, turn coordination
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.NetworkHost = {
    _peer: null,
    _connections: [],
    _connected: false,
    _gameStarted: false,
    _playerData: null,
    _syncGameState: null,

    createRoom(playerName) {
      if (typeof Peer === 'undefined') {
        alert('联机模块加载中，请稍后再试。');
        MediCard.GameState.goToScreen('title');
        return;
      }

      var cfg = MediCard.Config.peerjs;
      var roomCode = MediCard.RoomManager.createRoom(playerName);
      var peerId = 'medicard-' + roomCode + '-host';

      try {
        this._peer = new Peer(peerId, {
          host: cfg.host, port: cfg.port, path: cfg.path, secure: cfg.secure, debug: cfg.debug
        });

        this._peer.on('open', function(id) {
          this._connected = true;
          var infoEl = document.getElementById('room-info');
          if (infoEl) {
            infoEl.style.display = 'block';
            infoEl.innerHTML = '' +
              '<div class="room-code-label">房间号</div>' +
              '<div class="room-code">' + roomCode + '</div>' +
              '<p style="color:var(--text-muted);font-size:12px;">等待玩家加入...</p>';
          }
          // Update lobby player slots
          this._updateLobbySlots();
        }.bind(this));

        this._peer.on('connection', function(conn) {
          this._connections.push(conn);
          this._setupConnection(conn);
        }.bind(this));

        this._peer.on('error', function(err) {
          // Peer connection issue
          alert('联机连接失败，请稍后重试。');
          MediCard.GameState.goToScreen('title');
        });
      } catch (e) {
        // Peer creation failed
        alert('联机初始化失败，请使用单人模式。');
        MediCard.GameState.goToScreen('title');
      }
    },

    _setupConnection(conn) {
      var self = this;

      conn.on('data', function(data) {
        var msg = MediCard.SyncProtocol.unpack(data);
        if (!msg) return;

        switch (msg.t) {
          case MediCard.SyncProtocol.MessageType.JOIN_REQUEST:
            var name = msg.d.name || 'Guest';
            if (MediCard.RoomManager.addPlayer(name, conn.peer)) {
              conn.send(MediCard.SyncProtocol.pack(
                MediCard.SyncProtocol.MessageType.JOIN_ACCEPT,
                { roomCode: MediCard.RoomManager.roomCode, playerId: conn.peer, players: MediCard.RoomManager.players }
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

          case MediCard.SyncProtocol.MessageType.PLAYER_READY:
            MediCard.RoomManager.setPlayerReady(conn.peer);
            self._broadcastPlayers();
            // Check if all ready to start
            if (MediCard.RoomManager.allReady() && MediCard.RoomManager.players.length >= 2) {
              setTimeout(function() { self.startGame(); }, 1000);
            }
            break;

          case MediCard.SyncProtocol.MessageType.PLAY_CARD:
            if (self._gameStarted) {
              self._handlePlayCard(conn.peer, msg.d);
            }
            break;

          case MediCard.SyncProtocol.MessageType.ANSWER_QUESTION:
            if (self._gameStarted) {
              self._handleAnswer(conn.peer, msg.d);
            }
            break;

          case MediCard.SyncProtocol.MessageType.END_TURN:
            if (self._gameStarted) {
              self._handleEndTurn(conn.peer);
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
        var idx = self._connections.indexOf(conn);
        if (idx >= 0) self._connections.splice(idx, 1);
        MediCard.RoomManager.removePlayer(conn.peer);
        self._broadcastPlayers();
        self._updateLobbySlots();
      });
    },

    broadcast(message) {
      this._connections.forEach(function(conn) {
        if (conn.open) conn.send(message);
      });
    },

    broadcastTo(peerId, message) {
      var conn = this._connections.find(function(c) { return c.peer === peerId; });
      if (conn && conn.open) conn.send(message);
    },

    _broadcastPlayers() {
      this.broadcast(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.FULL_STATE,
        { type: 'players', players: MediCard.RoomManager.players }
      ));
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
        currentPlayerIndex: 0   // Host goes first
      };

      // Broadcast to all clients (hide other players' hands from each other)
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
              // Only include hand for this player
              hand: (op === p || (p.isHost && op === p)) ? op.hand : null
            };
          })
        };

        if (p.isHost) {
          // Host uses local state
          // Initialize host battle with multiplayer data
          // (handled by screen-battle multiplayer path)
        } else {
          self.broadcastTo(p.peerId, MediCard.SyncProtocol.pack(
            MediCard.SyncProtocol.MessageType.GAME_START,
            stateForPlayer
          ));
        }
      });

      // Navigate to battle for host
      // (screen-lobby will handle this via callback)
    },

    _handlePlayCard(peerId, data) {
      var gs = this._syncGameState;
      if (!gs) return;
      // Find the player
      var playerIdx = gs.players.findIndex(function(p) { return p.peerId === peerId; });
      if (playerIdx < 0 || playerIdx !== gs.currentPlayerIndex) return;
      var player = gs.players[playerIdx];
      var cardIdx = data.cardIndex;

      if (cardIdx >= player.hand.length) return;
      var card = player.hand[cardIdx];
      if (!MediCard.CardEffects.canPlay(player, card)) return;

      // Spend MP
      MediCard.Resources.spendMP(player, card.energyCost);
      // Find target (default: first player going clockwise)
      var targetIdx = (playerIdx + 1) % gs.players.length;
      var target = gs.players[targetIdx];
      if (!target.alive) {
        // Find next alive target
        for (var i = 0; i < gs.players.length; i++) {
          var t = gs.players[(playerIdx + i + 1) % gs.players.length];
          if (t.alive) { target = t; break; }
        }
      }

      // Resolve effect
      var fx = MediCard.CardEffects.resolve(card, player, target);

      // Apply rebel damage bonus
      var rebelBonus = MediCard.IdentitySkills.getDamageBonus(player, target);
      if (rebelBonus > 0 && fx.type === 'attack') {
        fx.actual += rebelBonus;
      }

      // Remove card from hand
      player.hand.splice(cardIdx, 1);
      gs.discardPile.push(card);

      // Gain KP
      MediCard.Resources.gainKP(player, 1);

      // Broadcast result
      this.broadcast(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.DELTA_STATE,
        {
          type: 'card_played',
          sourceIdx: playerIdx,
          targetIdx: targetIdx,
          cardPlayed: { name: card.cardName, rarity: card.rarity, type: card.cardType },
          effect: fx,
          sourceHP: player.resources.hp.current,
          targetHP: target.resources.hp.current,
          targetAlive: target.alive
        }
      ));
    },

    _handleAnswer(peerId, data) {
      // Host validates answer from client and broadcasts result
      this.broadcast(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.ANSWER_QUESTION,
        { peerId: peerId, correct: data.correct, choice: data.choice }
      ));
    },

    _handleEndTurn(peerId) {
      var gs = this._syncGameState;
      if (!gs) return;
      var playerIdx = gs.players.findIndex(function(p) { return p.peerId === peerId; });
      if (playerIdx < 0 || playerIdx !== gs.currentPlayerIndex) return;

      // Advance turn
      gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
      // Skip dead players
      if (!gs.players[gs.currentPlayerIndex].alive) {
        for (var i = 0; i < gs.players.length; i++) {
          gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.players.length;
          if (gs.players[gs.currentPlayerIndex].alive) break;
        }
      }

      // Next player draws 2 cards
      var nextPlayer = gs.players[gs.currentPlayerIndex];
      var drawn = [];
      for (var d = 0; d < 2 && gs.deck.length > 0; d++) {
        var drawnCard = gs.deck.pop();
        drawn.push(drawnCard);
        nextPlayer.hand.push(drawnCard);
      }
      MediCard.Resources.gainMP(nextPlayer, 2);

      // Apply lord turn start heal
      MediCard.IdentitySkills.applyTurnStartEffects(nextPlayer);

      // Check victory
      var victory = MediCard.Victory.check(gs.players);

      // Broadcast turn change
      this.broadcast(MediCard.SyncProtocol.pack(
        MediCard.SyncProtocol.MessageType.DELTA_STATE,
        {
          type: 'turn_change',
          currentPlayerIndex: gs.currentPlayerIndex,
          drawnCount: drawn.length,
          deckCount: gs.deck.length,
          players: gs.players.map(function(p) {
            return { hp: p.resources.hp.current, mp: p.resources.mp.current, kp: p.resources.kp.current, alive: p.alive, handCount: p.hand.length };
          }),
          gameOver: victory ? true : false,
          winner: victory ? victory.winner : null
        }
      ));
    }
  };

  window.MediCard = MediCard;
})();
