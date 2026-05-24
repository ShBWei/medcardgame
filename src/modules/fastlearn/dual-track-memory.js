/**
 * MediCard Dual-Track Memory — 双轨记忆架构
 * Cramming track operates independently from daily track.
 * Daily level/nextReview/adaptationFactor are read-only during cramming.
 *
 * [DualTrack] Cramming mode has independent memory trajectory, does not pollute daily
 *   spaced repetition schedule (Anki Custom Study Session "don't reschedule" mechanism)
 * [SM-2] Compressed Ease Factor algorithm adapted for medical exam cramming
 *   (Wozniak, 1987; Piotr Wozniak, SuperMemo)
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ========================================================================
   * CRAMMING TRACK CONSTANTS
   * ======================================================================== */

  /** Compressed intervals for cramming (vs daily: 10min, 1hr, 1d, 3d, 7d) */
  var CRAMMING_LEVEL_INTERVALS = [
    0,                       // Level 0: unlearned, immediate
    10 * 60 * 1000,          // Level 1: 10 min
    30 * 60 * 1000,          // Level 2: 30 min
    2 * 60 * 60 * 1000,      // Level 3: 2 hours
    6 * 60 * 60 * 1000,      // Level 4: 6 hours
    12 * 60 * 60 * 1000      // Level 5: 12 hours (cramming max)
  ];

  /** Ease Factor config for cramming — more aggressive than daily */
  var CRAMMING_EF = {
    INITIAL: 1.3,
    MIN: 0.8,
    MAX: 2.0,
    CORRECT_BONUS: 0.05,
    WRONG_PENALTY: 0.20,     // More punitive than daily (-0.10)
    SLOW_PENALTY: 0.08       // >15s response penalty
  };

  /** Max cramming days before exam — longer windows use daily mode */
  var MAX_CRAMMING_DAYS = 14;

  /* ========================================================================
   * CRAMMING TRACK FACTORY — lazy initialization for old entries
   * ======================================================================== */

  /**
   * Ensure a memory entry has a crammingTrack.
   * Old entries (pre-cramming) have crammingTrack === null — lazily initialize.
   * @param {object} entry — memory entry from FL._memory
   * @returns {object} entry with crammingTrack guaranteed initialized
   */
  function _ensureCrammingTrack(entry) {
    if (!entry) return entry;
    if (entry.crammingTrack) return entry;

    // [DualTrack] Lazy field migration — first cramming access initializes track
    entry.crammingTrack = {
      cramLevel: 0,
      cramEF: CRAMMING_EF.INITIAL,
      lastCrammed: 0,
      nextCram: 0,
      cramHistory: [],
      cramErrorCount: 0,
      cramConsecutiveCorrect: 0,
      scriptErrors: {}       // scriptId → errorCount for vulnerability detection
    };
    return entry;
  }

  /**
   * Check if an entry's cramming track data is valid (non-null, properly initialized).
   * @param {object} entry
   * @returns {boolean}
   */
  function _hasCrammingTrack(entry) {
    return !!(entry && entry.crammingTrack && typeof entry.crammingTrack.cramLevel === 'number');
  }

  /* ========================================================================
   * DUAL-TRACK MEMORY MANAGER
   * ======================================================================== */

  var DualTrack = {
    /** Whether currently in cramming mode */
    _active: false,

    /** Cramming mode configuration */
    _config: null,

    /** Reference to FastLearnCore._memory (set at init) */
    _memory: null,

    /* ----------------------------------------------------------------------
     * MODE LIFECYCLE
     * ---------------------------------------------------------------------- */

    /**
     * Enter cramming mode.
     *
     * @param {object} config
     *   examDate: Date|number — exam date timestamp
     *   targetSubjects: string[] — subject IDs to focus on
     *   dailyQuota: number — questions per session (default 50)
     *   focusWeakPoints: boolean — prioritize weak knowledge points (default true)
     *   preserveDailyTrack: boolean — keep daily track read-only (default true)
     *   maxCrammingDays: number — max days before exam (default 14)
     */
    enterCrammingMode: function(config) {
      config = config || {};
      this._active = true;
      this._config = {
        examDate: config.examDate || (Date.now() + 7 * 24 * 60 * 60 * 1000),
        targetSubjects: config.targetSubjects || [],
        dailyQuota: config.dailyQuota || 50,
        focusWeakPoints: config.focusWeakPoints !== undefined ? config.focusWeakPoints : true,
        preserveDailyTrack: config.preserveDailyTrack !== undefined ? config.preserveDailyTrack : true,
        maxCrammingDays: config.maxCrammingDays || MAX_CRAMMING_DAYS,
        enteredAt: Date.now()
      };

      // Bind to FL._memory if FL exists
      if (MediCard.FastLearnCore) {
        this._memory = MediCard.FastLearnCore._memory;
      }

      // Lazy-init all existing entries with crammingTrack
      this._migrateAllEntries();

      console.log('[DualTrack] Entered cramming mode — exam in',
        Math.round((this._config.examDate - Date.now()) / (24 * 60 * 60 * 1000)), 'days');
    },

    /** Exit cramming mode, restore daily mode isolation */
    exitCrammingMode: function() {
      this._active = false;
      this._config = null;
      console.log('[DualTrack] Exited cramming mode — daily track preserved');
    },

    /** @returns {boolean} */
    isActive: function() {
      return this._active;
    },

    /** @returns {object|null} current config or null */
    getConfig: function() {
      return this._config || null;
    },

    /** @returns {number} hours until exam, or Infinity if not set */
    getHoursUntilExam: function() {
      if (!this._config || !this._config.examDate) return Infinity;
      return Math.max(0, (this._config.examDate - Date.now()) / (60 * 60 * 1000));
    },

    /* ----------------------------------------------------------------------
     * ENTRY MIGRATION — lazy-init crammingTrack on all existing entries
     * ---------------------------------------------------------------------- */

    /**
     * Migrate all existing memory entries to include crammingTrack.
     * Called once on enterCrammingMode. Idempotent.
     */
    _migrateAllEntries: function() {
      var mem = this._memory;
      if (!mem) return;
      var keys = Object.keys(mem);
      for (var i = 0; i < keys.length; i++) {
        _ensureCrammingTrack(mem[keys[i]]);
      }
    },

    /* ----------------------------------------------------------------------
     * CRAMMING TRACK ACCESS — always returns a valid track
     * ---------------------------------------------------------------------- */

    /**
     * Get (and lazily create) the cramming track for a question.
     * @param {string} qid
     * @returns {object|null} crammingTrack or null if entry doesn't exist
     */
    getTrack: function(qid) {
      var mem = this._memory;
      if (!mem) return null;
      var entry = mem[qid];
      if (!entry) {
        // Lazy-create for first access
        mem[qid] = { qid: qid, subjectId: '', knowledgePoint: '',
          level: 0, lastReviewed: 0, nextReview: 0,
          reviewCount: 0, errorCount: 0, consecutiveCorrect: 0,
          errorGenes: [], firstLearned: 0, history: [], adaptationFactor: 1.0 };
        entry = mem[qid];
      }
      _ensureCrammingTrack(entry);
      return entry.crammingTrack;
    },

    /**
     * Get the daily-mode fields for a question (read-only during cramming).
     * @param {string} qid
     * @returns {object} { level, nextReview, adaptationFactor }
     */
    getDailyTrack: function(qid) {
      var mem = this._memory;
      if (!mem) return null;
      var entry = mem[qid];
      if (!entry) return null;
      return {
        level: entry.level,
        nextReview: entry.nextReview,
        adaptationFactor: entry.adaptationFactor
      };
    },

    /* ----------------------------------------------------------------------
     * CRAMMING UPDATE — only modifies crammingTrack, NOT daily track
     * ---------------------------------------------------------------------- */

    /**
     * Update cramming track after answering a question.
     * DAILY TRACK (level, nextReview, adaptationFactor) IS NOT MODIFIED.
     *
     * @param {string} qid
     * @param {boolean} correct
     * @param {number} timeSpentMs — response time in ms
     * @param {string} errorGene — error classification
     * @param {object} questionData — question metadata (for script error tracking)
     * @returns {object} updated track state { cramLevel, cramEF, nextCram, needsRetraining }
     */
    updateCrammingTrack: function(qid, correct, timeSpentMs, errorGene, questionData) {
      if (!this._memory) return null;
      var entry = this._memory[qid];
      // Lazy-create entry if it doesn't exist yet (first encounter in cramming mode)
      if (!entry) {
        this._memory[qid] = {
          qid: qid,
          subjectId: (questionData && questionData.subjectId) || '',
          knowledgePoint: (questionData && (questionData.knowledgePoint || questionData.kp)) || '',
          level: 0, lastReviewed: 0, nextReview: 0,
          reviewCount: 0, errorCount: 0, consecutiveCorrect: 0,
          errorGenes: [], firstLearned: 0, history: [], adaptationFactor: 1.0
        };
        entry = this._memory[qid];
      }

      _ensureCrammingTrack(entry);
      var track = entry.crammingTrack;
      var now = Date.now();

      track.lastCrammed = now;

      if (correct) {
        track.cramLevel = Math.min(5, track.cramLevel + 1);
        track.cramEF += CRAMMING_EF.CORRECT_BONUS;
        track.cramConsecutiveCorrect++;

        // [SM-2] Slow responses indicate weak retrieval — penalize EF slightly
        if (timeSpentMs > 15000) {
          track.cramEF -= CRAMMING_EF.SLOW_PENALTY;
        }
      } else {
        // [DualTrack] Cramming allows drop to level 0 (daily only drops to 1)
        // Rationale: exam window is short, wrong answer means truly don't know it
        track.cramLevel = Math.max(0, track.cramLevel - 1);
        track.cramEF -= CRAMMING_EF.WRONG_PENALTY;
        track.cramConsecutiveCorrect = 0;
        track.cramErrorCount++;

        // Track script-level errors for vulnerability detection
        if (questionData) {
          var scriptId = questionData.illnessScriptId ||
            (questionData.illnessScript && questionData.illnessScript.scriptId) || null;
          if (scriptId) {
            track.scriptErrors[scriptId] = (track.scriptErrors[scriptId] || 0) + 1;
          }
        }
      }

      // Clamp EF to valid range
      track.cramEF = Math.max(CRAMMING_EF.MIN, Math.min(CRAMMING_EF.MAX, track.cramEF));

      // [SM-2] Calculate next cramming review time
      var baseInterval = CRAMMING_LEVEL_INTERVALS[track.cramLevel];
      var adaptedInterval = baseInterval * track.cramEF;

      // [DualTrack] Last 48hr before exam: force-compress intervals
      var hoursUntilExam = this.getHoursUntilExam();
      if (hoursUntilExam < 48 && adaptedInterval > 6 * 60 * 60 * 1000) {
        adaptedInterval = 6 * 60 * 60 * 1000;      // max 6 hours in final sprint
      }

      // [DualTrack] Last 24hr before exam: freeze new content, review only
      if (hoursUntilExam < 24 && track.cramLevel === 0) {
        track.nextCram = Infinity;                  // barrier — don't schedule new questions
      } else {
        track.nextCram = now + adaptedInterval;
      }

      // Record history (keep last 30 entries)
      track.cramHistory.push({
        timestamp: now,
        correct: correct,
        responseMs: timeSpentMs,
        errorGene: errorGene || '',
        cramLevelAfter: track.cramLevel,
        cramEF: track.cramEF
      });
      if (track.cramHistory.length > 30) track.cramHistory.shift();

      return {
        cramLevel: track.cramLevel,
        cramEF: track.cramEF,
        nextCram: track.nextCram,
        needsRetraining: !correct && track.cramErrorCount <= 2
      };
    },

    /* ----------------------------------------------------------------------
     * SCHEDULING HELPERS
     * ---------------------------------------------------------------------- */

    /**
     * Compute cramming priority score for a question.
     * Higher = more urgent to review in cramming mode.
     *
     * @param {string} qid
     * @param {object} questionData — with optional illnessScript, examWeight, etc.
     * @returns {number}
     */
    computeCramPriority: function(qid, questionData) {
      var entry = (this._memory && this._memory[qid]) || null;
      var now = Date.now();
      var score = 0;

      if (!entry || !_hasCrammingTrack(entry)) {
        // Unlearned in cramming: medium priority
        score += 50;
      } else {
        var track = entry.crammingTrack;

        // Overdue in cramming track
        if (track.nextCram > 0 && now >= track.nextCram) {
          var overdueMs = now - track.nextCram;
          score += 80 + Math.min(20, overdueMs / (60 * 60 * 1000));
        } else if (track.nextCram > 0 && now < track.nextCram) {
          var timeUntilDue = track.nextCram - now;
          score += Math.max(0, 30 - timeUntilDue / (60 * 60 * 1000));
        }

        // Lower cram level = more urgent
        score += (5 - track.cramLevel) * 8;

        // Cramming error weight
        score += Math.min(15, track.cramErrorCount * 3);
      }

      // Exam weight bonus — high-yield questions get priority
      // (examWeight defaults to 0.5, high-yield can be 0.7–1.0)
      var examWeight = (questionData && questionData.examWeight) || 0.5;
      score += examWeight * 30;

      // [DualTrack] Last 72hr: double high-yield weight
      if (this.getHoursUntilExam() < 72 && examWeight > 0.7) {
        score += examWeight * 15;
      }

      // Random jitter to prevent deterministic ordering
      score += Math.random() * 5;

      return score;
    },

    /**
     * Get questions due for cramming review right now.
     * @param {string[]} subjectIds
     * @returns {string[]} array of qids
     */
    getDueCramQuestions: function(subjectIds) {
      var mem = this._memory;
      if (!mem) return [];

      var now = Date.now();
      var due = [];
      var sids = subjectIds || (this._config && this._config.targetSubjects) || [];

      for (var qid in mem) {
        var entry = mem[qid];
        if (!_hasCrammingTrack(entry)) continue;

        // Check if entry belongs to target subjects
        if (sids.length > 0 && sids.indexOf(entry.subjectId) < 0) continue;

        var track = entry.crammingTrack;
        if (track.nextCram > 0 && track.nextCram !== Infinity && now >= track.nextCram) {
          due.push(qid);
        }
      }
      return due;
    },

    /**
     * Count due cramming questions for badge display.
     * @param {string[]} subjectIds
     * @returns {number}
     */
    getDueCramCount: function(subjectIds) {
      return this.getDueCramQuestions(subjectIds).length;
    },

    /* ----------------------------------------------------------------------
     * SCRIPT-LEVEL VULNERABILITY DETECTION
     * ---------------------------------------------------------------------- */

    /**
     * Check if a script needs vulnerability fix.
     * Triggers when ≥2 consecutive errors on the same script.
     *
     * @param {string} scriptId
     * @returns {boolean}
     */
    needsScriptFix: function(scriptId) {
      var mem = this._memory;
      if (!mem || !scriptId) return false;

      var recentErrors = 0;
      var qids = Object.keys(mem);

      for (var i = 0; i < qids.length && recentErrors < 3; i++) {
        var entry = mem[qids[i]];
        if (!_hasCrammingTrack(entry)) continue;
        var track = entry.crammingTrack;

        // Check if this entry belongs to the target script
        var entryScript = entry.illnessScriptId || '';
        if (entryScript !== scriptId) continue;

        // Check last cram history entry
        var hist = track.cramHistory;
        if (hist.length > 0 && !hist[hist.length - 1].correct) {
          recentErrors++;
        } else if (hist.length > 0) {
          break; // correct answer breaks the error streak
        }
      }

      return recentErrors >= 2;
    },

    /* ----------------------------------------------------------------------
     * STATISTICS
     * ---------------------------------------------------------------------- */

    /**
     * Get cramming mode statistics across all entries.
     * @returns {object}
     */
    getCrammingStats: function() {
      var mem = this._memory;
      if (!mem) {
        return { totalEntries: 0, avgCramLevel: 0, totalCramErrors: 0, scriptsTracked: 0 };
      }

      var qids = Object.keys(mem);
      var totalLevel = 0;
      var totalErrors = 0;
      var count = 0;
      var scripts = {};

      for (var i = 0; i < qids.length; i++) {
        var entry = mem[qids[i]];
        if (!_hasCrammingTrack(entry)) continue;
        count++;
        var t = entry.crammingTrack;
        totalLevel += t.cramLevel;
        totalErrors += t.cramErrorCount;

        var sid = entry.illnessScriptId || '';
        if (sid) scripts[sid] = true;
      }

      return {
        totalEntries: count,
        avgCramLevel: count > 0 ? (totalLevel / count).toFixed(1) : 0,
        totalCramErrors: totalErrors,
        scriptsTracked: Object.keys(scripts).length,
        active: this._active,
        hoursUntilExam: this.getHoursUntilExam()
      };
    }
  };

  /* ========================================================================
   * EXPORT
   * ======================================================================== */

  MediCard.DualTrack = DualTrack;
  window.MediCard = MediCard;

  console.log('[DualTrack] Loaded — independent cramming trajectory with compressed SM-2');
})();
