/**
 * MediCard 医杀 — Dynamic Answer Timer Calculator (V1.0)
 *
 * Formula: time = Math.round(base × difficultyCoeff × textCoeff × modeCoeff × extensionCoeff)
 * with per-type floor values and collaborative time extension voting.
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ================================================================
   * 1. Constants
   * ================================================================ */

  /** Base time (seconds): [questionType][difficultyTier] */
  var BASE_TIME = {
    judgment:  { easy: 20, medium: 30, hard: 40 },
    single:    { easy: 30, medium: 40, hard: 50 },
    multiple:  { easy: 60, medium: 70, hard: 80 },
    case:      { easy: 90, medium: 100, hard: 150 }
  };

  /** Absolute floor (seconds) per question type */
  var FLOOR = {
    judgment: 15,
    single:   20,
    multiple: 50,
    case:     90
  };

  /** AI difficulty → multiplier */
  var DIFFICULTY_COEFF = {
    easy:   1.0,
    normal: 1.1,
    hard:   1.3
  };

  /** Question rarity → difficulty tier for base-time lookup */
  function rarityToTier(rarity) {
    if (rarity === 'common') return 'easy';
    if (rarity === 'rare') return 'medium';
    // epic, legendary → hard
    return 'hard';
  }

  /** Text length → multiplier */
  function textLengthCoeff(text) {
    var len = (text || '').length;
    if (len < 80)        return 0.9;
    if (len <= 180)      return 1.0;
    if (len <= 300)      return 1.3;
    return 1.5; // >300
  }

  /** Game mode → multiplier */
  function modeCoeff(mode) {
    // multiplayer = competitive (1.0), single = casual (1.2)
    return mode === 'multiplayer' ? 1.0 : 1.2;
  }

  /* ================================================================
   * 2. Question Type Detection
   * ================================================================ */

  /** Recognised questionType field values */
  var TYPE_ALIASES = {
    'judgment':  'judgment',  '判断题': 'judgment',  '判断': 'judgment',
    'single':    'single',    '单选题': 'single',    '单选': 'single',
    'multiple':  'multiple',  '多选题': 'multiple',  '多选': 'multiple',
    'case':      'case',      '案例题': 'case',      '案例': 'case'
  };

  function detectQuestionType(card) {
    // Prefer explicit field
    if (card.questionType && TYPE_ALIASES[card.questionType]) {
      return TYPE_ALIASES[card.questionType];
    }

    // Fallback: infer from structure
    var opts = card.options || [];
    var correct = card.correctAnswers || [];
    if (opts.length === 2 && correct.length === 1) {
      return 'judgment';
    }
    if (opts.length >= 3 && correct.length >= 2) {
      return 'multiple';
    }
    // Default: single choice (most common in question bank)
    return 'single';
  }

  /* ================================================================
   * 3. Core Calculation
   * ================================================================ */

  /**
   * Calculate answer time limit for a card.
   *
   * @param {Object}  card         — card object (must have .question, .rarity, .questionType etc.)
   * @param {string}  [aiDifficulty] — 'easy' / 'normal' / 'hard' (default 'normal')
   * @param {string}  [mode]         — 'single' / 'multiplayer' (default 'single')
   * @param {number}  [extendBonus]  — accumulated extension coefficient (0.0 = none)
   * @returns {number} seconds
   */
  function calculateTime(card, aiDifficulty, mode, extendBonus) {
    var qType = detectQuestionType(card);
    var tier  = rarityToTier(card.rarity || 'common');

    var base    = BASE_TIME[qType] ? (BASE_TIME[qType][tier] || 30) : 30;
    var diffC   = DIFFICULTY_COEFF[aiDifficulty] || 1.1;
    var textC   = textLengthCoeff(card.question || '');
    var modeC   = modeCoeff(mode || 'single');
    var extC    = 1.0 + (extendBonus || 0);

    var raw = Math.round(base * diffC * textC * modeC * extC);
    var floor = FLOOR[qType] || 20;

    return Math.max(raw, floor);
  }

  /* ================================================================
   * 4. Collaborative Time Extension Voting
   * ================================================================ */

  /**
   * Vote-based time extension.
   *
   * Rules:
   *  - Any player (including answerer) may vote once per question.
   *  - When vote count reaches the current threshold the extensionCoeff
   *    rises by 0.1 and a new (higher) threshold is set.
   *  - Threshold progression: 2 → 3 → 5 → 8 → 13 … (Fibonacci from F₃)
   *
   * Public API:
   *   VoteExtender.reset(questionId)          — start a new question
   *   VoteExtender.vote(questionId, playerId) → { reached, votes, threshold, bonus }
   *   VoteExtender.getBonus(questionId)       → current extension coefficient (0.0–…)
   *   VoteExtender.getState(questionId)       → full state dump for sync
   */

  var _voteState = {};  // keyed by questionId

  /** Fibonacci threshold helper: F(extIdx + 3) */
  function _fibThreshold(extIdx) {
    var a = 1, b = 2;  // F₂=1, F₃=2
    for (var n = 3; n < extIdx + 3; n++) {
      var t = b; b = a + b; a = t;
    }
    return b;
  }

  var VoteExtender = {
    reset: function(questionId) {
      if (!questionId) return;
      _voteState[questionId] = {
        voters: {},          // { playerId: true }
        voteCount: 0,
        extensionsGranted: 0, // how many times threshold has been met
        threshold: 2,         // current votes needed (starts at 2)
        bonus: 0              // accumulated extension coefficient
      };
    },

    /**
     * Cast a vote. Returns result object.
     */
    vote: function(questionId, playerId) {
      var s = _voteState[questionId];
      if (!s) return null;

      var pid = String(playerId || 'unknown');
      if (s.voters[pid]) return { alreadyVoted: true, votes: s.voteCount, threshold: s.threshold, bonus: s.bonus };

      s.voters[pid] = true;
      s.voteCount++;

      // Check threshold
      if (s.voteCount >= s.threshold) {
        s.extensionsGranted++;
        s.bonus += 0.1;
        s.threshold = _fibThreshold(s.extensionsGranted);
        return {
          reached: true,
          votes: s.voteCount,
          threshold: s.threshold,
          bonus: s.bonus,
          extensionsGranted: s.extensionsGranted
        };
      }

      return {
        reached: false,
        votes: s.voteCount,
        threshold: s.threshold,
        bonus: s.bonus,
        needed: s.threshold - s.voteCount
      };
    },

    getBonus: function(questionId) {
      var s = _voteState[questionId];
      return s ? s.bonus : 0;
    },

    getState: function(questionId) {
      return _voteState[questionId] || null;
    },

    /** Restore state (used when host syncs to clients) */
    setState: function(questionId, state) {
      _voteState[questionId] = state;
    }
  };

  /* ================================================================
   * 5. Export
   * ================================================================ */

  MediCard.TimerCalculator = {
    BASE_TIME: BASE_TIME,
    FLOOR: FLOOR,
    DIFFICULTY_COEFF: DIFFICULTY_COEFF,

    detectQuestionType: detectQuestionType,
    rarityToTier: rarityToTier,
    textLengthCoeff: textLengthCoeff,
    modeCoeff: modeCoeff,

    calculateTime: calculateTime,
    VoteExtender: VoteExtender
  };

  window.MediCard = MediCard;
  console.log('[TimerCalculator] Loaded — dynamic timer + vote extension ready');
})();
