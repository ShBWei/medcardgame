/**
 * MediCard 医杀 — Target Selector
 * Dispatches attack target selection to the correct strategy based on opponent count.
 * Strategies are isolated modules — each handles one player-count scenario.
 *
 * API:
 *   MediCard.TargetSelector.selectTarget(player, card, onSelect, onCancel)
 *     onSelect(targetPlayer) — called when user picks a target
 *     onCancel()            — called when user cancels
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.TargetSelector = {
    /**
     * Select a target for an offensive card in multiplayer.
     * @param {Object} player    — the attacker player object
     * @param {Object} card      — the card being played
     * @param {Function} onSelect — callback(targetPlayer)
     * @param {Function} onCancel — callback()
     */
    selectTarget: function(player, card, onSelect, onCancel) {
      var alivePlayers = MediCard.GameState.players.filter(function(p) {
        return p.alive && p !== player;
      });

      if (alivePlayers.length === 0) {
        if (onCancel) onCancel();
        return;
      }

      var ctx = {
        player: player,
        card: card,
        alivePlayers: alivePlayers,
        onSelect: onSelect,
        onCancel: onCancel
      };

      // Route to strategy by opponent count
      var strategy = alivePlayers.length === 1
        ? MediCard.TargetStrategies.Single
        : MediCard.TargetStrategies.Multiple;

      strategy.execute(ctx);
    }
  };

  window.MediCard = MediCard;
})();
