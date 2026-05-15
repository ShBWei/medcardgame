/**
 * MediCard Duel — Room Manager
 * Room code generation, player slot management, ready state
 * Supports 2/3/4/5 player identity games
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.RoomManager = {
    roomCode: null,
    players: [],
    maxPlayers: 5,
    isHost: false,

    generateRoomCode() {
      var code = '';
      for (var i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10);
      }
      return code;
    },

    createRoom(hostName, maxPlayers) {
      this.roomCode = this.generateRoomCode();
      this.isHost = true;
      this.maxPlayers = maxPlayers || 2;
      this.players = [{
        id: 'host',
        name: hostName || 'Host',
        ready: true,
        isHost: true
      }];
      return this.roomCode;
    },

    addPlayer(name, peerId, relayId) {
      if (this.players.length >= this.maxPlayers) return false;
      // Dedup: skip if player already added (e.g., via relay before DataChannel)
      for (var i = 0; i < this.players.length; i++) {
        var p = this.players[i];
        if (p.peerId === peerId || (relayId && p.relayId === relayId) || p.peerId === relayId) {
          return false;
        }
      }
      this.players.push({
        id: 'player_' + (this.players.length + 1),
        name: name,
        peerId: peerId,
        relayId: relayId || peerId,
        ready: false,
        isHost: false
      });
      return true;
    },

    addAIPlayer(name, difficulty) {
      if (this.players.length >= this.maxPlayers) return false;
      this.players.push({
        id: 'ai_' + this.players.length,
        name: name || ('AI-' + ({ easy: '简单', normal: '普通', hard: '困难' }[difficulty] || '普通')),
        peerId: null,
        ready: true,
        isHost: false,
        isAI: true,
        aiDifficulty: difficulty || 'normal'
      });
      return true;
    },

    removePlayer(peerId) {
      this.players = this.players.filter(function(p) { return p.peerId !== peerId; });
    },

    setPlayerReady(peerId) {
      var player = this.players.find(function(p) { return p.peerId === peerId; });
      if (player) player.ready = true;
    },

    allReady() {
      return this.players.length >= 2 && this.players.every(function(p) { return p.ready; });
    },

    canStart() {
      return this.players.length >= 2 && this.players.length <= this.maxPlayers && this.allReady();
    },

    getPlayerCount() {
      return this.players.length;
    },

    reset() {
      this.roomCode = null;
      this.players = [];
      this.maxPlayers = 2;
      this.isHost = false;
    }
  };

  window.MediCard = MediCard;
})();
