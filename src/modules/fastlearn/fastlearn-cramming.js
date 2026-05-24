/**
 * MediCard FastLearn Cramming — 考前冲击模式核心
 * Compressed SM-2 algorithm, independent session management, dual-track integration.
 *
 * [SM-2] Compressed Ease Factor for exam cramming (Wozniak, 1987; SuperMemo)
 * [DualTrack] All updates go to crammingTrack only — daily level/nextReview preserved
 * [Retrieval] Test-enhanced learning with active recall (Karpicke & Roediger, 2008)
 * [ErrorDriven] Wrong answers are highest-priority learning opportunities
 *
 * Depends on: dual-track-memory.js (MediCard.DualTrack), fastlearn-core.js (MediCard.FastLearnCore)
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ========================================================================
   * CRAMMING SESSION STATE
   * ======================================================================== */

  var Cramming = {
    _sessionQueue: [],
    _sessionIndex: 0,
    _sessionRetrainMap: {},
    _sessionSeenKP: {},
    _sessionPendingInsertions: [],
    _sessionStats: null,

    /* ========================================================================
     * SESSION LIFECYCLE
     * ======================================================================== */

    /**
     * Initialize a new cramming session.
     * Builds the queue using dual-track priority + optional interleaving.
     *
     * @param {string[]} subjectIds — target subject IDs
     * @param {number} limit — max questions (default from config or 50)
     * @param {string[]} wrongQids — wrong question IDs for priority boost
     * @returns {Array} session queue
     */
    initSession: function(subjectIds, limit, wrongQids) {
      var DT = MediCard.DualTrack;
      if (!DT || !DT.isActive()) {
        console.warn('[Cramming] DualTrack not active — session may not use cramming logic');
      }

      var config = DT ? DT.getConfig() : null;
      limit = limit || (config && config.dailyQuota) || 50;
      subjectIds = subjectIds || (config && config.targetSubjects) || [];
      wrongQids = wrongQids || [];

      this._sessionQueue = this._buildCrammingQueue(subjectIds, limit, wrongQids);
      this._sessionIndex = 0;
      this._sessionRetrainMap = {};
      this._sessionSeenKP = {};
      this._sessionPendingInsertions = [];
      this._sessionStats = {
        subjectIds: subjectIds,
        startTime: Date.now(),
        totalAnswered: 0,
        totalCorrect: 0,
        questionTimes: [],
        retrainings: 0,
        scriptFixes: 0,
        stressEvents: 0,
        levelsGained: 0,
        hyAnswered: 0,
        hyCorrect: 0
      };

      console.log('[Cramming] Session initialized —', this._sessionQueue.length, 'questions');
      return this._sessionQueue;
    },

    /**
     * Build the cramming session queue with dual-track priority scoring.
     *
     * @param {string[]} subjectIds
     * @param {number} limit
     * @param {string[]} wrongQids
     * @returns {Array}
     */
    _buildCrammingQueue: function(subjectIds, limit, wrongQids) {
      var DT = MediCard.DualTrack;
      var loader = MediCard.QuestionLoader;
      if (!loader) return [];

      // Collect all candidate questions
      var allQuestions = [];
      for (var s = 0; s < subjectIds.length; s++) {
        var qs = loader.getSubject(subjectIds[s]);
        if (!qs || !qs.length) continue;
        for (var q = 0; q < qs.length; q++) {
          var qd = qs[q];
          var qid = qd.id || (subjectIds[s] + '_' + q);
          allQuestions.push({
            question: qd,
            qid: qid,
            subjectId: subjectIds[s],
            index: q,
            kp: qd.knowledgePoint || qd.kp || '',
            scriptId: (qd.illnessScript && qd.illnessScript.scriptId) || qd.illnessScriptId || '',
            system: (qd.illnessScript && qd.illnessScript.system) || qd.clinicalSystem || '',
            examWeight: qd.examWeight || (qd.examMeta && qd.examMeta.examWeight) || 0.5
          });
        }
      }

      if (!allQuestions.length) return [];

      var now = Date.now();
      limit = Math.min(limit, allQuestions.length);

      // Score each candidate using dual-track priority
      var scored = [];
      for (var i = 0; i < allQuestions.length; i++) {
        var item = allQuestions[i];
        var score = DT ? DT.computeCramPriority(item.qid, item.question) : 50;
        scored.push({ item: item, score: score, kp: item.kp, system: item.system, scriptId: item.scriptId });
      }

      // Sort by score descending
      scored.sort(function(a, b) { return b.score - a.score; });

      // Apply interleaving if available, otherwise basic KP spacing
      var interleaver = MediCard.InterleavingScheduler;
      if (interleaver && interleaver.applyInterleaving) {
        return interleaver.applyInterleaving(scored, limit);
      }

      // Fallback: basic KP spacing (same as daily but tighter for cramming)
      return this._applyBasicSpacing(scored, limit);
    },

    /**
     * Basic KP spacing fallback when interleaving module is not loaded.
     * Tighter than daily mode: same KP ≥2 apart (daily uses ≥3).
     *
     * @param {Array} scored — [{item, score, kp, system, scriptId}, ...]
     * @param {number} limit
     * @returns {Array}
     */
    _applyBasicSpacing: function(scored, limit) {
      var queue = [];
      var kpLastPos = {};
      var deferred = [];

      for (var i = 0; i < scored.length && queue.length < limit; i++) {
        var cand = scored[i];
        var kp = cand.kp;
        var lastPos = kpLastPos[kp];

        // [Interleaving] Cramming: KP gap ≥2 (daily uses ≥3)
        if (lastPos !== undefined && queue.length - lastPos < 2) {
          deferred.push(cand);
        } else {
          queue.push(cand);
          if (kp) kpLastPos[kp] = queue.length - 1;
        }
      }

      // Fill remaining from deferred
      for (var d = 0; d < deferred.length && queue.length < limit; d++) {
        queue.push(deferred[d]);
      }

      return queue;
    },

    /* ========================================================================
     * SESSION NAVIGATION
     * ======================================================================== */

    /** @returns {object|null} current question item or null if session done */
    getNextQuestion: function() {
      if (this._sessionIndex >= this._sessionQueue.length) return null;
      return this._sessionQueue[this._sessionIndex];
    },

    /** Advance to next question, handling retraining insertions */
    advanceQuestion: function() {
      this._sessionIndex++;

      // [Retraining] Insert pending items at current position
      if (this._sessionPendingInsertions.length > 0 &&
          this._sessionIndex < this._sessionQueue.length) {
        var insert = this._sessionPendingInsertions.shift();
        this._sessionQueue.splice(this._sessionIndex, 0, insert);
      }
    },

    /* ========================================================================
     * ANSWER RECORDING — dual-track update + retraining
     * ======================================================================== */

    /**
     * Record a cramming session answer.
     * Updates only the cramming track, not the daily track.
     *
     * @param {string} qid
     * @param {boolean} correct
     * @param {number} responseMs
     * @param {object} questionData
     * @param {string} errorGene
     * @returns {object} result { needsRetraining, needsScriptFix, errorGene, cramLevel, nextCram }
     */
    recordSessionAnswer: function(qid, correct, responseMs, questionData, errorGene) {
      var DT = MediCard.DualTrack;
      var FL = MediCard.FastLearnCore;
      var item = this._sessionQueue[this._sessionIndex];
      var kp = questionData ? (questionData.knowledgePoint || questionData.kp || '') : '';
      var result = {};

      // --- Error gene classification ---
      if (!correct) {
        errorGene = errorGene || null;

        // Use MED error genes if available
        var MedErrors = MediCard.MedErrorGenes;
        if (MedErrors && MedErrors.classify && questionData) {
          var medResult = MedErrors.classify(questionData, '',
            (questionData.correctAnswers || questionData.ans || []).join(','),
            item);
          if (medResult && medResult.genes && medResult.genes.length > 0) {
            errorGene = medResult.genes[0];
          }
        }

        // Fallback: use FastLearnCore's analyzeError
        if (!errorGene && FL && FL.analyzeError && questionData) {
          var correctAnswer = (questionData.correctAnswers || questionData.ans || []).join(',');
          var analysis = FL.analyzeError(qid, '', correctAnswer, questionData);
          errorGene = analysis.genes[0] || 'other';
        }

        // Also update daily memory for long-term tracking (level stays read-only in dual-track mode)
        if (FL && FL.updateMemory) {
          FL.updateMemory(qid, false, responseMs, errorGene, kp, item ? item.subjectId : '');
        }

        // --- Cramming retraining ---
        var retrainCount = this._sessionRetrainMap[qid] || 0;
        if (retrainCount < 2) {
          this._sessionRetrainMap[qid] = retrainCount + 1;
          // [Cramming] Retrain insert at +2 (tighter than daily +3)
          var insertPos = Math.min(this._sessionIndex + 2, this._sessionQueue.length);
          this._sessionQueue.splice(insertPos, 0, item);
          this._sessionStats.retrainings++;
          result.needsRetraining = true;
        } else {
          result.needsRetraining = false;
        }

        // --- Script vulnerability check ---
        if (DT) {
          var scriptId = questionData ?
            (questionData.illnessScriptId || (questionData.illnessScript && questionData.illnessScript.scriptId)) : '';
          if (scriptId && DT.needsScriptFix(scriptId)) {
            this._sessionStats.scriptFixes++;
            result.needsScriptFix = true;
            result.scriptId = scriptId;
          }
        }

      } else {
        // Correct answer — still update daily memory for long-term tracking
        if (FL && FL.updateMemory) {
          FL.updateMemory(qid, true, responseMs, null, kp, item ? item.subjectId : '');
        }
        result.needsRetraining = false;
      }

      // --- Dual-track update (cramming track only) ---
      if (DT) {
        var trackResult = DT.updateCrammingTrack(qid, correct, responseMs, errorGene, questionData);
        if (trackResult) {
          result.cramLevel = trackResult.cramLevel;
          result.nextCram = trackResult.nextCram;
        }
      }

      // --- Session stats ---
      this._sessionStats.totalAnswered++;
      if (correct) this._sessionStats.totalCorrect++;
      this._sessionStats.questionTimes.push({ qid: qid, ms: responseMs, correct: correct });

      // Track high-yield stats
      var examWeight = (questionData && questionData.examWeight) || 0.5;
      if (examWeight >= 0.7) {
        this._sessionStats.hyAnswered++;
        if (correct) this._sessionStats.hyCorrect++;
      }

      // Track KP spacing
      if (kp) this._sessionSeenKP[kp] = this._sessionIndex;

      result.errorGene = errorGene;
      return result;
    },

    /* ========================================================================
     * SESSION REPORT — cramming-specific
     * ======================================================================== */

    /**
     * Generate a cramming-mode session report.
     * @returns {object}
     */
    generateSessionReport: function() {
      var stats = this._sessionStats;
      if (!stats) return null;

      var times = stats.questionTimes;
      var totalMs = 0, fastest = Infinity, slowest = 0;
      for (var t = 0; t < times.length; t++) {
        totalMs += times[t].ms;
        if (times[t].ms < fastest) fastest = times[t].ms;
        if (times[t].ms > slowest) slowest = times[t].ms;
      }

      var DT = MediCard.DualTrack;
      var dtStats = DT ? DT.getCrammingStats() : null;

      var accuracy = stats.totalAnswered > 0 ?
        Math.round(stats.totalCorrect / stats.totalAnswered * 100) : 0;
      var hyAccuracy = stats.hyAnswered > 0 ?
        Math.round(stats.hyCorrect / stats.hyAnswered * 100) : 0;

      // [DualTrack] Cramming grade (stricter than daily)
      var grade, gradeLabel;
      if (accuracy >= 85) { grade = 'A'; gradeLabel = '冲击高分'; }
      else if (accuracy >= 75) { grade = 'B'; gradeLabel = '稳过无忧'; }
      else if (accuracy >= 60) { grade = 'C'; gradeLabel = '需要加把劲'; }
      else if (accuracy >= 50) { grade = 'D'; gradeLabel = '重点补漏'; }
      else { grade = 'F'; gradeLabel = '建议调整计划'; }

      return {
        totalAnswered: stats.totalAnswered,
        totalCorrect: stats.totalCorrect,
        accuracy: accuracy,
        totalTimeMs: Date.now() - stats.startTime,
        avgTimeSec: times.length > 0 ? (totalMs / times.length / 1000).toFixed(1) : '0',
        fastestSec: fastest < Infinity ? (fastest / 1000).toFixed(1) : '0',
        slowestSec: slowest > 0 ? (slowest / 1000).toFixed(1) : '0',
        retrainings: stats.retrainings,
        scriptFixes: stats.scriptFixes,
        stressEvents: stats.stressEvents,
        hyAnswered: stats.hyAnswered,
        hyCorrect: stats.hyCorrect,
        hyAccuracy: hyAccuracy,
        cramLevelAvg: dtStats ? dtStats.avgCramLevel : 0,
        grade: grade,
        gradeLabel: gradeLabel,
        hoursUntilExam: DT ? DT.getHoursUntilExam() : Infinity
      };
    },

    /* ========================================================================
     * SESSION CONTROL
     * ======================================================================== */

    /** @returns {boolean} */
    hasMoreQuestions: function() {
      return this._sessionIndex < this._sessionQueue.length;
    },

    /** @returns {number} questions remaining in queue */
    remainingCount: function() {
      return Math.max(0, this._sessionQueue.length - this._sessionIndex);
    },

    /** @returns {number} */
    currentIndex: function() {
      return this._sessionIndex;
    },

    /** @returns {number} */
    totalCount: function() {
      return this._sessionQueue.length;
    },

    /** @returns {object|null} */
    getStats: function() {
      return this._sessionStats;
    }
  };

  /* ========================================================================
   * EXPORT
   * ======================================================================== */

  MediCard.FastLearnCramming = Cramming;
  window.MediCard = MediCard;

  console.log('[Cramming] Loaded — compressed SM-2 with dual-track isolation');
})();
