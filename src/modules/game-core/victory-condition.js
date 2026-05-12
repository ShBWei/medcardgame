/**
 * MediCard Duel — Victory Conditions
 * Checks win/loss based on identities and alive status
 * Identities: lord (主公), loyalist (忠臣), rebel (反贼), spy (内奸)
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.Victory = {
    /**
     * Check if any victory condition is met
     * @param {Array} players - All players with identity and alive status
     * @returns {Object|null} {winner: identity, reason: string} or null if game continues
     */
    check(players) {
      const alive = players.filter(p => p.alive);
      const lord = players.find(p => p.identity === 'lord');
      const rebels = players.filter(p => p.identity === 'rebel');
      const loyalists = players.filter(p => p.identity === 'loyalist');
      const spies = players.filter(p => p.identity === 'spy');
      const aliveRebels = rebels.filter(p => p.alive);

      // Lord is dead
      if (lord && !lord.alive) {
        // If all rebels are dead too, spy wins (if spy is alive)
        if (aliveRebels.length === 0) {
          const aliveSpy = spies.find(p => p.alive);
          if (aliveSpy) {
            return { winner: 'spy', reason: '主公已死，反贼已灭，内奸获得最终胜利！' };
          }
          return { winner: 'draw', reason: '主公与反贼同归于尽！' };
        }
        // Rebels win when lord dies
        return { winner: 'rebel', reason: '反贼成功击杀主公！' };
      }

      // All rebels AND spies are dead — lord + loyalists win
      if (aliveRebels.length === 0 && spies.every(p => !p.alive)) {
        return { winner: 'lord', reason: '主公阵营成功消灭所有反贼和内奸！' };
      }

      // 2-player duel mode (lord vs rebel)
      if (players.length === 2) {
        if (alive.length === 1) {
          const winner = alive[0];
          if (winner.identity === 'rebel') {
            return { winner: 'rebel', reason: '反贼成功击杀主公！' };
          }
          return { winner: 'lord', reason: '主公成功击败反贼！' };
        }
        if (alive.length === 0) {
          return { winner: 'draw', reason: '双方同归于尽！' };
        }
      }

      return null; // Game continues
    },

    /**
     * Get display text for identity
     */
    getIdentityName(identity) {
      const names = { lord: '主公', loyalist: '忠臣', rebel: '反贼', spy: '内奸' };
      return names[identity] || identity;
    },

    /**
     * Check if player's objective is met
     */
    isPlayerWin(playerIdentity, winnerIdentity) {
      if (winnerIdentity === 'draw') return false;
      if (playerIdentity === 'lord' || playerIdentity === 'loyalist') {
        return winnerIdentity === 'lord';
      }
      if (playerIdentity === 'rebel') {
        return winnerIdentity === 'rebel';
      }
      if (playerIdentity === 'spy') {
        return winnerIdentity === 'spy';
      }
      return false;
    }
  };

  window.MediCard = MediCard;
})();
