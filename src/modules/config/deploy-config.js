/**
 * MediCard 医杀 — Deploy Configuration (V5.3)
 * Full 120-card deck: 72 basic + 30 tactic + 12 equipment + 6 delayed
 */
(function() {
  const MediCard = window.MediCard || {};

  MediCard.Config = {
    version: '5.6.0',
    appName: 'MediCard 医杀',

    get mode() {
      if (window.location.hostname.includes('pages.dev')) return 'cloudflare-pages';
      if (window.location.hostname.includes('github.io')) return 'github-pages';
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return 'server';
      return 'local';
    },

    peerjs: {
      host: window.location.hostname || 'localhost',
      port: (function() {
        var hn = window.location.hostname;
        var port = Number(window.location.port);
        // Local dev: HTTP on 8080, PeerJS proxied via same port
        if (hn === 'localhost' || hn === '127.0.0.1') return port || 8080;
        // Remote: PeerJS proxied through HTTP port (internal WebSocket proxy)
        return port || (window.location.protocol === 'https:' ? 443 : 80);
      })(),
      path: '/medicard',
      key: 'medicard',
      // Auto-detect secure: WSS for HTTPS pages, WS for HTTP (mixed-content prevention)
      secure: window.location.protocol === 'https:',
      debug: 1,
      // ICE servers for NAT traversal (STUN + multiple TURN for symmetric NAT fallback)
      config: {
        iceServers: [
          // Google STUN (address discovery — UDP, works anywhere)
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Primary TURN: Metered.ca free tier (UDP + TCP + TLS fallbacks)
          {
            urls: [
              'turn:openrelay.metered.ca:80?transport=udp',
              'turn:openrelay.metered.ca:443?transport=tcp',
              'turns:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          // Backup TURN: Viagenie (different provider for redundancy)
          {
            urls: [
              'turn:numb.viagenie.ca:3478?transport=udp',
              'turn:numb.viagenie.ca:3478?transport=tcp',
              'turns:numb.viagenie.ca:5349?transport=tcp'
            ],
            username: 'webrtc@live.com',
            credential: 'muazkh'
          },
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 4,
        iceServersTimeout: 5000
      }
    },

    defaults: {
      maxPlayers: 5,
      handSize: 4,
      initialHP: 4,
      lordHP: 5,
      drawPerTurn: 3,
      deckSize: 120,
      turnTimeLimit: 60,
      answerTimeCommon: 15,
      answerTimeRare: 20,
      answerTimeEpic: 25,
      answerTimeLegendary: 30
    },

    // Identity HP values
    identityHP: {
      lord: 5, loyalist: 4, rebel: 4, spy: 4
    },

    // 绝杀 replaces 20% of attack cards during deck generation
    // 决斗 is a standalone card type added separately
    fullDeckComposition: {
      basic: {
        attack: 36, defense: 20, heal: 8, yingjiYuan: 4
      },
      jueshaRatio: 0.2,      // 20% of attack cards become 绝杀
      juedouCount: 4,        // 4 决斗 cards per deck
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
        duoJi: 2,          // 多重打击 - reset attack limit
        qiGuanZhaiChu: 2, // 器官摘除 - remove equip/hand
        yangBenCaiJi: 2,  // 样本采集 - steal equip/hand
        leiDian: 2,       // 雷电牌 - chain judgment 0-9 match
        bingLiFenXi: 2    // 病历分析 - peek top 3 reorder
      },
      equipment: {
        shouShuDao: 3,   // 手术刀 - weapon
        baiDaGua: 3,     // 白大褂 - armor
        fangHu: 2,       // 防护面罩 - accessory
        shuYeDai: 2,     // 输液袋 - sacrifice for heal
        jiuHuChe: 2,     // 救护车 - mount
        tingZhenQi: 2,   // 听诊器 - tool
        yiXueCiDian: 2   // 医学辞典 - peek 2 for answer ref
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
      qunTi:     { name: '群体会诊', icon: '👥', effect: '所有其他玩家各摸1张牌',         answerer: 'self', count: 2 },
      jiaoCha:   { name: '交叉感染', icon: '🦠', effect: '对所有敌方玩家各造成1点伤害',    answerer: 'all',  count: 2 },
      duoJi:         { name: '多重打击', icon: '⚡', effect: '本回合可以额外使用攻击牌（重置攻击次数）', answerer: 'self', count: 2 },
      qiGuanZhaiChu: { name: '器官摘除', icon: '🫁', effect: '答对后选择目标对手，摘除其1个装备（可见）或随机弃其1张手牌（盲抽）', answerer: 'self', count: 2 },
      yangBenCaiJi:  { name: '样本采集', icon: '🧪', effect: '答对后随机偷取对手1件装备（自动装上）或1张手牌（加入手牌）', answerer: 'self', count: 2 },
      leiDian:       { name: '雷电牌',   icon: '⚡', effect: '选定数字0~9，从下家开始顺时针判定，随机数与所选一致时扣3血，不一致则传递给下一位', answerer: 'self', count: 2 },
      bingLiFenXi:   { name: '病历分析', icon: '📋', effect: '查看牌库顶3张，以任意顺序放回（无需答题）', answerer: 'self', count: 2 }
    },

    // Equipment card definitions
    equipmentDefs: {
      shouShuDao:  { name: '手术刀',   icon: '🔪', effect: '攻击命中后可答题，答对额外+1伤害', slot: 'weapon',    count: 3 },
      baiDaGua:    { name: '白大褂',   icon: '👨‍⚕️', effect: '受到伤害时减少1点',          slot: 'armor',     count: 3 },
      fangHu:      { name: '防护面罩', icon: '😷', effect: '免疫所有锦囊牌效果',          slot: 'accessory', count: 2 },
      shuYeDai:    { name: '输液袋',   icon: '💧', effect: '可弃置此装备回复1点HP',      slot: 'accessory', count: 2 },
      jiuHuChe:    { name: '救护车',   icon: '🚑', effect: '攻击距离-1（更容易打到人）',  slot: 'mount',     count: 2 },
      tingZhenQi:  { name: '听诊器',   icon: '🩺', effect: '每回合开始可查看1名玩家1张手牌', slot: 'tool',    count: 2 },
      yiXueCiDian: { name: '医学辞典', icon: '📖', effect: '答题时可翻牌库顶2张，选1张作为判定参考', slot: 'tool', count: 2 }
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
      'cell-biology':          { name: '细胞生物学',   icon: '🧬', color: '#06b6d4', questionCount: 120 },
      'biochemistry':          { name: '生物化学',     icon: '⚗️', color: '#8b5cf6', questionCount: 1258 },
      'physiology':            { name: '生理学',       icon: '❤️', color: '#f43f5e', questionCount: 909 },
      'pathology':             { name: '病理学',       icon: '🦠', color: '#ef4444', questionCount: 740 },
      'histology-embryology':  { name: '组织与胚胎学', icon: '🔬', color: '#10b981', questionCount: 578 },
      'systematic-anatomy':    { name: '系统解剖学',   icon: '🦴', color: '#f97316', questionCount: 1981 },
      'immunology':            { name: '免疫学',       icon: '🛡️', color: '#3b82f6', questionCount: 1543 },
      'microbiology':          { name: '微生物学',     icon: '🧫', color: '#84cc16', questionCount: 1073 }
    }
  };

  window.MediCard = MediCard;
})();
