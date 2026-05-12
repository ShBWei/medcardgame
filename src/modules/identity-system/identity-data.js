/**
 * MediCard 医杀 — Identity Data (V5.2)
 * Identity distribution based on player count
 * HP: lord=5, all others=4
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.IdentityData = {
    IDENTITIES: {
      lord:     { name: '主公', icon: '👑', color: '#fbbf24', hp: 5, description: '初始5血，每回合恢复1HP' },
      loyalist: { name: '忠臣', icon: '🛡️', color: '#3b82f6', hp: 4, description: '与主公共存亡，可为君主公挡刀' },
      rebel:    { name: '反贼', icon: '💀', color: '#ef4444', hp: 4, description: '击杀主公即可获胜，攻击主公伤害+1' },
      spy:      { name: '内奸', icon: '🕵️', color: '#a855f7', hp: 4, description: '每回合多摸1张牌，成为最后生还者' }
    },

    /**
     * Get identity distribution for a given player count
     */
    getDistribution(playerCount) {
      switch (playerCount) {
        case 2: return ['lord', 'rebel'];
        case 3: return ['lord', 'loyalist', 'spy'];
        case 4: return ['lord', 'loyalist', 'rebel', 'rebel'];
        case 5: return ['lord', 'loyalist', 'rebel', 'rebel', 'spy'];
        default: return [];
      }
    },

    /**
     * Assign identities randomly to players
     * Sets HP based on identity (lord=5, others=4)
     */
    assignIdentities(players) {
      var dist = this.getDistribution(players.length);
      // Shuffle
      for (var i = dist.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = dist[i]; dist[i] = dist[j]; dist[j] = tmp;
      }
      // Apply identities
      for (var i = 0; i < players.length; i++) {
        var identity = dist[i];
        var info = this.IDENTITIES[identity];
        players[i].identity = identity;
        players[i].identityRevealed = (identity === 'lord');
        // Set HP based on identity
        var hp = info ? info.hp : 4;
        if (players[i].resources) {
          players[i].resources.hp.max = hp;
          players[i].resources.hp.current = hp;
        }
      }
      return players;
    },

    getIdentityInfo(identity) {
      return this.IDENTITIES[identity] || null;
    }
  };

  window.MediCard = MediCard;
})();
