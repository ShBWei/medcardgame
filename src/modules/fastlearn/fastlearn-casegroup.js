/**
 * MediCard FastLearn Case Group Framework — 病例组处理 (A3/A4型题)
 * Dormant framework — activates when question metadata has `questionGroup` field.
 * Graceful degradation: returns false/null when no case groups exist.
 *
 * [MedicalExam] A3/A4题型: 共享题干 + 连续子题，考查临床推理连续性
 * [Interleaving] 病例组视为原子单元，组内子题连续出现，不被KP间距拆散
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ========================================================================
   * CASE GROUP DETECTION
   * ======================================================================== */

  var CaseGroup = {
    /**
     * Check if a question belongs to a case group (A3/A4 type).
     * Returns the group metadata if it does, false otherwise.
     *
     * @param {object} questionData
     * @returns {object|boolean} group info { groupId, stem, groupSize } or false
     */
    isCaseGroup: function(questionData) {
      if (!questionData || !questionData.questionGroup) return false;
      var g = questionData.questionGroup;
      if (!g.groupId) return false;
      return {
        groupId: g.groupId,
        stem: g.stem || '',
        groupSize: g.questions ? g.questions.length : 0,
        groupIndex: g.groupIndex !== undefined ? g.groupIndex : -1
      };
    },

    /**
     * Get all questions belonging to a case group from the question bank.
     *
     * @param {string} groupId — case group identifier
     * @param {string} subjectId — subject to search within
     * @returns {Array} — [{ question, qid, groupIndex }, ...] sorted by groupIndex
     */
    getGroupQuestions: function(groupId, subjectId) {
      var loader = MediCard.QuestionLoader;
      if (!loader) return [];

      var qs = loader.getSubject(subjectId);
      if (!qs || !qs.length) return [];

      var groupQs = [];
      for (var q = 0; q < qs.length; q++) {
        var g = qs[q].questionGroup;
        if (!g || g.groupId !== groupId) continue;
        var qid = qs[q].id || (subjectId + '_' + q);
        groupQs.push({
          question: qs[q],
          qid: qid,
          groupIndex: g.groupIndex !== undefined ? g.groupIndex : q,
          index: q,
          _caseGroup: true
        });
      }

      // Sort by groupIndex for correct sequence
      groupQs.sort(function(a, b) { return a.groupIndex - b.groupIndex; });
      return groupQs;
    },

    /**
     * Determine whether the shared stem should be displayed for this question.
     * Shows stem for the first question in a group, or when transitioning from
     * a different group.
     *
     * @param {number} currentIndex — current position in session queue
     * @param {Array} sessionQuestions — full session question array
     * @returns {string|null} the stem text to display, or null
     */
    shouldShowSharedStem: function(currentIndex, sessionQuestions) {
      if (currentIndex < 0 || !sessionQuestions || !sessionQuestions.length) return null;

      var cur = sessionQuestions[currentIndex];
      var curGroup = this.isCaseGroup(cur.question || cur);
      if (!curGroup) return null;

      // Show stem if this is the first question or previous question is from a different group
      if (currentIndex === 0) return curGroup.stem;

      var prev = sessionQuestions[currentIndex - 1];
      var prevGroup = this.isCaseGroup(prev.question || prev);

      if (!prevGroup || prevGroup.groupId !== curGroup.groupId) {
        return curGroup.stem;
      }

      return null; // Same group, stem already shown
    },

    /**
     * Check if a case group is complete (all sub-questions in sequence).
     * Used by interleaving-scheduler to verify atomic unit integrity.
     *
     * @param {Array} sessionQuestions — full session queue
     * @param {number} startIndex — where the group starts in the queue
     * @returns {boolean}
     */
    isGroupComplete: function(sessionQuestions, startIndex) {
      var groupInfo = this.isCaseGroup(
        sessionQuestions[startIndex].question || sessionQuestions[startIndex]
      );
      if (!groupInfo) return true; // Not a group, trivially complete

      for (var i = 1; i < groupInfo.groupSize; i++) {
        var idx = startIndex + i;
        if (idx >= sessionQuestions.length) return false;
        var gi = this.isCaseGroup(
          sessionQuestions[idx].question || sessionQuestions[idx]
        );
        if (!gi || gi.groupId !== groupInfo.groupId) return false;
      }
      return true;
    },

    /**
     * Build a case-group-aware session queue.
     * Ensures group sub-questions are consecutive with correct ordering.
     *
     * @param {Array} questions — raw question array from scheduler
     * @returns {Array} — reordered array with case groups as atomic blocks
     */
    buildGroupedQueue: function(questions) {
      if (!questions || !questions.length) return [];

      var result = [];
      var usedIndices = {};
      var self = this;

      for (var i = 0; i < questions.length; i++) {
        if (usedIndices[i]) continue;

        var q = questions[i];
        var qData = q.question || q;
        var groupInfo = self.isCaseGroup(qData);

        if (groupInfo) {
          // Find all members of this group
          var groupMembers = [q];
          usedIndices[i] = true;

          for (var j = i + 1; j < questions.length; j++) {
            if (usedIndices[j]) continue;
            var qjData = questions[j].question || questions[j];
            var gjInfo = self.isCaseGroup(qjData);
            if (gjInfo && gjInfo.groupId === groupInfo.groupId) {
              groupMembers.push(questions[j]);
              usedIndices[j] = true;
            }
          }

          // Sort by groupIndex and append as atomic block
          groupMembers.sort(function(a, b) {
            var ai = self.isCaseGroup(a.question || a);
            var bi = self.isCaseGroup(b.question || b);
            return (ai ? ai.groupIndex : 0) - (bi ? bi.groupIndex : 0);
          });

          for (var m = 0; m < groupMembers.length; m++) {
            result.push(groupMembers[m]);
          }
        } else {
          result.push(q);
          usedIndices[i] = true;
        }
      }

      return result;
    }
  };

  /* ========================================================================
   * EXPORT
   * ======================================================================== */

  MediCard.FastLearnCaseGroup = CaseGroup;
  window.MediCard = MediCard;

  console.log('[FastLearnCaseGroup] Loaded — case group framework (dormant until metadata has questionGroup)');
})();
