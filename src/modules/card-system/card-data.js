/**
 * MediCard 医杀 — Card Data (V5.2)
 * Card type definitions, deck generation for 120-card full deck
 * - 72 Basic (attack/defense/heal)
 * - 30 Tactic (9 types)
 * - 12 Equipment (5 types)
 * - 6 Delayed (3 types)
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.CardData = {
    // Recently-used question tracking to avoid repetition
    _recentlyUsedQIds: [],
    _maxRecentQIds: 200,

    // Card type definitions with answer direction
    TYPES: {
      attack:    { name: '医学攻击', icon: '⚔️', color: '#ef4444', answerer: 'opponent', category: 'basic' },
      defense:   { name: '医学防御', icon: '🛡️', color: '#3b82f6', answerer: 'self',     category: 'basic' },
      heal:      { name: '医学治疗', icon: '💚', color: '#10b981', answerer: 'self',     category: 'basic' },
      tactic:    { name: '锦囊',     icon: '📋', color: '#a855f7', answerer: 'self',     category: 'tactic' },
      equipment: { name: '装备',     icon: '🔧', color: '#10b981', answerer: 'self',     category: 'equipment' },
      delayed:   { name: '延时锦囊', icon: '⏳', color: '#f97316', answerer: 'opponent', category: 'delayed' }
    },

    RARITIES: {
      common: { name: '普通', color: '#64748b' }
    },

    /**
     * Create a card from a question with a specified card type
     */
    createCard(question, cardType, subtype) {
      if (!question) return null;
      var type = cardType || 'attack';
      var typeInfo = this.TYPES[type] || this.TYPES.attack;
      return {
        id: question.id,
        cardType: type,
        cardSubtype: subtype || '',
        cardName: typeInfo.name,
        rarity: 'common',
        subjectId: question.subjectId,
        subject: question.subject || '',
        cardEffect: typeInfo.name,
        answerer: typeInfo.answerer,
        question: question.question || question.q || '',
        options: question.options || question.opts || [],
        correctAnswers: question.correctAnswers || (question.ans || []),
        explanation: question.explanation || question.exp || '',
        knowledgePoint: question.knowledgePoint || question.kp || '',
        textbookReference: question.textbookReference || question.ref || ''
      };
    },

    /**
     * Create a specifically named tactic card from a question
     */
    createTacticCard(question, subtype) {
      var cfg = MediCard.Config;
      var def = (cfg && cfg.tacticDefs) ? cfg.tacticDefs[subtype] : null;
      if (!def) return this.createCard(question, 'tactic', subtype);
      return {
        id: 'tac_' + subtype + '_' + question.id,
        cardType: 'tactic',
        cardSubtype: subtype,
        cardName: def.name,
        rarity: 'common',
        subjectId: question.subjectId,
        subject: question.subject || '',
        cardEffect: def.effect,
        answerer: def.answerer,
        question: question.question || question.q || '',
        options: question.options || question.opts || [],
        correctAnswers: question.correctAnswers || (question.ans || []),
        explanation: question.explanation || question.exp || '',
        knowledgePoint: question.knowledgePoint || question.kp || '',
        textbookReference: question.textbookReference || question.ref || ''
      };
    },

    /**
     * Create an equipment card
     */
    createEquipmentCard(question, subtype) {
      var cfg = MediCard.Config;
      var def = (cfg && cfg.equipmentDefs) ? cfg.equipmentDefs[subtype] : null;
      if (!def) return this.createCard(question, 'equipment', subtype);
      return {
        id: 'equ_' + subtype + '_' + question.id,
        cardType: 'equipment',
        cardSubtype: subtype,
        cardName: def.name,
        rarity: 'common',
        subjectId: question.subjectId,
        subject: question.subject || '',
        cardEffect: def.effect,
        equipSlot: def.slot,
        answerer: 'self',
        question: question.question || question.q || '',
        options: question.options || question.opts || [],
        correctAnswers: question.correctAnswers || (question.ans || []),
        explanation: question.explanation || question.exp || '',
        knowledgePoint: question.knowledgePoint || question.kp || '',
        textbookReference: question.textbookReference || question.ref || ''
      };
    },

    /**
     * Create a delayed tactic card
     */
    createDelayedCard(question, subtype) {
      var cfg = MediCard.Config;
      var def = (cfg && cfg.delayedDefs) ? cfg.delayedDefs[subtype] : null;
      if (!def) return this.createCard(question, 'delayed', subtype);
      return {
        id: 'dly_' + subtype + '_' + question.id,
        cardType: 'delayed',
        cardSubtype: subtype,
        cardName: def.name,
        rarity: 'common',
        subjectId: question.subjectId,
        subject: question.subject || '',
        cardEffect: def.effect,
        delayedTarget: def.target,
        delayedDuration: def.duration || 1,
        answerer: 'opponent', // Delayed tactics: target answers at judgment
        question: question.question || question.q || '',
        options: question.options || question.opts || [],
        correctAnswers: question.correctAnswers || (question.ans || []),
        explanation: question.explanation || question.exp || '',
        knowledgePoint: question.knowledgePoint || question.kp || '',
        textbookReference: question.textbookReference || question.ref || ''
      };
    },

    /**
     * Generate a basic attack=10/defense=4/heal=2 × 4 = 64 card deck (fallback)
     */
    generateBasicDeck(selectedSubjectIds, questionLoader) {
      var allQuestions = [];
      (selectedSubjectIds || []).forEach(function(subjectId) {
        var questions = questionLoader.getSubject(subjectId);
        if (questions) {
          questions.forEach(function(q) {
            if (q && typeof q === 'object' && !Array.isArray(q)) {
              allQuestions.push(q);
            }
          });
        }
      });
      if (allQuestions.length === 0) return [];
      var shuffled = this._shuffle(allQuestions.slice());
      var deck = [];
      var used = 0;
      var counts = [10, 10, 10, 10, 4, 4, 4, 4, 2, 2, 2, 2]; // 4 each of attack/defense/heal per "round"
      // Simple: generate 72 cards (48 attack, 16 defense, 8 heal)
      var selfB = this;
      var skipCountB = 0;
      function nextQ() {
        // If every question has been recently used, reshuffle and reset
        if (skipCountB >= shuffled.length) {
          shuffled = selfB._shuffle(shuffled.slice());
          selfB._recentlyUsedQIds = [];
          skipCountB = 0;
          used = 0;
        }
        var q = shuffled[used % shuffled.length];
        used++;
        if (used >= shuffled.length) {
          used = 0;
          shuffled = selfB._shuffle(shuffled.slice());
          selfB._recentlyUsedQIds = [];
          skipCountB = 0;
        }
        // Skip recently used questions
        if (q && selfB._recentlyUsedQIds.indexOf(q.id) >= 0) {
          skipCountB++;
          return nextQ();
        }
        skipCountB = 0;
        if (q && q.id) {
          selfB._recentlyUsedQIds.push(q.id);
          if (selfB._recentlyUsedQIds.length > selfB._maxRecentQIds) {
            selfB._recentlyUsedQIds.shift();
          }
        }
        return q;
      }
      for (var i = 0; i < 48; i++) { deck.push(this.createCard(nextQ(), 'attack')); }
      for (var j = 0; j < 16; j++) { deck.push(this.createCard(nextQ(), 'defense')); }
      for (var k = 0; k < 8; k++) { deck.push(this.createCard(nextQ(), 'heal')); }
      return this._shuffle(deck);
    },

    /**
     * Generate 120-card full deck from selected subjects
     */
    generateFullDeck(selectedSubjectIds, questionLoader) {
      var allQuestions = [];
      var ids = selectedSubjectIds || [];
      ids.forEach(function(subjectId) {
        var questions = questionLoader.getSubject(subjectId);
        if (questions) {
          questions.forEach(function(q) {
            if (q && typeof q === 'object' && !Array.isArray(q)) {
              allQuestions.push(q);
            }
          });
        }
      });

      if (allQuestions.length === 0) return [];

      var shuffled = this._shuffle(allQuestions.slice());
      var deck = [];
      var usedIdx = 0;
      var cfg = MediCard.Config;
      var comp = cfg ? cfg.fullDeckComposition : null;
      if (!comp) return [];

      // Track recently-used questions for draw-without-replacement.
      // Questions are only reused when the entire pool has been exhausted
      // and reshuffled.
      var self = this;
      var skipCount = 0;

      function nextQ() {
        // If we've tried every question and all are recently-used, reset the pool
        if (skipCount >= shuffled.length) {
          shuffled = self._shuffle(shuffled.slice());
          usedIdx = 0;
          self._recentlyUsedQIds = [];
          skipCount = 0;
        }

        var q = shuffled[usedIdx];
        usedIdx++;
        if (usedIdx >= shuffled.length) {
          usedIdx = 0;
          // Exhausted the pool — reshuffle and clear tracking for fresh cycle
          shuffled = self._shuffle(shuffled.slice());
          self._recentlyUsedQIds = [];
          skipCount = 0;
          // Re-fetch first question from reshuffled pool
          q = shuffled[usedIdx];
          usedIdx++;
        }

        // Skip if this question was recently used
        if (q && self._recentlyUsedQIds.indexOf(q.id) >= 0) {
          skipCount++;
          return nextQ();
        }
        skipCount = 0;

        // Track this question as recently used
        if (q && q.id) {
          self._recentlyUsedQIds.push(q.id);
          if (self._recentlyUsedQIds.length > self._maxRecentQIds) {
            self._recentlyUsedQIds.shift();
          }
        }

        return q;
      }

      // === Basic cards (72) ===
      var bc = comp.basic;
      for (var a = 0; a < bc.attack; a++)  { var c = this.createCard(nextQ(), 'attack'); c.id = 'atk_' + a + '_' + c.id; deck.push(c); }
      for (var d = 0; d < bc.defense; d++) { var c2 = this.createCard(nextQ(), 'defense'); c2.id = 'def_' + d + '_' + c2.id; deck.push(c2); }
      for (var h = 0; h < bc.heal; h++)    { var c3 = this.createCard(nextQ(), 'heal'); c3.id = 'heal_' + h + '_' + c3.id; deck.push(c3); }

      // === Tactic cards (30) ===
      var tc = comp.tactic;
      var tacticTypes = ['huiZhen','wuZhen','geLi','jiJiu','biaoBen','yaoXiao','mianYi','qunTi','jiaoCha','duoJi'];
      tacticTypes.forEach(function(subtype) {
        var count = tc[subtype] || 0;
        for (var i = 0; i < count; i++) {
          deck.push(this.createTacticCard(nextQ(), subtype));
        }
      }.bind(this));

      // === Equipment cards (12) ===
      var ec = comp.equipment;
      var equipTypes = ['shouShuDao','baiDaGua','fangHu','jiuHuChe','tingZhenQi'];
      equipTypes.forEach(function(subtype) {
        var count = ec[subtype] || 0;
        for (var i = 0; i < count; i++) {
          deck.push(this.createEquipmentCard(nextQ(), subtype));
        }
      }.bind(this));

      // === Delayed tactic cards (6) ===
      var dc = comp.delayed;
      var delayedTypes = ['bingDu','maZui','yiMiao'];
      delayedTypes.forEach(function(subtype) {
        var count = dc[subtype] || 0;
        for (var i = 0; i < count; i++) {
          deck.push(this.createDelayedCard(nextQ(), subtype));
        }
      }.bind(this));

      return this._shuffle(deck);
    },

    getTypeInfo(cardType) {
      return this.TYPES[cardType] || this.TYPES.attack;
    },

    getRarityInfo(rarity) {
      return this.RARITIES[rarity] || this.RARITIES.common;
    },

    _shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }
  };

  window.MediCard = MediCard;
})();
