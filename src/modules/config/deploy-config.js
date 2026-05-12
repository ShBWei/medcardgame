/**
 * MediCard 医杀 — Deploy Configuration (V5.2)
 * Full 120-card deck: 72 basic + 30 tactic + 12 equipment + 6 delayed
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.Config = {
    version: '5.2.0',
    appName: 'MediCard 医杀',

    get mode() {
      if (window.location.hostname.includes('github.io')) return 'github-pages';
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return 'server';
      return 'local';
    },

    peerjs: {
      host: window.location.hostname || 'localhost',
      port: 9000,
      path: '/medicard',
      secure: false,
      debug: 0
    },

    defaults: {
      maxPlayers: 2,
      handSize: 4,
      initialHP: 4,
      lordHP: 5,
      drawPerTurn: 2,
      deckSize: 120,
      turnTimeLimit: 60,
      answerTimeCommon: 15,
      answerTimeRare: 20,
      answerTimeEpic: 25,
      answerTimeLegendary: 30
    },

    // Card type definitions with answer direction
    cardTypes: {
      attack:   { name: '医学攻击', icon: '⚔️', color: '#ef4444', answerer: 'opponent', category: 'basic' },
      defense:  { name: '医学防御', icon: '🛡️', color: '#3b82f6', answerer: 'self',     category: 'basic' },
      heal:     { name: '医学治疗', icon: '💚', color: '#10b981', answerer: 'self',     category: 'basic' },
      tactic:   { name: '锦囊',     icon: '📋', color: '#a855f7', answerer: 'self',     category: 'tactic' },
      equipment:{ name: '装备',     icon: '🔧', color: '#10b981', answerer: 'self',     category: 'equipment' },
      delayed:  { name: '延时锦囊', icon: '⏳', color: '#f97316', answerer: 'opponent', category: 'delayed' }
    },

    // Identity HP values
    identityHP: {
      lord: 5, loyalist: 4, rebel: 4, spy: 4
    },

    // Full deck composition (120 cards)
    fullDeckComposition: {
      basic: {
        attack: 48, defense: 16, heal: 8
      },
      tactic: {
        huiZhen: 6,    // 会诊 - draw 2
        wuZhen: 4,     // 误诊 - target discards 1
        geLi: 3,       // 隔离观察 - target skips play phase
        jiJiu: 3,      // 急救 - heal when HP≤1
        biaoBen: 3,    // 标本检索 - peek top 3
        yaoXiao: 4,    // 药效增强 - attack dmg +1
        mianYi: 3,     // 免疫屏障 - immune next turn
        qunTi: 2,      // 群体会诊 - teammates draw 1
        jiaoCha: 2,    // 交叉感染 - all enemies 1 dmg
        duoJi: 2      // 多重打击 - reset attack limit
      },
      equipment: {
        shouShuDao: 3,   // 手术刀 - weapon
        baiDaGua: 3,     // 白大褂 - armor
        fangHu: 2,       // 防护面罩 - accessory
        jiuHuChe: 2,     // 救护车 - mount
        tingZhenQi: 2    // 听诊器 - tool
      },
      delayed: {
        bingDu: 3,      // 病毒感染
        maZui: 2,       // 麻醉剂
        yiMiao: 1       // 疫苗接种
      }
    },

    // Tactic card definitions
    tacticDefs: {
      huiZhen:   { name: '会诊',     icon: '📋', effect: '摸2张牌',                     answerer: 'self', count: 6 },
      wuZhen:    { name: '误诊',     icon: '❌', effect: '指定1名玩家弃1张手牌',         answerer: 'self', count: 4 },
      geLi:      { name: '隔离观察', icon: '🚫', effect: '指定1名玩家下回合不能出牌',    answerer: 'self', count: 3 },
      jiJiu:     { name: '急救',     icon: '🚑', effect: '濒死时使用，恢复1点血',        answerer: 'self', count: 3 },
      biaoBen:   { name: '标本检索', icon: '🔍', effect: '查看牌库顶3张牌，选1张加入手牌', answerer: 'self', count: 3 },
      yaoXiao:   { name: '药效增强', icon: '💊', effect: '本回合所有攻击伤害+1（可叠加）', answerer: 'self', count: 4 },
      mianYi:    { name: '免疫屏障', icon: '🛡️', effect: '下回合免疫所有伤害',            answerer: 'self', count: 3 },
      qunTi:     { name: '群体会诊', icon: '👥', effect: '所有队友各摸1张牌',             answerer: 'self', count: 2 },
      jiaoCha:   { name: '交叉感染', icon: '🦠', effect: '对所有敌方玩家各造成1点伤害',    answerer: 'all',  count: 2 },
      duoJi:     { name: '多重打击', icon: '⚡', effect: '本回合可以额外使用攻击牌（重置攻击次数）', answerer: 'self', count: 2 }
    },

    // Equipment card definitions
    equipmentDefs: {
      shouShuDao:  { name: '手术刀',   icon: '🔪', effect: '攻击距离+1，伤害+1',         slot: 'weapon',    count: 3 },
      baiDaGua:    { name: '白大褂',   icon: '👨‍⚕️', effect: '受到伤害时减少1点',          slot: 'armor',     count: 3 },
      fangHu:      { name: '防护面罩', icon: '😷', effect: '免疫所有锦囊牌效果',          slot: 'accessory', count: 2 },
      jiuHuChe:    { name: '救护车',   icon: '🚑', effect: '攻击距离-1（更容易打到人）',  slot: 'mount',     count: 2 },
      tingZhenQi:  { name: '听诊器',   icon: '🩺', effect: '每回合开始可查看1名玩家1张手牌', slot: 'tool',    count: 2 }
    },

    // Delayed tactic definitions
    delayedDefs: {
      bingDu:  { name: '病毒感染', icon: '🦠', effect: '判定阶段答题，答错掉1血',         target: 'opponent', count: 3 },
      maZui:   { name: '麻醉剂',   icon: '💉', effect: '判定阶段答题，答错跳过回合',     target: 'opponent', count: 2 },
      yiMiao:  { name: '疫苗接种', icon: '💉', effect: '3回合内免疫所有负面效果',        target: 'self',     count: 1, duration: 3 }
    },

    // Equipment slot order (for display)
    equipmentSlots: ['weapon', 'armor', 'accessory', 'mount', 'tool'],

    subjectCategories: [
      {
        id: 'basic-medicine',
        name: '基础医学',
        expandable: false,
        subjects: ['cell-biology', 'biochemistry', 'physiology', 'pathology', 'histology-embryology', 'systematic-anatomy', 'immunology', 'microbiology']
      }
    ],

    quickSelectPresets: [
      { name: '形态学包', subjects: ['cell-biology', 'histology-embryology', 'systematic-anatomy'], icon: '🔬' },
      { name: '功能学包', subjects: ['physiology', 'biochemistry'], icon: '⚡' },
      { name: '病原防御包', subjects: ['pathology', 'immunology', 'microbiology'], icon: '🛡️' },
      { name: '全部8科', subjects: null, icon: '🏆' }
    ],

    subjectMeta: {
      'cell-biology':          { name: '细胞生物学',   icon: '🧬', color: '#06b6d4' },
      'biochemistry':          { name: '生物化学',     icon: '⚗️', color: '#8b5cf6' },
      'physiology':            { name: '生理学',       icon: '❤️', color: '#f43f5e' },
      'pathology':             { name: '病理学',       icon: '🦠', color: '#ef4444' },
      'histology-embryology':  { name: '组织与胚胎学', icon: '🔬', color: '#10b981' },
      'systematic-anatomy':    { name: '系统解剖学',   icon: '🦴', color: '#f97316' },
      'immunology':            { name: '免疫学',       icon: '🛡️', color: '#3b82f6' },
      'microbiology':          { name: '微生物学',     icon: '🧫', color: '#84cc16' }
    }
  };

  window.MediCard = MediCard;
})();
