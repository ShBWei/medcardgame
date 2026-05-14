/**
 * MediCard 医杀 — Identity Skills (V5.2)
 * Special abilities for each identity (HP-only, no MP/KP)
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.IdentitySkills = {
    getSkill(identity) {
      switch (identity) {
        case 'lord':
          return {
            name: '君威',
            description: '回合开始时恢复1点HP',
            passive: true,
            onTurnStart: function(player) {
              if (player.resources && player.alive) {
                MediCard.Resources.healDamage(player, 1);
              }
            }
          };
        case 'loyalist':
          return {
            name: '赤胆',
            description: '当主公受到攻击时，可替主公挡刀',
            passive: true,
            onLordAttacked: function(loyalist, lord, damage) {
              // Redirect damage to loyalist if alive
              if (loyalist.alive && lord.alive) {
                MediCard.Resources.dealDamage(loyalist, damage);
                return 0; // No damage to lord
              }
              return damage;
            }
          };
        case 'rebel':
          return {
            name: '叛击',
            description: '对主公造成的伤害+1',
            passive: true,
            damageBonus: function(target) {
              return (target && target.identity === 'lord') ? 1 : 0;
            }
          };
        case 'spy':
          return {
            name: '潜谋',
            description: '每回合多摸1张牌',
            passive: true,
            extraDraw: 1
          };
        default:
          return null;
      }
    },

    applyTurnStartEffects(player) {
      var skill = this.getSkill(player.identity);
      if (skill && skill.passive && skill.onTurnStart) {
        var hpBefore = player.resources ? player.resources.hp.current : 0;
        skill.onTurnStart(player);
        var hpAfter = player.resources ? player.resources.hp.current : 0;
        var healed = hpAfter - hpBefore;
        return { healed: healed, skillName: skill.name };
      }
      return { healed: 0 };
    },

    getExtraDraw(player) {
      var skill = this.getSkill(player.identity);
      return (skill && skill.extraDraw) ? skill.extraDraw : 0;
    },

    getDamageBonus(source, target) {
      var skill = this.getSkill(source.identity);
      if (skill && skill.damageBonus) {
        return skill.damageBonus(target);
      }
      return 0;
    }
  };

  window.MediCard = MediCard;
})();
