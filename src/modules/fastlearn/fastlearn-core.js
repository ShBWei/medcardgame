/**
 * MediCard FastLearn Core — 快学模式核心引擎
 * 12 cognitive science theories → production-grade spaced repetition system
 * Zero breaking changes to existing codebase
 */
(function() {
  var MediCard = window.MediCard || {};

  var FL = {
    _memory: {},
    _knowledgeErrors: {},
    _sessionQueue: [],
    _sessionIndex: 0,
    _sessionSubject: null,
    _sessionStats: null,
    _sessionRetrainMap: null,
    _sessionSeenKP: null,
    _sessionPendingConfusing: null,
    _vulnFixActive: false,
    _vulnFixQueue: null,

    /* ========================================================================
     * SECTION 1: Memory Model — 6-Level Spaced Repetition
     * ======================================================================== */

    /**
     * Memory levels and base intervals (personalized by performance).
     * Level 0: unlearned
     * Level 1: first exposure → review in 10 min
     * Level 2: initial grasp → review in 1 hour
     * Level 3: basic mastery → review in 1 day
     * Level 4: solid mastery → review in 3 days
     * Level 5: full mastery → review in 7 days
     */
    _LEVEL_INTERVALS: [0, 10 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000],

    /** Get or create memory entry for a question ID */
    _getEntry: function(qid, knowledgePoint, subjectId) {
      if (!this._memory[qid]) {
        this._memory[qid] = {
          qid: qid,
          subjectId: subjectId || '',
          knowledgePoint: knowledgePoint || '',
          level: 0,
          lastReviewed: 0,
          nextReview: 0,
          reviewCount: 0,
          errorCount: 0,
          consecutiveCorrect: 0,
          errorGenes: [],
          firstLearned: 0,
          history: [],
          adaptationFactor: 1.0
        };
      }
      return this._memory[qid];
    },

    /**
     * Update memory entry after answering a question.
     * @param {string} qid
     * @param {boolean} correct
     * @param {number} responseMs — time taken to answer
     * @param {string} errorGene — error type if wrong (concept_confusion, knowledge_gap, etc.)
     * @param {string} knowledgePoint
     * @param {string} subjectId
     */
    updateMemory: function(qid, correct, responseMs, errorGene, knowledgePoint, subjectId) {
      var entry = this._getEntry(qid, knowledgePoint, subjectId);
      var now = Date.now();

      entry.lastReviewed = now;
      entry.reviewCount++;
      if (!entry.firstLearned) entry.firstLearned = now;

      if (correct) {
        entry.consecutiveCorrect++;
        // [V6.5] During vulnerability fix, don't modify daily memory levels
        if (!this._vulnFixActive && entry.level < 5) entry.level++;
        // Adapt interval: fast responses → slightly longer intervals
        if (responseMs > 0) {
          if (responseMs < 5000) entry.adaptationFactor = Math.min(1.5, entry.adaptationFactor + 0.02);
          else if (responseMs > 15000) entry.adaptationFactor = Math.max(0.5, entry.adaptationFactor - 0.05);
        }
      } else {
        entry.consecutiveCorrect = 0;
        entry.errorCount++;
        // [V6.5] During vulnerability fix, don't demote daily level
        if (!this._vulnFixActive) entry.level = Math.max(1, entry.level - 1);
        if (errorGene && entry.errorGenes.indexOf(errorGene) < 0) {
          entry.errorGenes.push(errorGene);
        }
        entry.adaptationFactor = Math.max(0.5, entry.adaptationFactor - 0.1);
      }

      // Calculate next review time
      var baseInterval = this._LEVEL_INTERVALS[entry.level];
      var adaptedInterval = baseInterval * entry.adaptationFactor;
      entry.nextReview = now + adaptedInterval;

      // Record history
      entry.history.push({
        timestamp: now,
        correct: correct,
        responseMs: responseMs,
        errorGene: errorGene || '',
        levelAfter: entry.level
      });
      if (entry.history.length > 50) entry.history.shift();

      // Update knowledge point error tracking
      if (knowledgePoint) {
        this._trackKnowledgeError(knowledgePoint, subjectId, correct);
      }

      // Persist
      this._scheduleSave();
    },

    /** Track per-knowledge-point error rates for vulnerability analysis */
    _trackKnowledgeError: function(kp, subjectId, correct) {
      var key = (subjectId || 'unknown') + '::' + kp;
      if (!this._knowledgeErrors[key]) {
        this._knowledgeErrors[key] = { knowledgePoint: kp, subjectId: subjectId, total: 0, errors: 0, lastError: 0 };
      }
      var ke = this._knowledgeErrors[key];
      ke.total++;
      if (!correct) {
        ke.errors++;
        ke.lastError = Date.now();
      }
    },

    /* ========================================================================
     * SECTION 2: Smart Scheduling Algorithm
     * ======================================================================== */

    /**
     * Build a prioritized session queue from due questions.
     * Rules (in priority order):
     * 1. Overdue reviews (highest priority)
     * 2. New questions not yet learned
     * 3. Questions due for review soon
     * 4. Same knowledge point spaced ≥3 questions apart
     * 5. Wrong questions repeated 2× within session
     *
     * @param {string[]} subjectIds
     * @param {number} limit — max questions in queue
     * @param {string[]} wrongQids — wrong question IDs to prioritize
     * @returns {Array} ordered question data array
     */
    buildSessionQueue: function(subjectIds, limit, wrongQids) {
      var self = this;
      var allQuestions = [];
      var loader = MediCard.QuestionLoader;
      if (!loader) return [];

      // Collect all questions from selected subjects
      for (var s = 0; s < subjectIds.length; s++) {
        var qs = loader.getSubject(subjectIds[s]);
        if (qs && qs.length) {
          for (var q = 0; q < qs.length; q++) {
            var qd = qs[q];
            var qid = qd.id || (subjectIds[s] + '_' + q);
            allQuestions.push({ question: qd, qid: qid, subjectId: subjectIds[s], index: q });
          }
        }
      }

      if (!allQuestions.length) return [];

      var now = Date.now();
      limit = limit || Math.min(50, allQuestions.length);

      // Score each question for prioritization
      var scored = [];
      for (var i = 0; i < allQuestions.length; i++) {
        var item = allQuestions[i];
        var entry = self._memory[item.qid];
        var score = self._computePriorityScore(item, entry, now, wrongQids);
        scored.push({ item: item, score: score, entry: entry, kp: (entry && entry.knowledgePoint) || (item.question.knowledgePoint || item.question.kp || '') });
      }

      // Sort by score (highest first)
      scored.sort(function(a, b) { return b.score - a.score; });

      // Build queue with spacing constraint (same KP ≥3 apart)
      var queue = [];
      var kpLastPos = {}; // knowledgePoint → last position in queue
      var deferred = [];

      for (var j = 0; j < scored.length && queue.length < limit; j++) {
        var cand = scored[j];
        var kp = cand.kp;
        var lastPos = kpLastPos[kp];
        if (lastPos !== undefined && queue.length - lastPos < 3) {
          deferred.push(cand); // defer to avoid clustering
        } else {
          queue.push(cand);
          if (kp) kpLastPos[kp] = queue.length - 1;
        }
      }

      // Fill remaining slots from deferred
      for (var d = 0; d < deferred.length && queue.length < limit; d++) {
        queue.push(deferred[d]);
      }

      return queue;
    },

    /**
     * Compute priority score for a question.
     * Higher score = more urgent to review.
     */
    _computePriorityScore: function(item, entry, now, wrongQids) {
      var score = 0;

      if (!entry || entry.level === 0) {
        // Unlearned: medium priority
        score += 50;
      } else {
        // Check if overdue for review
        if (entry.nextReview > 0 && now >= entry.nextReview) {
          var overdueMs = now - entry.nextReview;
          score += 80 + Math.min(20, overdueMs / (60 * 60 * 1000)); // up to +20 for urgency
        } else if (entry.nextReview > 0 && now < entry.nextReview) {
          var timeUntilDue = entry.nextReview - now;
          score += Math.max(0, 30 - timeUntilDue / (60 * 60 * 1000)); // approaching due
        }

        // Lower level = more urgent
        score += (5 - entry.level) * 8;

        // Error count boosts priority
        score += Math.min(15, entry.errorCount * 3);
      }

      // Wrong questions get high priority
      if (wrongQids && wrongQids.indexOf(item.qid) >= 0) {
        score += 40;
      }

      // Randomization — prevents deterministic ordering across sessions
      // Higher jitter for unlearned questions to ensure variety
      if (!entry || entry.level === 0) {
        score += Math.random() * 30;  // Wide jitter for new questions → rotation
      } else {
        score += Math.random() * 12;
      }

      // Demote questions seen in recent sessions (last 24 hours)
      if (entry && entry.lastReviewed > 0) {
        var hoursSinceReview = (now - entry.lastReviewed) / (60 * 60 * 1000);
        if (hoursSinceReview < 2) score -= 25;       // Just reviewed → strongly demote
        else if (hoursSinceReview < 6) score -= 12;   // Reviewed recently → demote
      }

      return score;
    },

    /**
     * Get questions due for review right now.
     * Used for the "今日待复习" badge count.
     */
    getDueQuestions: function(subjectIds) {
      var self = this;
      var now = Date.now();
      var loader = MediCard.QuestionLoader;
      if (!loader) return [];

      var due = [];
      var sids = subjectIds || (MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : []);

      for (var s = 0; s < sids.length; s++) {
        var qs = loader.getSubject(sids[s]);
        if (!qs || !qs.length) continue;
        for (var q = 0; q < qs.length; q++) {
          var qid = qs[q].id || (sids[s] + '_' + q);
          var entry = self._memory[qid];
          if (entry && entry.nextReview > 0 && now >= entry.nextReview) {
            due.push(qid);
          }
        }
      }
      return due;
    },

    /** Count total due questions for badge display */
    getDueCount: function(subjectIds) {
      return this.getDueQuestions(subjectIds).length;
    },

    /* ========================================================================
     * SECTION 3: Error Gene Analysis
     * ======================================================================== */

    /**
     * Analyze why a question was answered incorrectly.
     * Returns an error gene object.
     */
    analyzeError: function(qid, userAnswer, correctAnswer, questionData) {
      var genes = [];
      var userStr = Array.isArray(userAnswer) ? userAnswer.sort().join(',') : String(userAnswer || '');
      var correctStr = Array.isArray(correctAnswer) ? correctAnswer.sort().join(',') : String(correctAnswer || '');

      // Gene 1: concept_confusion — selected a similar-sounding but wrong option
      if (userStr.length === correctStr.length && userStr !== correctStr) {
        genes.push('concept_confusion');
      }

      // Gene 2: knowledge_gap — completely wrong or no answer
      if (!userStr || userStr === '') {
        genes.push('knowledge_gap');
      }

      // Gene 3: memory_blur — partial answer (multi-select missing some)
      if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
        if (userAnswer.length < correctAnswer.length) {
          genes.push('memory_blur');
        } else if (userAnswer.length > correctAnswer.length) {
          genes.push('over_selection');
        }
      }

      // Gene 4: logic_error — selected completely unrelated answer
      if (userStr && correctStr && userStr !== correctStr && userStr.length !== correctStr.length) {
        genes.push('logic_error');
      }

      // Gene 5 (V6.5): differential_confusion — same system, different disease
      if (questionData && userStr && correctStr && userStr !== correctStr) {
        var qTags = questionData.tags || [];
        // Heuristic: if question has clinical system tags, and answer is from same subject
        if (qTags.length > 0 && questionData.subjectId) {
          genes.push('differential_confusion');
        }
      }

      // Gene 6 (V6.5): dose_numeric_error — numeric value in options, wrong order of magnitude
      if (questionData && userStr && correctStr && userStr !== correctStr) {
        var userNum = _extractNumbers(userStr);
        var correctNum = _extractNumbers(correctStr);
        // Also check option texts for numeric content
        var options = questionData.options || questionData.opts || [];
        var hasNumericOption = false;
        for (var oi = 0; oi < options.length; oi++) {
          var optText = typeof options[oi] === 'string' ? options[oi] : (options[oi].text || '');
          if (/\d/.test(optText)) { hasNumericOption = true; break; }
        }
        if (hasNumericOption && userNum.length > 0 && correctNum.length > 0) {
          var userMag = _magnitude(userNum);
          var correctMag = _magnitude(correctNum);
          if (userMag !== correctMag) {
            genes.push('dose_numeric_error');
          }
        }
      }

      // Gene 7 (V6.5): indication_contra — drug/operation in a mismatched scenario
      if (questionData && userStr && correctStr && userStr !== correctStr) {
        var drugPattern = /青霉素|头孢|阿莫西林|阿奇霉素|万古霉素|利福平|异烟肼|吡嗪酰胺|链霉素|庆大霉素|多西环素|四环素|氯霉素|红霉素|诺氟沙星|氧氟沙星|环丙沙星|甲硝唑|氟康唑|两性霉素|伊曲康唑|阿昔洛韦|利巴韦林|干扰素|泼尼松|地塞米松|胰岛素|二甲双胍|硝苯地平|卡托普利|呋塞米|氢氯噻嗪|阿司匹林|华法林|肝素|尿激酶|链激酶/g;
        var surgeryPattern = /切除|切开|引流|移植|吻合|造口|穿刺|镜检|造影|介入/g;
        var optionsText = '';
        if (questionData.options) {
          for (var oj = 0; oj < questionData.options.length; oj++) {
            optionsText += (typeof questionData.options[oj] === 'string' ? questionData.options[oj] : (questionData.options[oj].text || '')) + ' ';
          }
        }
        var questionText = questionData.question || questionData.q || '';
        var hasDrugOrSurgery = drugPattern.test(optionsText) || surgeryPattern.test(optionsText);
        var isScenarioQ = questionText.length > 40; // Clinical scenario questions are longer
        if (hasDrugOrSurgery && isScenarioQ) {
          genes.push('indication_contra');
        }
      }

      if (genes.length === 0) genes.push('other');

      return {
        qid: qid,
        genes: genes,
        userAnswer: userStr,
        correctAnswer: correctStr,
        knowledgePoint: (questionData && (questionData.knowledgePoint || questionData.kp)) || '',
        timestamp: Date.now()
      };

      // Helper: extract numeric values from a string
      function _extractNumbers(str) {
        var matches = str.match(/\d+(?:\.\d+)?/g);
        return matches ? matches.map(Number) : [];
      }
      // Helper: rough order of magnitude
      function _magnitude(nums) {
        if (!nums || nums.length === 0) return 0;
        var avg = nums.reduce(function(a, b) { return a + b; }, 0) / nums.length;
        if (avg === 0) return 0;
        return Math.floor(Math.log10(Math.abs(avg)));
      }
    },

    /**
     * Get error gene report for a question — summary of all errors on this question.
     */
    getErrorGeneReport: function(qid) {
      var entry = this._memory[qid];
      if (!entry) return null;

      var geneCounts = {};
      for (var i = 0; i < entry.errorGenes.length; i++) {
        var g = entry.errorGenes[i];
        geneCounts[g] = (geneCounts[g] || 0) + 1;
      }

      return {
        qid: qid,
        totalErrors: entry.errorCount,
        totalReviews: entry.reviewCount,
        errorRate: entry.reviewCount > 0 ? Math.round(entry.errorCount / entry.reviewCount * 100) : 0,
        geneCounts: geneCounts,
        dominantGene: Object.keys(geneCounts).sort(function(a, b) { return geneCounts[b] - geneCounts[a]; })[0] || 'none',
        knowledgePoint: entry.knowledgePoint,
        level: entry.level,
        history: entry.history.slice(-10)
      };
    },

    /* ========================================================================
     * SECTION 4: Question Similarity Matching
     * ======================================================================== */

    /**
     * Find questions similar to target (same knowledge point, same difficulty).
     */
    findSimilarQuestions: function(qid, count) {
      var entry = this._memory[qid];
      var kp = entry ? entry.knowledgePoint : '';
      var loader = MediCard.QuestionLoader;
      if (!loader || !kp) return [];

      var allSubjects = MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : [];
      var matches = [];

      for (var s = 0; s < allSubjects.length; s++) {
        var qs = loader.getSubject(allSubjects[s]);
        if (!qs) continue;
        for (var q = 0; q < qs.length; q++) {
          var qk = qs[q].id || (allSubjects[s] + '_' + q);
          if (qk === qid) continue;
          var qkp = qs[q].knowledgePoint || qs[q].kp || '';
          if (qkp === kp) {
            matches.push({ question: qs[q], qid: qk, subjectId: allSubjects[s], index: q });
          }
        }
      }

      // Shuffle and limit
      for (var i = matches.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = matches[i]; matches[i] = matches[j]; matches[j] = tmp;
      }
      return matches.slice(0, count || 5);
    },

    /**
     * Find questions that are easily confused with target (same knowledge point family, different nuance).
     * Heuristic: same subject, same first word of knowledge point, but different full KP.
     */
    findConfusingQuestions: function(qid, count) {
      var entry = this._memory[qid];
      var kp = entry ? entry.knowledgePoint : '';
      var sid = entry ? entry.subjectId : '';
      var loader = MediCard.QuestionLoader;
      if (!loader || !kp) return [];

      var qs = loader.getSubject(sid);
      if (!qs) return [];

      var kpPrefix = kp.substring(0, Math.max(2, kp.indexOf('的') > 0 ? kp.indexOf('的') : kp.length));
      var matches = [];

      for (var q = 0; q < qs.length; q++) {
        var qk = qs[q].id || (sid + '_' + q);
        if (qk === qid) continue;
        var qkp = qs[q].knowledgePoint || qs[q].kp || '';
        if (qkp !== kp && qkp.indexOf(kpPrefix) >= 0) {
          matches.push({ question: qs[q], qid: qk, subjectId: sid, index: q });
        }
      }

      for (var i = matches.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = matches[i]; matches[i] = matches[j]; matches[j] = tmp;
      }
      return matches.slice(0, count || 3);
    },

    /* ========================================================================
     * SECTION 5: Vulnerability Fix (Knowledge Gap Closed-Loop Repair)
     * ======================================================================== */

    /**
     * Get the 3 weakest knowledge points for a subject.
     */
    getWeakestKnowledgePoints: function(subjectId, topN) {
      var result = [];
      for (var key in this._knowledgeErrors) {
        var ke = this._knowledgeErrors[key];
        if (subjectId && ke.subjectId !== subjectId) continue;
        if (ke.total >= 2) {
          var errorRate = ke.errors / ke.total;
          result.push({ key: key, kp: ke.knowledgePoint, errorRate: errorRate, total: ke.total, errors: ke.errors });
        }
      }
      result.sort(function(a, b) { return b.errorRate - a.errorRate; });
      return result.slice(0, topN || 3);
    },

    /**
     * Check if a knowledge point needs vulnerability fix (≥2 errors consecutively).
     */
    needsVulnerabilityFix: function(knowledgePoint, subjectId) {
      var key = (subjectId || '') + '::' + knowledgePoint;
      var ke = this._knowledgeErrors[key];
      if (!ke) return false;
      // Check recent history: ≥2 consecutive errors
      var entryKeys = Object.keys(this._memory);
      var recentErrors = 0;
      for (var i = entryKeys.length - 1; i >= 0 && recentErrors < 3; i--) {
        var e = this._memory[entryKeys[i]];
        if (e.knowledgePoint === knowledgePoint) {
          var lastH = e.history.length > 0 ? e.history[e.history.length - 1] : null;
          if (lastH && !lastH.correct) recentErrors++;
          else break;
        }
      }
      return recentErrors >= 2;
    },

    /**
     * Build a vulnerability fix question set for a knowledge point.
     * Returns: { summary, basicQuestions, advancedQuestions, confusingQuestions }
     */
    buildVulnerabilityFix: function(knowledgePoint, subjectId) {
      var loader = MediCard.QuestionLoader;
      if (!loader) return null;

      var qs = loader.getSubject(subjectId);
      if (!qs) return null;

      var basicQuestions = [];
      var advancedQuestions = [];
      var confusingQuestions = [];

      for (var q = 0; q < qs.length; q++) {
        var qkp = qs[q].knowledgePoint || qs[q].kp || '';
        var qid = qs[q].id || (subjectId + '_' + q);
        var item = { question: qs[q], qid: qid, subjectId: subjectId, index: q };

        if (qkp === knowledgePoint) {
          var diff = qs[q].difficulty || 'common';
          if (diff === 'rare' || diff === 'epic') {
            advancedQuestions.push(item);
          } else {
            basicQuestions.push(item);
          }
        } else if (qkp && knowledgePoint && qkp.indexOf(knowledgePoint.substring(0, Math.min(3, knowledgePoint.length))) >= 0) {
          confusingQuestions.push(item);
        }
      }

      // Shuffle each category
      var shuffle = function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      };

      return {
        knowledgePoint: knowledgePoint,
        basicQuestions: shuffle(basicQuestions).slice(0, 5),
        advancedQuestions: shuffle(advancedQuestions).slice(0, 3),
        confusingQuestions: shuffle(confusingQuestions).slice(0, 2)
      };
    },

    /* ========================================================================
     * SECTION 6: Knowledge Graph
     * ======================================================================== */

    /** Get knowledge gap map — all knowledge points with error rates */
    getKnowledgeGapMap: function(subjectId) {
      var self = this;
      var result = [];
      for (var key in self._knowledgeErrors) {
        var ke = self._knowledgeErrors[key];
        if (subjectId && ke.subjectId !== subjectId) continue;
        result.push({
          knowledgePoint: ke.knowledgePoint,
          subjectId: ke.subjectId,
          totalAttempts: ke.total,
          errors: ke.errors,
          errorRate: ke.total > 0 ? Math.round(ke.errors / ke.total * 100) : 0
        });
      }
      result.sort(function(a, b) { return b.errorRate - a.errorRate; });
      return result;
    },

    /* ========================================================================
     * SECTION 7: Session Management
     * ======================================================================== */

    /** Initialize a new study session */
    initSession: function(subjectIds, limit, wrongQids) {
      this._sessionQueue = this.buildSessionQueue(subjectIds, limit, wrongQids);
      this._sessionIndex = 0;
      this._sessionRetrainMap = {}; // qid → timesRetrained
      this._sessionSeenKP = {}; // knowledgePoint → lastSeenIndex
      this._sessionPendingConfusing = []; // confusing questions to insert
      this._sessionStats = {
        subjectIds: subjectIds,
        startTime: Date.now(),
        totalAnswered: 0,
        totalCorrect: 0,
        questionTimes: [],
        vulnerabilityFixes: 0,
        retrainings: 0,
        levelsGained: 0
      };
      return this._sessionQueue;
    },

    /** Get the next question in the session queue */
    getNextQuestion: function() {
      if (this._sessionIndex >= this._sessionQueue.length) return null;
      var item = this._sessionQueue[this._sessionIndex];
      return item;
    },

    /** Advance to next question, handling retraining insertions and vuln fix lifecycle */
    advanceQuestion: function() {
      this._sessionIndex++;

      // [V6.5] Vuln fix lifecycle — check if we're past the basic fix questions
      if (this._vulnFixActive && this._vulnFixQueue) {
        var vfq = this._vulnFixQueue;
        // Check if there are more vuln fix questions coming up
        var hasMoreFix = false;
        for (var i = this._sessionIndex; i < this._sessionQueue.length; i++) {
          var q = this._sessionQueue[i];
          if (q && q._vulnFix) { hasMoreFix = true; break; }
        }
        if (!hasMoreFix) {
          // Insert advanced then confusing questions
          if (vfq.advancedIdx < vfq.advanced.length) {
            var adv = vfq.advanced[vfq.advancedIdx];
            adv._vulnFix = true;
            this._sessionQueue.splice(this._sessionIndex, 0, adv);
            vfq.advancedIdx++;
          } else if (vfq.confusingIdx < vfq.confusing.length) {
            var conf = vfq.confusing[vfq.confusingIdx];
            conf._vulnFix = true;
            this._sessionQueue.splice(this._sessionIndex, 0, conf);
            vfq.confusingIdx++;
          } else {
            // All fix questions done
            this._vulnFixActive = false;
            this._vulnFixQueue = null;
          }
        }
      }

      // Check for pending confusing questions to insert
      if (this._sessionPendingConfusing.length > 0 && this._sessionIndex < this._sessionQueue.length) {
        var insert = this._sessionPendingConfusing.shift();
        this._sessionQueue.splice(this._sessionIndex, 0, insert);
      }
    },

    /** Record a session answer and handle retraining logic */
    recordSessionAnswer: function(qid, correct, responseMs, questionData, errorGene) {
      var item = this._sessionQueue[this._sessionIndex];
      var kp = questionData ? (questionData.knowledgePoint || questionData.kp || '') : '';
      var sid = item ? item.subjectId : '';
      errorGene = errorGene || null;

      if (!correct) {
        // Use caller-supplied errorGene if provided; otherwise analyze from questionData
        if (errorGene) {
          // already computed by caller
        } else if (questionData) {
          var correctAnswer = (questionData.correctAnswers || questionData.ans || []).join(',');
          var analysis = this.analyzeError(qid, '', correctAnswer, questionData);
          errorGene = analysis.genes[0] || 'other';
        }

        // Check for retraining
        var retrainCount = this._sessionRetrainMap[qid] || 0;
        if (retrainCount < 2) {
          this._sessionRetrainMap[qid] = retrainCount + 1;
          // Re-insert at position after next 2 questions
          var insertPos = Math.min(this._sessionIndex + 3, this._sessionQueue.length);
          this._sessionQueue.splice(insertPos, 0, item);
          this._sessionStats.retrainings++;
        }

        // [V6.5] Auto-execute vulnerability fix — insert fix questions into queue
        if (kp && this.needsVulnerabilityFix(kp, sid)) {
          this._sessionStats.vulnerabilityFixes++;
          var fixPack = this.buildVulnerabilityFix(kp, sid);
          if (fixPack && fixPack.basicQuestions && fixPack.basicQuestions.length > 0) {
            this._vulnFixActive = true;
            // Store remaining fix questions for after basic set
            this._vulnFixQueue = {
              advanced: fixPack.advancedQuestions || [],
              confusing: fixPack.confusingQuestions || [],
              advancedIdx: 0,
              confusingIdx: 0
            };
            // Insert basic fix questions at currentIndex + 1
            var insertAt = this._sessionIndex + 1;
            var basics = fixPack.basicQuestions;
            for (var bi = basics.length - 1; bi >= 0; bi--) {
              this._sessionQueue.splice(insertAt, 0, basics[bi]);
            }
          }
        }
      }

      // Update memory model
      this.updateMemory(qid, correct, responseMs, errorGene, kp, sid);

      // Track session stats
      this._sessionStats.totalAnswered++;
      if (correct) this._sessionStats.totalCorrect++;
      this._sessionStats.questionTimes.push({ qid: qid, ms: responseMs, correct: correct });
      if (errorGene) this._sessionStats.lastErrorGene = errorGene;

      // Track knowledge point spacing
      if (kp) this._sessionSeenKP[kp] = this._sessionIndex;

      return {
        needsRetraining: !correct && (this._sessionRetrainMap[qid] || 0) < 2,
        needsVulnerabilityFix: kp ? this.needsVulnerabilityFix(kp, sid) : false,
        errorGene: errorGene,
        knowledgePoint: kp
      };
    },

    /* ========================================================================
     * SECTION 8: Session Report Generation
     * ======================================================================== */

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

      var gapMap = this.getKnowledgeGapMap(stats.subjectIds[0]);

      return {
        totalAnswered: stats.totalAnswered,
        totalCorrect: stats.totalCorrect,
        accuracy: stats.totalAnswered > 0 ? Math.round(stats.totalCorrect / stats.totalAnswered * 100) : 0,
        totalTimeMs: Date.now() - stats.startTime,
        avgTimeSec: times.length > 0 ? (totalMs / times.length / 1000).toFixed(1) : '0',
        fastestSec: fastest < Infinity ? (fastest / 1000).toFixed(1) : '0',
        slowestSec: slowest > 0 ? (slowest / 1000).toFixed(1) : '0',
        vulnerabilityFixes: stats.vulnerabilityFixes,
        retrainings: stats.retrainings,
        levelsGained: stats.levelsGained,
        weakestPoints: gapMap.slice(0, 3),
        averageMemoryLevel: this._computeAverageLevel(),
        predictedRetention: this._predictRetention()
      };
    },

    _computeAverageLevel: function() {
      var keys = Object.keys(this._memory);
      if (keys.length === 0) return 0;
      var sum = 0;
      for (var i = 0; i < keys.length; i++) sum += this._memory[keys[i]].level;
      return (sum / keys.length).toFixed(1);
    },

    _predictRetention: function() {
      var keys = Object.keys(this._memory);
      if (keys.length === 0) return 90;
      var now = Date.now();
      var overdue = 0;
      for (var i = 0; i < keys.length; i++) {
        var e = this._memory[keys[i]];
        if (e.nextReview > 0 && now >= e.nextReview) overdue++;
      }
      return Math.round((1 - overdue / keys.length) * 100);
    },

    /**
     * Generate a 7-day review plan.
     */
    generateWeeklyPlan: function(subjectIds) {
      var self = this;
      var now = Date.now();
      var plan = [];
      var sids = subjectIds || (MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : []);

      for (var day = 0; day < 7; day++) {
        var dayStart = now + day * 24 * 60 * 60 * 1000;
        var dayEnd = dayStart + 24 * 60 * 60 * 1000;
        var dayItems = [];
        for (var s = 0; s < sids.length; s++) {
          var qs = MediCard.QuestionLoader ? MediCard.QuestionLoader.getSubject(sids[s]) : [];
          if (!qs || !qs.length) continue;
          for (var q = 0; q < qs.length; q++) {
            var qid = qs[q].id || (sids[s] + '_' + q);
            var entry = self._memory[qid];
            if (entry && entry.nextReview > 0 && entry.nextReview >= dayStart && entry.nextReview < dayEnd) {
              dayItems.push({ qid: qid, kp: entry.knowledgePoint, level: entry.level });
            }
          }
        }
        plan.push({ day: day, date: dayStart, count: dayItems.length, items: dayItems.slice(0, 20) });
      }

      // Add weakest points as daily focus
      var gaps = this.getKnowledgeGapMap();
      for (var d = 0; d < plan.length && d < gaps.length; d++) {
        plan[d].focusKP = gaps[d].knowledgePoint;
      }

      return plan;
    },

    /* ========================================================================
     * SECTION 9: Persistence
     * ======================================================================== */

    _saveTimer: null,

    _scheduleSave: function() {
      var self = this;
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(function() { self.save(); }, 2000);
    },

    /** Get localStorage key for memory data */
    _getStorageKey: function() {
      var uid = 'default';
      try {
        var Storage = MediCard.Storage;
        if (Storage && Storage.getCurrentUserId) uid = Storage.getCurrentUserId() || 'default';
      } catch(e) {}
      return 'medicard_fl_memory_' + uid;
    },

    _loaded: false,

    save: function() {
      try {
        var data = {
          memory: this._memory,
          knowledgeErrors: this._knowledgeErrors,
          savedAt: Date.now()
        };
        // Use StorageAdapter if available
        var FLS = MediCard.FastLearnStorage;
        if (FLS && FLS.save) {
          FLS.save(data);
          return;
        }
        localStorage.setItem(this._getStorageKey(), JSON.stringify(data));
      } catch(e) {
        // Storage full — trim oldest entries
        this._trimMemory();
      }
    },

    load: function() {
      if (this._loaded) return;  // Already loaded — don't overwrite in-memory state
      this._loaded = true;
      this._installUnloadSaver();

      var self = this;
      var mergeData = function(data) {
        if (!data) return;
        // Merge rather than replace, preserving any entries already in memory
        if (data.memory) {
          for (var qid in data.memory) {
            if (!self._memory[qid] ||
                (data.memory[qid].lastReviewed || 0) > (self._memory[qid].lastReviewed || 0)) {
              self._memory[qid] = data.memory[qid];
            }
          }
        }
        if (data.knowledgeErrors) {
          for (var k in data.knowledgeErrors) {
            var cke = data.knowledgeErrors[k];
            var lke = self._knowledgeErrors[k];
            if (!lke || cke.total > lke.total) {
              self._knowledgeErrors[k] = cke;
            }
          }
        }
      };

      // Use StorageAdapter if available
      var FLS = MediCard.FastLearnStorage;
      if (FLS && FLS.loadAsync) {
        FLS.loadAsync(function(data) {
          if (data) mergeData(data);
        });
        return;
      }

      // Fallback: direct localStorage
      try {
        var raw = localStorage.getItem(this._getStorageKey());
        if (raw) {
          var data = JSON.parse(raw);
          mergeData(data);
        }
      } catch(e) {
        console.warn('[FastLearn] Load failed, keeping current memory state:', e.message);
      }
    },

    /** Force save before page unload — prevents loss of recent answers */
    _installUnloadSaver: function() {
      var self = this;
      if (this._unloadInstalled) return;
      this._unloadInstalled = true;
      var saveAndClear = function() {
        if (self._saveTimer) { clearTimeout(self._saveTimer); self._saveTimer = null; }
        self.save();
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', saveAndClear);
        window.addEventListener('pagehide', saveAndClear);
        // Also save on visibility change (mobile tab switch)
        window.addEventListener('visibilitychange', function() {
          if (document.visibilityState === 'hidden') saveAndClear();
        });
      }
    },

    _trimMemory: function() {
      var self = this;
      var keys = Object.keys(this._memory);
      if (keys.length < 2000) return;
      // Sort by last reviewed, remove oldest 500
      keys.sort(function(a, b) {
        return (self._memory[a].lastReviewed || 0) - (self._memory[b].lastReviewed || 0);
      });
      for (var i = 0; i < 500 && i < keys.length; i++) {
        delete this._memory[keys[i]];
      }
      this.save();
    },

    syncToCloud: function() {
      try {
        if (!MediCard.CloudAPI || !MediCard.CloudAPI.isLoggedIn()) return;
        var data = {
          memory: this._memory,
          knowledgeErrors: this._knowledgeErrors
        };
        MediCard.CloudAPI.saveFastLearnData(data).catch(function(){});
      } catch(e) {}
    },

    restoreFromCloud: function(callback) {
      var self = this;
      try {
        if (!MediCard.CloudAPI || !MediCard.CloudAPI.isLoggedIn()) {
          if (callback) callback();
          return;
        }
        MediCard.CloudAPI.getFastLearnData().then(function(data) {
          if (data && data.memory) {
            // Merge: cloud data takes precedence for entries with newer timestamps
            var cloudMem = data.memory;
            for (var qid in cloudMem) {
              var ce = cloudMem[qid];
              var le = self._memory[qid];
              if (!le || (ce.lastReviewed || 0) > (le.lastReviewed || 0)) {
                self._memory[qid] = ce;
              }
            }
            if (data.knowledgeErrors) {
              for (var k in data.knowledgeErrors) {
                var cke = data.knowledgeErrors[k];
                var lke = self._knowledgeErrors[k];
                if (!lke || cke.total > lke.total) {
                  self._knowledgeErrors[k] = cke;
                }
              }
            }
            self.save();
          }
          if (callback) callback();
        }).catch(function() { if (callback) callback(); });
      } catch(e) { if (callback) callback(); }
    },

    /* ========================================================================
     * SECTION 10: Data Export
     * ======================================================================== */

    exportData: function() {
      // Use file export if StorageAdapter available
      var FLS = MediCard.FastLearnStorage;
      if (FLS && FLS.exportToFile) {
        return FLS.exportToFile();
      }
      return {
        memory: this._memory,
        knowledgeErrors: this._knowledgeErrors,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
    },

    importData: function(data, isFile) {
      // If isFile is a File object, delegate to StorageAdapter
      if (isFile && typeof isFile === 'object' && isFile.name) {
        var FLS = MediCard.FastLearnStorage;
        if (FLS && FLS.importFromFile) {
          var self = this;
          FLS.importFromFile(isFile, function(success, count) {
            if (success) {
              console.log('[FastLearn] Imported ' + count + ' entries from file');
            }
          });
          return true;
        }
        return false;
      }

      // Legacy JSON data import
      if (!data || !data.memory) return false;
      try {
        for (var qid in data.memory) {
          var ie = data.memory[qid];
          var le = this._memory[qid];
          if (!le || (ie.lastReviewed || 0) > (le.lastReviewed || 0)) {
            this._memory[qid] = ie;
          }
        }
        if (data.knowledgeErrors) {
          for (var k in data.knowledgeErrors) {
            this._knowledgeErrors[k] = data.knowledgeErrors[k];
          }
        }
        this.save();
        return true;
      } catch(e) { return false; }
    }
  };

  MediCard.FastLearnCore = FL;
  window.MediCard = MediCard;

  console.log('[FastLearn] Core engine loaded — 12-theory cognitive memory system');
})();
