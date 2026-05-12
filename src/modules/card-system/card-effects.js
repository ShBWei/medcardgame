/**
 * MediCard 医杀 — Card Effects (V5.2 Full)
 * Resolves effects for all card types: basic, tactic, equipment, delayed
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.CardEffects = {
    /**
     * Resolve a basic card effect (attack/defense/heal)
     */
    resolve(card, source, target, answerCorrect) {
      if (!card || !source || !target || !target.alive) {
        return { type: 'none', value: 0, message: '', effective: false };
      }

      var type = card.cardType;
      var result = { type: type, value: 0, message: '', effective: false };

      switch (type) {
        case 'attack':
          if (answerCorrect) {
            result.message = '对手答对了！攻击被闪避';
            result.effective = false;
          } else {
            // Apply equipment bonuses (手术刀 +1 dmg)
            var bonus = (source.equipment && source.equipment.weapon && source.equipment.weapon.cardSubtype === 'shouShuDao') ? 1 : 0;
            // Apply tactic bonus (药效增强)
            bonus += (source.attackBonus || 0);
            var totalDmg = 1 + bonus;
            // Apply armor reduction (白大褂 -1 dmg)
            if (target.equipment && target.equipment.armor && target.equipment.armor.cardSubtype === 'baiDaGua') {
              totalDmg = Math.max(0, totalDmg - 1);
            }
            var dmg = MediCard.Resources.dealDamage(target, totalDmg);
            result.actual = dmg.actual;
            result.lethal = dmg.lethal;
            result.value = totalDmg;
            result.effective = true;
            result.message = '攻击命中！造成 ' + dmg.actual + ' 点伤害';
            if (bonus > 0) result.message += '（含加成）';
          }
          break;

        case 'defense':
          if (answerCorrect) {
            result.effective = true;
            result.value = 1;
            result.message = '防御成功！免疫本次伤害';
          } else {
            result.effective = false;
            result.message = '防御失败，卡片作废';
          }
          break;

        case 'heal':
          if (answerCorrect) {
            var healed = MediCard.Resources.healDamage(source, 1);
            result.value = healed;
            result.effective = healed > 0;
            result.message = healed > 0 ? '恢复 1 点生命值' : '生命值已满，无需治疗';
          } else {
            result.effective = false;
            result.message = '治疗失败，卡片作废';
          }
          break;
      }

      return result;
    },

    /**
     * Resolve a tactic card effect
     * Returns { type, value, message, effective, needsTargetSelect, needsPeek }
     */
    resolveTactic(card, source, target, answerCorrect, gs) {
      var result = { type: 'tactic', subType: card.cardSubtype, value: 0, message: '', effective: false };
      if (!answerCorrect) {
        result.message = '答错了，锦囊作废';
        return result;
      }

      // Check if source has 防护面罩 immunity
      if (this._hasTacticImmunity(source)) {
        result.message = '防护面罩免疫了锦囊效果';
        return result;
      }

      switch (card.cardSubtype) {
        case 'huiZhen': // 会诊 - draw 2 cards
          var drawn = gs ? gs.drawCards(gs.players.indexOf(source), 2) : [];
          result.value = drawn.length;
          result.effective = drawn.length > 0;
          result.message = '会诊成功！摸了 ' + drawn.length + ' 张牌';
          result.drawnCards = drawn;
          break;

        case 'wuZhen': // 误诊 - target discards 1 card
          if (target && target.alive && target.hand.length > 0) {
            // Check target tactic immunity
            if (this._hasTacticImmunity(target)) {
              result.message = '目标有防护面罩，误诊无效';
              return result;
            }
            var discardIdx = Math.floor(Math.random() * target.hand.length);
            var discarded = target.hand.splice(discardIdx, 1)[0];
            if (gs) gs.discardPile.push(discarded);
            result.effective = true;
            result.discarded = discarded;
            result.message = '误诊成功！' + (target.name || '对手') + '弃了1张牌';
          } else {
            result.message = '目标没有手牌可弃';
          }
          break;

        case 'geLi': // 隔离观察 - target skips next play phase
          if (target && target.alive) {
            if (this._hasTacticImmunity(target)) {
              result.message = '目标有防护面罩，隔离观察无效';
              return result;
            }
            target.skipNextPlayPhase = true;
            result.effective = true;
            result.message = '隔离观察成功！' + (target.name || '对手') + '下回合无法出牌';
          }
          break;

        case 'jiJiu': // 急救 - heal 1 when HP <= 1
          if (source.resources.hp.current <= 1) {
            var hpHealed = MediCard.Resources.healDamage(source, 1);
            result.value = hpHealed;
            result.effective = hpHealed > 0;
            result.message = '急救成功！恢复 ' + hpHealed + ' 点生命值';
          } else {
            result.effective = false;
            result.message = '急救无效：生命值必须≤1才能使用';
          }
          break;

        case 'biaoBen': // 标本检索 - peek top 3 deck cards, pick 1
          if (gs && gs.deck.length > 0) {
            var peekCount = Math.min(3, gs.deck.length);
            var peeked = gs.deck.slice(-peekCount).reverse();
            result.effective = true;
            result.needsPeek = true;
            result.peekedCards = peeked;
            result.message = '标本检索：查看牌库顶 ' + peekCount + ' 张牌';
          } else {
            result.message = '牌库已空，无法检索';
          }
          break;

        case 'yaoXiao': // 药效增强 - this turn attack dmg +1 (stackable)
          source.attackBonus = (source.attackBonus || 0) + 1;
          result.effective = true;
          result.value = source.attackBonus;
          result.message = '药效增强！本回合攻击伤害+' + source.attackBonus;
          break;

        case 'mianYi': // 免疫屏障 - immune next turn
          source.immuneUntilNextTurn = true;
          result.effective = true;
          result.message = '免疫屏障启动！下回合免疫所有伤害';
          break;

        case 'qunTi': // 群体会诊 - all teammates draw 1
          if (gs) {
            var sourceIdx = gs.players.indexOf(source);
            var teamDraws = 0;
            gs.players.forEach(function(p, idx) {
              if (idx !== sourceIdx && p.alive && this._isTeammate(source, p)) {
                var d = gs.drawCards(idx, 1);
                if (d.length > 0) teamDraws++;
              }
            }.bind(this));
            result.value = teamDraws;
            result.effective = teamDraws > 0;
            result.message = '群体会诊！' + teamDraws + ' 名队友各摸了1张牌';
          }
          break;

        case 'jiaoCha': // 交叉感染 - all enemies take 1 damage (all answer)
          // This is "all" answerer - enemies answer, wrong = take damage
          // For simplicity: source answers, if correct all enemies take 1 dmg
          result.effective = true;
          result.value = 0;
          result.isAOEDamage = true;
          result.damage = 1;
          result.message = '交叉感染！所有敌方玩家各受到1点伤害';
          break;
      }

      return result;
    },

    /**
     * Resolve a delayed tactic during judgment phase
     */
    resolveDelayedTactic(card, player, answerCorrect) {
      var result = { type: 'delayed', subType: card.cardSubtype, value: 0, message: '', effective: false };

      // Check vaccination immunity
      if (player.vaccineTurns && player.vaccineTurns > 0) {
        result.message = '疫苗接种保护，' + card.cardName + '效果被免疫';
        return result;
      }

      if (answerCorrect) {
        result.message = '判定成功！' + card.cardName + '被化解';
        return result;
      }

      // Answer wrong → effect triggers
      switch (card.cardSubtype) {
        case 'bingDu': // 病毒感染 - lose 1 HP
          var dmg = MediCard.Resources.dealDamage(player, 1);
          result.effective = true;
          result.value = dmg.actual;
          result.lethal = dmg.lethal;
          result.message = '病毒感染发作！失去 1 点生命值';
          break;

        case 'maZui': // 麻醉剂 - skip entire turn
          player.skipNextTurn = true;
          result.effective = true;
          result.message = '麻醉剂生效！跳过整个回合';
          break;

        case 'yiMiao': // 疫苗接种 - 3 turns immune (already applied when played)
          player.vaccineTurns = 3;
          result.effective = true;
          result.message = '疫苗接种生效！3回合内免疫负面效果';
          break;
      }

      return result;
    },

    /**
     * Apply equipment to a player's equipment slot
     */
    applyEquipment(player, card) {
      if (!player.equipment) {
        player.equipment = { weapon: null, armor: null, accessory: null, mount: null, tool: null };
      }
      var slot = card.equipSlot;
      if (!slot) return { effective: false, message: '无效的装备槽位' };

      var old = player.equipment[slot];
      player.equipment[slot] = card;
      return {
        effective: true,
        oldEquipment: old,
        message: '装备了 ' + card.cardName + (old ? '（替换了' + old.cardName + '）' : '')
      };
    },

    /**
     * Place a delayed tactic on a player
     */
    applyDelayed(player, card) {
      if (!player.delayedTactics) player.delayedTactics = [];
      // Check vaccination
      if (player.vaccineTurns && player.vaccineTurns > 0 && card.cardSubtype !== 'yiMiao') {
        return { effective: false, message: '疫苗接种保护，无法施加负面延时锦囊' };
      }
      player.delayedTactics.push(card);
      return { effective: true, message: '对' + (player.name || '目标') + '使用了' + card.cardName };
    },

    /**
     * Check if a player's turn should be skipped (麻醉剂 effect)
     */
    checkTurnSkip(player) {
      if (player.skipNextTurn) {
        player.skipNextTurn = false;
        return true;
      }
      return false;
    },

    /**
     * Check if a player is immune to damage this turn (免疫屏障)
     */
    isDamageImmune(player) {
      if (player.immuneUntilNextTurn) {
        player.immuneUntilNextTurn = false;
        return true;
      }
      return false;
    },

    /**
     * Check if player has tactic immunity (防护面罩)
     */
    _hasTacticImmunity(player) {
      return player.equipment && player.equipment.accessory &&
             player.equipment.accessory.cardSubtype === 'fangHu';
    },

    /**
     * Check if two players are on the same team
     */
    _isTeammate(p1, p2) {
      var i1 = p1.identity, i2 = p2.identity;
      if (i1 === i2) return true;
      if ((i1 === 'lord' || i1 === 'loyalist') && (i2 === 'lord' || i2 === 'loyalist')) return true;
      if (i1 === 'rebel' && i2 === 'rebel') return true;
      return false;
    },

    /**
     * Reset per-turn status effects on a player (call at turn start)
     */
    resetTurnStatus(player) {
      player.attackBonus = 0;
      // Note: immuneUntilNextTurn stays until used, skipNextPlayPhase is consumed when used
      // vaccineTurns decremented each turn
    },

    /**
     * Tick vaccine turns at turn start
     */
    tickVaccine(player) {
      if (player.vaccineTurns && player.vaccineTurns > 0) {
        player.vaccineTurns--;
      }
    },

    canPlay(player, card) {
      if (!player || !player.alive) return false;
      // 急救 can only be used when HP <= 1
      if (card.cardSubtype === 'jiJiu' && player.resources.hp.current > 1) return false;
      return true;
    },

    getAnswerTimeLimit(rarity) {
      var limits = { common: 15, rare: 20, epic: 25, legendary: 30 };
      return limits[rarity] || 15;
    },

    getAnswerer(card) {
      if (card.answerer) return card.answerer;
      var typeInfo = MediCard.CardData ? MediCard.CardData.getTypeInfo(card.cardType) : null;
      return (typeInfo && typeInfo.answerer) || 'self';
    }
  };

  window.MediCard = MediCard;
})();
