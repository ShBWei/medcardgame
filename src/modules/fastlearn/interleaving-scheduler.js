/**
 * MediCard Cross-System Interleaving Scheduler — 跨系统强制交错调度器
 *
 * [Interleaving] Cross-system interleaving improves diagnostic accuracy 46% vs 30% blocked
 *   (Hatala et al., 2003; de Bruin et al., 2025; Rohrer & Taylor, 2007)
 * [IllnessScript] Prioritize questions that activate complete disease scripts
 *   (Feltovich & Barrows, 1984; ten Cate, 2018)
 * [Metacognitive] Students subjectively prefer blocked practice — system MUST enforce
 *   interleaving rather than relying on user choice (Rohrer & Taylor, 2007)
 *
 * Depends on: dual-track-memory.js (MediCard.DualTrack)
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ========================================================================
   * INTERLEAVING CONSTANTS
   * ======================================================================== */

  /** Triple spacing gaps for cramming mode */
  var SPACING = {
    KP_MIN_GAP: 2,          // Same knowledge point: ≥2 questions apart
    SYSTEM_MIN_GAP: 3,      // Same clinical system: ≥3 questions apart
    SCRIPT_MIN_GAP: 2,      // Same disease script: ≥2 questions apart
    SYSTEM_BOOST: 8         // Score boost for system rotation
  };

  /** Maximum consecutive questions from same system before forced rotation */
  var MAX_CONSECUTIVE_SYSTEM = 2;
  /** Maximum consecutive questions from same script before forced rotation */
  var MAX_CONSECUTIVE_SCRIPT = 2;

  /* ========================================================================
   * ILLNESS SCRIPT PRIORITY — Module 2 integration
   * ======================================================================== */

  /**
   * Calculate script activation priority for a question.
   * Prioritizes questions that fill gaps in incomplete disease scripts.
   *
   * [IllnessScript] Script = Enabling Conditions + Fault + Consequences + Management
   * Missing components get priority boost for schema completion
   *
   * @param {object} question — raw question data
   * @param {object} scriptMastery — user's script mastery state (from DualTrack)
   * @returns {number} priority score addend
   */
  function _calculateScriptPriority(question, scriptMastery) {
    var score = 0;
    var script = question.illnessScript;
    var scriptId = script ? script.scriptId : (question.illnessScriptId || '');

    if (!scriptId) return score;

    // 1. Exam frequency weight (high-yield → higher priority)
    var examFreq = (script && script.examFrequency) || (question.examWeight) || 0.5;
    score += examFreq * 30;

    // 2. Script component gap detection
    var mastery = scriptMastery ? scriptMastery[scriptId] : null;
    if (mastery && mastery.componentsMastered) {
      var components = mastery.componentsMastered;
      var missing = 0;
      var comps = ['enabling', 'fault', 'consequence', 'management'];
      for (var c = 0; c < comps.length; c++) {
        if (!components[comps[c]]) missing++;
      }

      // [IllnessScript] Each missing component adds +15 priority
      score += missing * 15;
    } else {
      // [IllnessScript] Completely new script → high priority for introduction
      score += 45;
    }

    // 3. Related script differentiation bonus
    // Scripts mastered (>2 prior activations) get a boost for discrimination training
    if (mastery && mastery.activationCount > 2) {
      score += 10;
    }

    return score;
  }

  /* ========================================================================
   * SYSTEM ROTATION TRACKING
   * ======================================================================== */

  /**
   * Track positions of clinical systems and scripts in the queue.
   * Used to enforce minimum spacing constraints.
   */
  function _createPositionTracker() {
    return {
      kpPos: {},        // knowledgePoint → last position index
      sysPos: {},       // clinicalSystem → last position index
      scrPos: {},       // scriptId → last position index
      sysCount: 0,      // consecutive count of current system
      scrCount: 0,      // consecutive count of current script
      lastSys: null,    // last system seen
      lastScr: null     // last script seen
    };
  }

  /**
   * Check if a candidate passes all spacing constraints.
   *
   * @param {object} cand — { kp, system, scriptId }
   * @param {object} tracker — position tracker
   * @param {number} queueLen — current queue length
   * @returns {boolean}
   */
  function _passesSpacing(cand, tracker, queueLen) {
    var kp = cand.kp;
    var sys = cand.system;
    var scr = cand.scriptId;

    // [Interleaving] KP gap check
    if (kp && tracker.kpPos[kp] !== undefined) {
      if (queueLen - tracker.kpPos[kp] < SPACING.KP_MIN_GAP) return false;
    }

    // [Interleaving] System gap check
    if (sys && tracker.sysPos[sys] !== undefined) {
      if (queueLen - tracker.sysPos[sys] < SPACING.SYSTEM_MIN_GAP) return false;
    }

    // [Interleaving] Script gap check
    if (scr && tracker.scrPos[scr] !== undefined) {
      if (queueLen - tracker.scrPos[scr] < SPACING.SCRIPT_MIN_GAP) return false;
    }

    // [Interleaving] Max consecutive system cap
    if (sys && tracker.lastSys === sys && tracker.sysCount >= MAX_CONSECUTIVE_SYSTEM) {
      return false;
    }

    // [Interleaving] Max consecutive script cap
    if (scr && tracker.lastScr === scr && tracker.scrCount >= MAX_CONSECUTIVE_SCRIPT) {
      return false;
    }

    return true;
  }

  /**
   * Update position tracker after adding a candidate to the queue.
   */
  function _updateTracker(cand, tracker, queueLen) {
    if (cand.kp) tracker.kpPos[cand.kp] = queueLen;
    if (cand.system) tracker.sysPos[cand.system] = queueLen;
    if (cand.scriptId) tracker.scrPos[cand.scriptId] = queueLen;

    // Update consecutive counters
    if (cand.system === tracker.lastSys) {
      tracker.sysCount++;
    } else {
      tracker.lastSys = cand.system;
      tracker.sysCount = 1;
    }

    if (cand.scriptId === tracker.lastScr) {
      tracker.scrCount++;
    } else {
      tracker.lastScr = cand.scriptId;
      tracker.scrCount = 1;
    }
  }

  /* ========================================================================
   * SMART DEFERRED REINSERTION
   * ======================================================================== */

  /**
   * Reinsert deferred items back into the queue.
   * Prioritizes system rotation: inserts where system differs from neighbors.
   *
   * @param {Array} queue — current queue
   * @param {Array} deferred — deferred candidates
   * @param {number} limit — max queue size
   * @returns {Array} final queue
   */
  function _reinsertDeferred(queue, deferred, limit) {
    // Sort deferred by score so highest-priority items go first
    deferred.sort(function(a, b) { return b.score - a.score; });

    for (var d = 0; d < deferred.length && queue.length < limit; d++) {
      var item = deferred[d];
      var bestPos = -1;
      var bestSystemGap = -1;

      // [Interleaving] Find best insertion position — maximize distance from same system
      for (var pos = 0; pos <= queue.length; pos++) {
        var prevSys = pos > 0 ? (queue[pos - 1].system || '') : '';
        var nextSys = pos < queue.length ? (queue[pos].system || '') : '';
        var itemSys = item.system || '';

        var gap = 0;
        if (itemSys && itemSys === prevSys) gap -= 2;
        if (itemSys && itemSys === nextSys) gap -= 2;
        if (itemSys && itemSys !== prevSys && itemSys !== nextSys) gap += 3;

        if (gap > bestSystemGap) {
          bestSystemGap = gap;
          bestPos = pos;
        }
      }

      if (bestPos >= 0) {
        queue.splice(bestPos, 0, item);
      } else {
        queue.push(item);
      }
    }

    return queue.slice(0, limit);
  }

  /* ========================================================================
   * MAIN INTERLEAVING SCHEDULER
   * ======================================================================== */

  var InterleavingScheduler = {
    /** Track user's script mastery across sessions */
    _scriptMastery: {},

    /* ----------------------------------------------------------------------
     * CORE: Apply triple-spacing interleaving to scored candidates
     * ---------------------------------------------------------------------- */

    /**
     * Apply interleaving to a scored candidate list.
     * This is the main entry point called by fastlearn-cramming.js.
     *
     * @param {Array} scored — [{item, score, kp, system, scriptId}, ...] already sorted by score desc
     * @param {number} limit — max queue length
     * @returns {Array} interleaved queue items
     */
    applyInterleaving: function(scored, limit) {
      if (!scored || !scored.length) return [];

      var self = this;
      var tracker = _createPositionTracker();
      var queue = [];
      var deferred = [];
      var scriptMastery = this._scriptMastery;

      // [IllnessScript] Boost scores with script activation priority
      for (var i = 0; i < scored.length; i++) {
        var q = scored[i];
        if (q.item && q.item.question) {
          q.score += _calculateScriptPriority(q.item.question, scriptMastery);
        }
      }

      // Re-sort after script priority boost
      scored.sort(function(a, b) { return b.score - a.score; });

      // [Interleaving] Triple spacing filter — main pass
      for (var j = 0; j < scored.length; j++) {
        var cand = scored[j];

        if (queue.length >= limit) break;

        if (_passesSpacing(cand, tracker, queue.length)) {
          queue.push(cand);
          _updateTracker(cand, tracker, queue.length - 1);
        } else {
          deferred.push(cand);
        }
      }

      // [Interleaving] Smart reinsertion of deferred items
      return _reinsertDeferred(queue, deferred, limit);
    },

    /* ----------------------------------------------------------------------
     * SCRIPT MASTERY TRACKING
     * ---------------------------------------------------------------------- */

    /**
     * Record a script activation (question answered) for mastery tracking.
     *
     * @param {string} scriptId
     * @param {string} component — 'enabling'|'fault'|'consequence'|'management'
     * @param {boolean} correct
     */
    recordScriptActivation: function(scriptId, component, correct) {
      if (!scriptId) return;
      if (!this._scriptMastery[scriptId]) {
        this._scriptMastery[scriptId] = {
          componentsMastered: { enabling: false, fault: false, consequence: false, management: false },
          lastActivated: 0,
          activationCount: 0
        };
      }

      var sm = this._scriptMastery[scriptId];
      sm.lastActivated = Date.now();
      sm.activationCount++;

      if (correct && component && sm.componentsMastered.hasOwnProperty(component)) {
        sm.componentsMastered[component] = true;
      }
    },

    /**
     * Get script mastery state for all tracked scripts.
     * @returns {object}
     */
    getScriptMastery: function() {
      return this._scriptMastery;
    },

    /**
     * Get script completeness percentage (0-100).
     * @param {string} scriptId
     * @returns {number}
     */
    getScriptCompleteness: function(scriptId) {
      var sm = this._scriptMastery[scriptId];
      if (!sm) return 0;

      var comps = sm.componentsMastered;
      var mastered = 0;
      if (comps.enabling) mastered++;
      if (comps.fault) mastered++;
      if (comps.consequence) mastered++;
      if (comps.management) mastered++;

      return Math.round(mastered / 4 * 100);
    },

    /**
     * Find scripts with missing components.
     * @returns {Array} [{scriptId, completeness, missingComponents}, ...]
     */
    getIncompleteScripts: function() {
      var result = [];
      for (var scriptId in this._scriptMastery) {
        var completeness = this.getScriptCompleteness(scriptId);
        if (completeness < 100) {
          var sm = this._scriptMastery[scriptId];
          var missing = [];
          if (!sm.componentsMastered.enabling) missing.push('enabling');
          if (!sm.componentsMastered.fault) missing.push('fault');
          if (!sm.componentsMastered.consequence) missing.push('consequence');
          if (!sm.componentsMastered.management) missing.push('management');

          result.push({
            scriptId: scriptId,
            completeness: completeness,
            missingComponents: missing,
            activationCount: sm.activationCount
          });
        }
      }
      result.sort(function(a, b) { return a.completeness - b.completeness; });
      return result;
    },

    /* ----------------------------------------------------------------------
     * SCRIPT-LEVEL DIFFERENTIAL DIAGNOSIS PAIRING
     * ---------------------------------------------------------------------- */

    /**
     * Find related scripts for differential diagnosis training.
     * Pairs scripts within the same clinical system for discrimination practice.
     *
     * @param {string} scriptId — source script
     * @param {Array} allScored — all scored candidates
     * @returns {Array} related candidates from different scripts in same system
     */
    findDiscriminationPairs: function(scriptId, allScored) {
      if (!scriptId || !allScored) return [];

      var sourceSystem = '';
      // Find the system of the source script
      for (var i = 0; i < allScored.length; i++) {
        var s = allScored[i];
        if (s.scriptId === scriptId) {
          sourceSystem = s.system;
          break;
        }
      }

      if (!sourceSystem) return [];

      // Find other scripts in the same system
      var pairs = [];
      var seen = {};
      for (var j = 0; j < allScored.length; j++) {
        var cand = allScored[j];
        if (cand.system === sourceSystem && cand.scriptId !== scriptId && !seen[cand.scriptId]) {
          seen[cand.scriptId] = true;
          pairs.push(cand);
        }
      }

      // Shuffle for variety and limit
      for (var k = pairs.length - 1; k > 0; k--) {
        var r = Math.floor(Math.random() * (k + 1));
        var tmp = pairs[k]; pairs[k] = pairs[r]; pairs[r] = tmp;
      }

      return pairs.slice(0, 5);
    },

    /* ----------------------------------------------------------------------
     * INTERLEAVING QUALITY METRICS
     * ---------------------------------------------------------------------- */

    /**
     * Calculate interleaving quality score for a queue.
     * Higher score = better system/KP/script distribution.
     *
     * @param {Array} queue
     * @returns {object} { systemDiversity, avgSystemGap, kpSpacingScore, overall }
     */
    analyzeInterleavingQuality: function(queue) {
      if (!queue || queue.length < 2) {
        return { systemDiversity: 1.0, avgSystemGap: 0, kpSpacingScore: 1.0, overall: 1.0 };
      }

      // System diversity: ratio of unique systems to queue length
      var systems = {};
      var kps = {};
      for (var i = 0; i < queue.length; i++) {
        var q = queue[i];
        if (q.system) systems[q.system] = (systems[q.system] || 0) + 1;
        if (q.kp) kps[q.kp] = (kps[q.kp] || 0) + 1;
      }

      var uniqueSystems = Object.keys(systems).length;
      var systemDiversity = Math.min(1.0, uniqueSystems / Math.max(1, queue.length / 3));

      // Average system gap
      var lastPosBySystem = {};
      var totalGap = 0;
      var gapCount = 0;
      for (var j = 0; j < queue.length; j++) {
        var sys = queue[j].system || '';
        if (sys && lastPosBySystem[sys] !== undefined) {
          totalGap += j - lastPosBySystem[sys];
          gapCount++;
        }
        if (sys) lastPosBySystem[sys] = j;
      }
      var avgSystemGap = gapCount > 0 ? (totalGap / gapCount) : 0;

      // KP spacing score (1.0 = all KPs spaced ≥2 apart)
      var kpViolations = 0;
      var lastKp = {};
      for (var k = 0; k < queue.length; k++) {
        var kp = queue[k].kp || '';
        if (kp && lastKp[kp] !== undefined && k - lastKp[kp] < 2) {
          kpViolations++;
        }
        if (kp) lastKp[kp] = k;
      }
      var kpSpacingScore = Math.max(0, 1.0 - kpViolations / Math.max(1, queue.length));

      var overall = (systemDiversity * 0.4 + Math.min(1.0, avgSystemGap / SPACING.SYSTEM_MIN_GAP) * 0.3 + kpSpacingScore * 0.3);

      return {
        systemDiversity: systemDiversity.toFixed(2),
        avgSystemGap: avgSystemGap.toFixed(1),
        kpSpacingScore: kpSpacingScore.toFixed(2),
        overall: overall.toFixed(2)
      };
    }
  };

  /* ========================================================================
   * EXPORT
   * ======================================================================== */

  MediCard.InterleavingScheduler = InterleavingScheduler;
  window.MediCard = MediCard;

  console.log('[Interleaving] Loaded — triple-spacing cross-system scheduler (Hatala et al., 2003)');
})();
