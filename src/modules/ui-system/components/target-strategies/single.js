/**
 * MediCard 医杀 — Target Strategy: Single Opponent (2-player)
 * Auto-locks the only opponent. No UI needed.
 */
(function() {
  var MediCard = window.MediCard || {};
  MediCard.TargetStrategies = MediCard.TargetStrategies || {};

  MediCard.TargetStrategies.Single = {
    execute: function(ctx) {
      ctx.onSelect(ctx.alivePlayers[0]);
    }
  };

  window.MediCard = MediCard;
})();
