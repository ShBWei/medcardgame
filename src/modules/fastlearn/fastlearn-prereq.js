/**
 * MediCard FastLearn Prerequisite Framework — 知识前置依赖图与拓扑补漏
 * Dormant framework — activates when question metadata has `prerequisites` field.
 * Graceful degradation: returns empty/no-op when no prerequisites exist.
 *
 * [Constructivism] New knowledge builds on prior knowledge (Piaget, Vygotsky)
 * [MedicalEducation] Clinical reasoning depends on foundational science mastery
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ========================================================================
   * PREREQUISITE MASTERY CHECK
   * ======================================================================== */

  var Prereq = {
    /**
     * Check if a prerequisite knowledge point is mastered.
     * Criteria: average memory level ≥ 2 AND error rate ≤ 40%
     *
     * @param {string} kpId — knowledge point identifier
     * @param {string} subjectId — subject scope
     * @returns {boolean} true if prerequisite is solid
     */
    checkPrerequisiteMastery: function(kpId, subjectId) {
      var FL = MediCard.FastLearnCore;
      if (!FL || !FL._memory) return true; // No data → assume mastered (don't block)

      var totalLevel = 0;
      var errorCount = 0;
      var reviewCount = 0;
      var found = 0;

      for (var qid in FL._memory) {
        var entry = FL._memory[qid];
        if (entry.knowledgePoint !== kpId) continue;
        if (subjectId && entry.subjectId !== subjectId) continue;

        totalLevel += entry.level;
        errorCount += entry.errorCount;
        reviewCount += entry.reviewCount;
        found++;
      }

      if (found === 0) return true; // No data → don't block progression
      var avgLevel = totalLevel / found;
      var errorRate = reviewCount > 0 ? errorCount / reviewCount : 0;

      return avgLevel >= 2 && errorRate <= 0.4;
    },

    /**
     * Scan a question's prerequisites and return the ones that are weak.
     * Only activates when questionData has prerequisite field.
     *
     * @param {object} questionData — with optional prerequisites array
     * @param {string} subjectId
     * @returns {Array} [{ kpId, avgLevel, errorRate }, ...] — empty if none weak
     */
    findWeakPrerequisites: function(questionData, subjectId) {
      var prereqs = questionData && questionData.prerequisites;
      if (!prereqs || !prereqs.length) return []; // Graceful: no prereq field

      var weak = [];
      for (var i = 0; i < prereqs.length; i++) {
        var kpId = prereqs[i];
        if (!this.checkPrerequisiteMastery(kpId, subjectId)) {
          // Gather stats for reporting
          var stats = this._getPrereqStats(kpId, subjectId);
          weak.push({ kpId: kpId, avgLevel: stats.avgLevel, errorRate: stats.errorRate });
        }
      }
      return weak.slice(0, 2); // Max 2 weak prerequisites to avoid infinite recursion
    },

    /**
     * Get questions for a specific prerequisite knowledge point.
     * Selects 2-3 questions from the question bank that target this KP.
     *
     * @param {string} prereqKp — knowledge point ID
     * @param {string} subjectId — subject to search
     * @param {number} count — max questions to return (default 3)
     * @returns {Array} — [{ question, qid, subjectId }, ...]
     */
    getPrerequisiteFixQuestions: function(prereqKp, subjectId, count) {
      var loader = MediCard.QuestionLoader;
      if (!loader) return [];

      count = count || 3;
      var qs = loader.getSubject(subjectId);
      if (!qs || !qs.length) return [];

      var matches = [];
      for (var q = 0; q < qs.length; q++) {
        var qkp = qs[q].knowledgePoint || qs[q].kp || '';
        if (qkp === prereqKp) {
          var qid = qs[q].id || (subjectId + '_' + q);
          matches.push({
            question: qs[q],
            qid: qid,
            subjectId: subjectId,
            index: q,
            _prereqFix: true
          });
        }
      }

      // Shuffle and limit
      for (var i = matches.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = matches[i]; matches[i] = matches[j]; matches[j] = tmp;
      }
      return matches.slice(0, count);
    },

    /**
     * Check all prerequisites for a question and return actionable fix items.
     * Main entry point for integration into fastlearn-core.js recordSessionAnswer().
     *
     * @param {object} questionData — the question being answered
     * @param {string} subjectId
     * @returns {Array|null} fix questions to insert, or null if no action needed
     */
    checkAndGetFixes: function(questionData, subjectId) {
      var weak = this.findWeakPrerequisites(questionData, subjectId);
      if (!weak.length) return null;

      var fixQuestions = [];
      for (var i = 0; i < weak.length; i++) {
        var fixes = this.getPrerequisiteFixQuestions(weak[i].kpId, subjectId, 2);
        for (var f = 0; f < fixes.length; f++) {
          fixQuestions.push(fixes[f]);
        }
      }
      return fixQuestions.length > 0 ? fixQuestions : null;
    },

    /* ----------------------------------------------------------------------
     * INTERNAL
     * ---------------------------------------------------------------------- */

    _getPrereqStats: function(kpId, subjectId) {
      var FL = MediCard.FastLearnCore;
      if (!FL || !FL._memory) return { avgLevel: 0, errorRate: 0 };

      var totalLevel = 0, errorCount = 0, reviewCount = 0, found = 0;
      for (var qid in FL._memory) {
        var entry = FL._memory[qid];
        if (entry.knowledgePoint !== kpId) continue;
        if (subjectId && entry.subjectId !== subjectId) continue;
        totalLevel += entry.level;
        errorCount += entry.errorCount;
        reviewCount += entry.reviewCount;
        found++;
      }
      return {
        avgLevel: found > 0 ? (totalLevel / found).toFixed(1) : 0,
        errorRate: reviewCount > 0 ? Math.round(errorCount / reviewCount * 100) : 0
      };
    }
  };

  /* ========================================================================
   * INTEGRATION HOOK — patches fastlearn-core.js recordSessionAnswer
   * Called when a question is answered wrong twice consecutively
   * ======================================================================== */

  /**
   * Called by fastlearn-core.js when a question is answered wrong ≥2 times.
   * Checks prerequisites and returns fix questions if any are weak.
   *
   * @param {string} qid
   * @param {object} questionData
   * @param {string} subjectId
   * @param {string} currentKp
   * @returns {object|null} { fixQuestions, weakPrereqs, currentKp }
   */
  Prereq.handleConsecutiveErrors = function(qid, questionData, subjectId, currentKp) {
    // Only activate if question has prerequisites defined
    if (!questionData || !questionData.prerequisites || !questionData.prerequisites.length) {
      return null;
    }

    var fixQuestions = this.checkAndGetFixes(questionData, subjectId);
    if (!fixQuestions || !fixQuestions.length) return null;

    var weak = this.findWeakPrerequisites(questionData, subjectId);

    return {
      fixQuestions: fixQuestions,
      weakPrereqs: weak,
      currentKp: currentKp,
      message: currentKp + ' 掌握不牢，先巩固前置基础：' + weak.map(function(w) { return w.kpId; }).join('、')
    };
  };

  /* ========================================================================
   * EXPORT
   * ======================================================================== */

  MediCard.FastLearnPrereq = Prereq;
  window.MediCard = MediCard;

  console.log('[FastLearnPrereq] Loaded — prerequisite dependency framework (dormant until metadata has prerequisites)');
})();
