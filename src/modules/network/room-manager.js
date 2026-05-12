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
    maxPlayers: 2,
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

    addPlayer(name, peerId) {
      if (this.players.length >= this.maxPlayers) return false;
      this.players.push({
        id: 'player_' + (this.players.length + 1),
        name: name,
        peerId: peerId,
        ready: false,
        isHost: false
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

    // Get identity distribution for current player count
    getIdentityDistribution() {
      var count = this.players.length;
      switch (count) {
        case 2: return ['lord', 'rebel'];
        case 3: return ['lord', 'loyalist', 'spy'];
        case 4: return ['lord', 'loyalist', 'rebel', 'rebel'];
        case 5: return ['lord', 'loyalist', 'rebel', 'rebel', 'spy'];
        default: return [];
      }
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
