/**
 * MediCard 医杀 — Resource System (V5.2)
 * Manages HP only (hand limit = current HP, minimum 1)
 */
(function() {
  const MediCard = window.MediCard || {};
  const D = MediCard.Config ? MediCard.Config.defaults : { initialHP: 4, lordHP: 5 };

  MediCard.Resources = {
    createPlayerResources(overrides = {}) {
      const hp = overrides.hp || D.initialHP;
      return {
        hp: { current: hp, max: hp },
        mp: { current: 0, max: 0 },
        kp: { current: 0, max: 5 },
        alive: true
      };
    },

    dealDamage(player, amount) {
      if (!player.alive) return { actual: 0, lethal: false };
      const actual = Math.max(0, amount);
      player.resources.hp.current = Math.max(0, player.resources.hp.current - actual);
      if (player.resources.hp.current <= 0) {
        player.resources.hp.current = 0;
        player.alive = false;
        player.resources.alive = false;
      }
      return { actual, lethal: !player.alive };
    },

    healDamage(player, amount) {
      if (!player.alive) return 0;
      const before = player.resources.hp.current;
      player.resources.hp.current = Math.min(player.resources.hp.max, player.resources.hp.current + amount);
      return player.resources.hp.current - before;
    },

    getHandLimit(player) {
      if (!player || !player.resources || !player.resources.hp) return 4;
      return Math.max(1, player.resources.hp.current);
    },

    canDrawCard(player) {
      if (!player || !player.hand) return false;
      return player.hand.length < this.getHandLimit(player);
    }
  };

  window.MediCard = MediCard;
})();
