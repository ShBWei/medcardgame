/**
 * ===========================================================================
 * MediCard Speed Engine v2.0 — 零侵入式加速引擎
 * ===========================================================================
 * Core insight: DOM innerHTML + event handler attachment is the bottleneck.
 * Fix: pre-build HTML strings, cache them, use event delegation.
 *
 * Changes from v1:
 *   - Cache FULL pre-built HTML (not just parsed data)
 *   - Event delegation on #study-main-area (1 handler, not N per render)
 *   - Synchronous preload (no setTimeout delay)
 *   - Track real inter-question time for adaptive window
 *   - Skip CSS fade animation on cache-hit renders for instant transitions
 *   - Fix _handleAnswer timing (measured from "continue" button click)
 *
 * Usage:
 *   speedEngine.toggle()           — on/off
 *   speedEngine.getStats()         — hit rate, cache size, avg question time
 *   speedEngine.exportQuestions(subjectId, 'csv', onProgress, onComplete)
 * ===========================================================================
 */
(function() {
  'use strict';

  /* ==========================================================================
   * SECTION 0: Bootstrap
   * ========================================================================== */

  var _READY_TIMEOUT = 15000;
  var _READY_POLL_MS = 80;

  var Engine = {
    _enabled: true,
    _installed: false,
    _originals: {},
    _delegationActive: false,   // true when _attachQuestionEvents should be no-op
    _delegationAttached: false, // true when click handler physically on #study-main-area

    /* ── Public API ── */

    toggle: function() {
      this._enabled = !this._enabled;
      if (this._enabled) { this._install(); }
      else { this._uninstall(); }
      console.log(
        '%c⚡ SpeedEngine %c' + (this._enabled ? 'ON — acceleration active' : 'OFF — original speed'),
        'font-weight:bold;', 'color:' + (this._enabled ? '#10b981' : '#ef4444')
      );
      return this._enabled;
    },

    getStats: function() {
      var total = this._preloadHits + this._preloadMisses;
      return {
        enabled: this._enabled,
        installed: this._installed,
        cache: {
          memory: this._memCache.size + ' / ' + this._memCacheMax,
          localStorage: this._localCache.count() + ' / ' + this._localCache._max
        },
        preload: {
          hits: this._preloadHits,
          misses: this._preloadMisses,
          hitRate: total > 0 ? Math.round(this._preloadHits / total * 100) + '%' : 'n/a',
          windowSize: this._windowSize
        },
        timing: {
          avgInterQuestion: this._interQuestionTimes.length > 0
            ? Math.round(this._interQuestionTimes.reduce(function(a,b){return a+b;},0) / this._interQuestionTimes.length) + 'ms'
            : 'n/a',
          samples: this._interQuestionTimes.length
        },
        exports: { completed: this._exportCount, worker: !!window.Worker },
        serviceWorker: this._swState
      };
    },

    /** Force preload for a subject starting at a given index */
    preloadNow: function(subjectId, startIndex) {
      if (!this._enabled) return;
      var study = _getStudy();
      if (!study) return;
      var questions = _getQuestionsFor(study, subjectId);
      if (!questions || !questions.length) return;
      startIndex = startIndex || 0;
      for (var i = startIndex; i < Math.min(startIndex + this._windowSize, questions.length); i++) {
        this._buildAndCache(study, questions[i], i);
      }
    },

    /* ==========================================================================
     * SECTION 1: Memory Cache (LRU, max 100)
     * ========================================================================== */

    _memCache: new Map(),
    _memCacheMax: 100,
    _memCacheAccess: [],

    _cacheKey: function(subjectId, questionIndex) {
      return subjectId + '::' + questionIndex;
    },

    _memGet: function(subjectId, questionIndex) {
      var key = this._cacheKey(subjectId, questionIndex);
      if (!this._memCache.has(key)) return undefined;
      var idx = this._memCacheAccess.indexOf(key);
      if (idx >= 0) this._memCacheAccess.splice(idx, 1);
      this._memCacheAccess.push(key);
      return this._memCache.get(key);
    },

    _memSet: function(subjectId, questionIndex, data) {
      var key = this._cacheKey(subjectId, questionIndex);
      if (this._memCache.size >= this._memCacheMax && !this._memCache.has(key)) {
        var oldest = this._memCacheAccess.shift();
        if (oldest) this._memCache.delete(oldest);
      }
      this._memCache.set(key, data);
      var idx = this._memCacheAccess.indexOf(key);
      if (idx >= 0) this._memCacheAccess.splice(idx, 1);
      this._memCacheAccess.push(key);
    },

    /* ==========================================================================
     * SECTION 2: localStorage Cache (LRU, max 500)
     * ========================================================================== */

    _localCache: {
      _prefix: 'mcse2_',
      _metaKey: 'mcse2_meta',
      _max: 500,

      _getMeta: function() {
        try { var r = localStorage.getItem(this._metaKey); return r ? JSON.parse(r) : { keys: [], access: [] }; }
        catch(e) { return { keys: [], access: [] }; }
      },
      _saveMeta: function(m) {
        try { localStorage.setItem(this._metaKey, JSON.stringify(m)); } catch(e) {}
      },
      get: function(key) {
        try {
          var raw = localStorage.getItem(this._prefix + key);
          if (!raw) return undefined;
          var m = this._getMeta();
          var idx = m.access.indexOf(key);
          if (idx >= 0) m.access.splice(idx, 1);
          m.access.push(key);
          this._saveMeta(m);
          return JSON.parse(raw);
        } catch(e) { return undefined; }
      },
      set: function(key, value) {
        try {
          var m = this._getMeta();
          while (m.keys.length >= this._max && m.keys.indexOf(key) < 0) {
            var old = m.access.shift();
            if (old) {
              var ki = m.keys.indexOf(old);
              if (ki >= 0) m.keys.splice(ki, 1);
              localStorage.removeItem(this._prefix + old);
            } else break;
          }
          if (m.keys.indexOf(key) < 0) m.keys.push(key);
          var idx = m.access.indexOf(key);
          if (idx >= 0) m.access.splice(idx, 1);
          m.access.push(key);
          this._saveMeta(m);
          localStorage.setItem(this._prefix + key, JSON.stringify(value));
        } catch(e) {}
      },
      count: function() { return this._getMeta().keys.length; }
    },

    /* ==========================================================================
     * SECTION 3: HTML Pre-building (the real performance win)
     * ========================================================================== */

    /**
     * Pre-build the complete HTML for a question and cache it.
     * The cached object contains:
     *   - bodyHTML: everything below the progress header (question card + options + toolbar)
     *   - shuffledOptions: for _handleAnswer reference
     *   - id: question id
     *
     * Dynamic parts (progress bar, question number, timer) are patched at render time
     * via _renderHeaderHTML() — these are pure string ops and take microseconds.
     */
    _buildAndCache: function(study, q, questionIndex) {
      var cacheKey = this._cacheKey(study._currentSubject, questionIndex);
      if (this._memCache.has(cacheKey)) return this._memCache.get(cacheKey);

      // Parse options once
      var rawOpts = q.options || q.opts || [];
      var correctRaw = q.correctAnswers || q.ans || [];
      var parsed = study._parseOptions(rawOpts, correctRaw);
      var shuffled = study._shuffleOptions(parsed);
      var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      // Build shuffled options array
      var shuffledOptions = [];
      for (var i = 0; i < shuffled.length; i++) {
        shuffledOptions.push({
          letter: labels.charAt(i),
          text: shuffled[i].text,
          isCorrect: shuffled[i].isCorrect
        });
      }

      // Pre-build options HTML
      var optHTML = '';
      for (var j = 0; j < shuffledOptions.length; j++) {
        var o = shuffledOptions[j];
        optHTML += '<button class="study-option-btn" data-letter="' + o.letter + '">' +
          '<span class="study-option-letter">' + o.letter + '</span>' +
          _esc(o.text) + '</button>';
      }

      var qText = q.question || q.q || '';
      var kp = q.knowledgePoint || q.kp || '';
      var diff = q.difficulty || '';
      var qId = q.id || (study._currentSubject + '_' + questionIndex);

      // Pre-build the entire body HTML (everything under the progress header)
      var bodyHTML = '' +
        '<div class="study-question-card">' +
          '<div class="study-question-text">' + _esc(qText) + '</div>' +
          (kp ? '<div class="study-question-meta">📖 ' + _esc(kp) + '</div>' : '') +
        '</div>' +
        '<div class="study-options" id="study-options">' + optHTML + '</div>' +
        '<div id="study-feedback-area"></div>' +
        '<div class="study-toolbar">' +
          '<button class="study-toolbar-btn" id="study-bookmark-btn">☆ 收藏</button>' +
          '<button class="study-toolbar-btn" id="study-flag-btn">🚩 质疑</button>' +
          '<button class="study-toolbar-btn" id="study-skip-btn">⏭ 跳过</button>' +
        '</div>';

      var cached = {
        bodyHTML: bodyHTML,
        shuffledOptions: shuffledOptions,
        id: qId,
        difficulty: diff,
        knowledgePoint: kp
      };

      this._memSet(study._currentSubject, questionIndex, cached);

      // Also persist to localStorage (strip bodyHTML — too large, keep options only)
      try {
        var lcKey = 'q_' + study._currentSubject + '_' + questionIndex;
        this._localCache.set(lcKey, {
          s: shuffledOptions, i: qId, d: diff, k: kp, q: qText
        });
      } catch(e) {}

      return cached;
    },

    /* ==========================================================================
     * SECTION 4: Fast Render — cached HTML + event delegation
     * ========================================================================== */

    _preloadHits: 0,
    _preloadMisses: 0,
    _windowSize: 3,
    _interQuestionTimes: [],
    _questionDisplayTime: 0,   // timestamp when question was displayed
    _delegatedMainArea: null,

    /**
     * Build just the dynamic header portion (fast, pure string).
     * This is the only part that changes between renders of the same question.
     */
    _renderHeaderHTML: function(study, cached) {
      var idx = study._questionIndex;
      var total = study._questions.length;
      var pct = Math.round(idx / total * 100);

      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[study._currentSubject] || {};
      var subjectName = m.name || study._currentSubject;

      return '' +
        '<div class="study-question-header">' +
          '<span class="study-question-num">' + subjectName + ' · 第' + (idx + 1) + '/' + total + '题</span>' +
          '<span>' + (cached.difficulty === 'rare' ? '🔷' : cached.difficulty === 'epic' ? '💎' : '') + '</span>' +
        '</div>' +
        '<div class="study-question-progress-bar"><div class="study-question-progress-fill" style="width:' + pct + '%;"></div></div>' +
        (study._timerOn ? '<div style="text-align:center;font-size:18px;font-weight:700;color:var(--s-accent);margin-bottom:8px;" id="study-timer-display">30</div>' : '');
    },

    /** Fast render from cached HTML: header string + cached bodyHTML, one innerHTML call */
    _fastRender: function(study, cached) {
      study._answered = false;
      study._stopTimer();
      study._currentShuffled = cached.shuffledOptions;
      this._questionDisplayTime = Date.now();

      var mainArea = document.getElementById('study-main-area');
      if (!mainArea) return;

      // Patch bookmark button
      var isBm = MediCard.WrongQuestionBook && MediCard.WrongQuestionBook.isBookmarked(cached.id);
      var bodyHTML = cached.bodyHTML;
      if (isBm) {
        bodyHTML = bodyHTML.replace('id="study-bookmark-btn">☆ 收藏', 'id="study-bookmark-btn" class="bookmarked">⭐ 已收藏');
      }

      // Single innerHTML assignment (the only DOM operation for the entire render)
      var headerHTML = this._renderHeaderHTML(study, cached);
      mainArea.innerHTML = '<div class="study-question-area">' + headerHTML + bodyHTML + '</div>';

      // Event delegation: single handler on the persistent #study-main-area
      this._ensureDelegation(study);

      // Update header state
      if (study._updateHeaderForQuestion) study._updateHeaderForQuestion();

      // Start timer if needed
      if (study._timerOn && study._startTimer) study._startTimer(30);
    },

    /**
     * Install a single delegated event handler on #study-main-area.
     * Covers option buttons, bookmark, flag, skip.
     * Does NOT handle #study-continue-btn — the original _handleAnswer attaches
     * its own handler for that, and we must not double-fire (would skip questions).
     * Only installed once per session.
     */
    _ensureDelegation: function(study) {
      if (this._delegationAttached) return;

      var mainArea = document.getElementById('study-main-area');
      if (!mainArea) return;

      var self = this;
      mainArea.addEventListener('click', function(e) {
        // Option button click
        var optBtn = e.target.closest('.study-option-btn');
        if (optBtn && !study._answered) {
          study._answered = true;
          study._stopTimer();
          // Measure inter-question time (from display to answer)
          if (self._questionDisplayTime > 0) {
            var elapsed = Date.now() - self._questionDisplayTime;
            self._interQuestionTimes.push(elapsed);
            if (self._interQuestionTimes.length > 30) self._interQuestionTimes.shift();
            self._adaptWindow();
          }
          var letter = optBtn.getAttribute('data-letter');
          var q = study._questions[study._questionIndex];
          var qId = q.id || (study._currentSubject + '_' + study._questionIndex);
          study._handleAnswer(letter, qId, q);
          return;
        }

        // Bookmark button
        var bmBtn = e.target.closest('#study-bookmark-btn');
        if (bmBtn && MediCard.WrongQuestionBook) {
          var q = study._questions[study._questionIndex];
          var bmQId = q ? (q.id || (study._currentSubject + '_' + study._questionIndex)) : (study._currentSubject + '_' + study._questionIndex);
          var nowBm = MediCard.WrongQuestionBook.toggleBookmark(bmQId);
          bmBtn.textContent = nowBm ? '⭐ 已收藏' : '☆ 收藏';
          if (nowBm) { bmBtn.classList.add('bookmarked'); }
          else { bmBtn.classList.remove('bookmarked'); }
          return;
        }

        // Flag button
        var flagBtn = e.target.closest('#study-flag-btn');
        if (flagBtn && !flagBtn.disabled) {
          var q2 = study._questions[study._questionIndex];
          var flagQId = q2 ? (q2.id || (study._currentSubject + '_' + study._questionIndex)) : (study._currentSubject + '_' + study._questionIndex);
          study._flagQuestion(flagQId);
          flagBtn.classList.add('flagged');
          flagBtn.textContent = '✅ 已质疑';
          flagBtn.disabled = true;
          return;
        }

        // Skip button
        var skipBtn = e.target.closest('#study-skip-btn');
        if (skipBtn && !study._answered) {
          study._stopTimer();
          study._sessionAnswered++;
          study._recordAnswer(false);
          study._questionIndex++;
          study._renderQuestion();
          return;
        }
      });

      this._delegationAttached = true;
    },

    /** Adjust preload window based on average inter-question time */
    _adaptWindow: function() {
      if (this._interQuestionTimes.length < 3) return;
      var sum = 0;
      for (var i = 0; i < this._interQuestionTimes.length; i++) sum += this._interQuestionTimes[i];
      var avg = sum / this._interQuestionTimes.length;
      if (avg < 3000) this._windowSize = 5;       // fast reader: preload more
      else if (avg < 8000) this._windowSize = 3;
      else this._windowSize = 2;                   // slow reader: save memory
    },

    /** Preload next N questions (synchronous — runs in <5ms) */
    _preloadAhead: function(study) {
      if (!this._enabled || !study._questions || !study._questions.length) return;
      var idx = study._questionIndex;
      var end = Math.min(idx + 1 + this._windowSize, study._questions.length);
      for (var i = idx + 1; i < end; i++) {
        this._buildAndCache(study, study._questions[i], i);
      }
    },

    /* ==========================================================================
     * SECTION 5: Hook System
     * ========================================================================== */

    _install: function() {
      if (this._installed) return;
      var study = _getStudy();
      if (!study) return;

      var self = this;
      this._delegationActive = false;
      this._delegationAttached = false; // reset on re-install

      // ── Hook: _renderQuestion ──
      if (!this._originals._renderQuestion) {
        this._originals._renderQuestion = study._renderQuestion;
        study._renderQuestion = function() {
          // Try cached HTML first
          if (self._enabled && this._questions && this._questions.length && this._currentSubject) {
            var cached = self._memGet(this._currentSubject, this._questionIndex);
            if (cached && cached.bodyHTML) {
              self._preloadHits++;
              // Delegate now active — wrap _attachQuestionEvents so original
              // individual handlers don't double-fire with delegation.
              self._delegationActive = true;
              self._fastRender(this, cached);
              self._preloadAhead(this);
              return;
            }
            self._preloadMisses++;
          }
          // Cache miss: use original render. Do NOT activate delegation —
          // the original _attachQuestionEvents provides individual handlers.
          // Delegation will activate on the first cache hit.
          self._delegationActive = false;
          var result = self._originals._renderQuestion.apply(this, arguments);
          if (self._enabled && this._questions && this._questions.length) {
            self._questionDisplayTime = Date.now();
            self._buildAndCache(this, this._questions[this._questionIndex], this._questionIndex);
            self._preloadAhead(this);
          }
          return result;
        };
      }

      // ── Hook: startSubject — preload initial batch ──
      if (!this._originals.startSubject) {
        this._originals.startSubject = study.startSubject;
        study.startSubject = function(subjectId) {
          var result = self._originals.startSubject.apply(this, arguments);
          if (self._enabled && this._questions && this._questions.length) {
            var ref = this;
            // Use requestIdleCallback or setTimeout(0) to not block the initial render
            var preloadInitial = function() {
              var end = Math.min(self._windowSize, ref._questions.length);
              for (var i = 0; i < end; i++) {
                self._buildAndCache(ref, ref._questions[i], i);
              }
            };
            if (window.requestIdleCallback) {
              requestIdleCallback(preloadInitial, { timeout: 200 });
            } else {
              setTimeout(preloadInitial, 0);
            }
          }
          return result;
        };
      }

      // ── Hook: _attachQuestionEvents — skip when delegation is active ──
      // Prevents double-firing: delegation on #study-main-area already handles
      // option/bookmark/flag/skip clicks. The original would attach duplicate
      // individual handlers. When delegation is not yet active (first render),
      // let the original run normally — delegation is installed right after.
      if (!this._originals._attachQuestionEvents) {
        this._originals._attachQuestionEvents = study._attachQuestionEvents;
        study._attachQuestionEvents = function(qId, q) {
          if (Engine._delegationActive) return; // delegation covers everything
          Engine._originals._attachQuestionEvents.call(this, qId, q);
        };
      }

      // ── Hook: goBack — reset delegation on subject change ──
      if (!this._originals.goBack) {
        this._originals.goBack = study.goBack;
        study.goBack = function() {
          self._delegationActive = false;
          self._delegationAttached = false;
          return self._originals.goBack.apply(this, arguments);
        };
      }

      this._installed = true;
      this._logInstall();
    },

    _uninstall: function() {
      if (!this._installed) return;
      var study = _getStudy();
      for (var method in this._originals) {
        if (study && typeof study[method] !== 'undefined') {
          study[method] = this._originals[method];
        }
      }
      this._originals = {};
      this._installed = false;
      this._delegationActive = false;
      this._delegationAttached = false;
      console.log('%c⚡ SpeedEngine %cUninstalled — all hooks removed',
        'font-weight:bold;', 'color:#f59e0b');
    },

    _logInstall: function() {
      console.log(
        '%c⚡ SpeedEngine v2 %cInstalled — %c' + Object.keys(this._originals).length + ' hooks%c, ' +
        '%chtml-cache%c + %cevent-delegation%c + %csync-preload',
        'font-weight:bold;', 'color:#06b6d4;',
        'font-weight:bold;', 'color:#06b6d4;',
        'color:#10b981;', 'color:#06b6d4;',
        'color:#f0b860;', 'color:#06b6d4;',
        'color:#a890e0;', 'color:#06b6d4;'
      );
    },

    /* ==========================================================================
     * SECTION 6: Export Engine (Web Worker)
     * ========================================================================== */

    _exportCount: 0,
    _exportWorker: null,

    exportQuestions: function(subjectId, format, onProgress, onComplete) {
      format = format || 'json';
      onProgress = onProgress || function() {};
      onComplete = onComplete || function() {};

      var questions;
      if (subjectId === '__wrong__') {
        questions = this._collectWrongQuestions();
      } else {
        var loader = MediCard.QuestionLoader;
        if (!loader) { onComplete(null, ''); return; }
        questions = loader.getSubject(subjectId);
      }

      if (!questions || !questions.length) {
        onComplete(null, '');
        return;
      }

      var meta = MediCard.Config.subjectMeta || {};
      var subjectName = (meta[subjectId] && meta[subjectId].name) || subjectId;

      if (window.Worker) {
        this._exportWithWorker(questions, format, subjectName, onProgress, onComplete);
      } else {
        this._exportSyncChunked(questions, format, subjectName, onProgress, onComplete);
      }
    },

    _collectWrongQuestions: function() {
      var wb = MediCard.WrongQuestionBook;
      if (!wb) return [];
      try {
        var wrongIds = wb.getIds ? wb.getIds() : (wb.getAll ? wb.getAll() : []);
        if (!wrongIds || !wrongIds.length) return [];
        // Convert ID list to questions
        var ids = Array.isArray(wrongIds) ? wrongIds : Object.keys(wrongIds);
        var allSubs = MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : [];
        var found = [];
        for (var s = 0; s < allSubs.length; s++) {
          var qs = MediCard.QuestionLoader.getSubject(allSubs[s]);
          if (!qs) continue;
          for (var q = 0; q < qs.length; q++) {
            if (ids.indexOf(qs[q].id) >= 0) found.push(qs[q]);
          }
        }
        return found;
      } catch(e) { return []; }
    },

    _exportWithWorker: function(questions, format, subjectName, onProgress, onComplete) {
      var self = this;
      if (!this._exportWorker) {
        var code = _EXPORT_WORKER_CODE();
        var blob = new Blob([code], { type: 'application/javascript' });
        this._exportWorker = new Worker(URL.createObjectURL(blob));
      }

      var worker = this._exportWorker;
      worker.onmessage = function(e) {
        var d = e.data;
        if (d.type === 'progress') { onProgress(d.percent); }
        else if (d.type === 'complete') {
          self._exportCount++;
          if (d.chunks && d.chunks.length > 1) {
            for (var c = 0; c < d.chunks.length; c++) {
              onComplete(new Blob([d.chunks[c].content], { type: d.chunks[c].mime }), d.chunks[c].filename, c, d.chunks.length);
            }
          } else {
            onComplete(new Blob([d.content], { type: d.mime }), d.filename, 0, 1);
          }
        }
      };
      worker.onerror = function() {
        self._exportSyncChunked(questions, format, subjectName, onProgress, onComplete);
      };
      worker.postMessage({
        action: 'export',
        questions: questions.map(function(q) {
          return {
            question: q.question || q.q || '',
            options: q.options || q.opts || [],
            correctAnswers: q.correctAnswers || q.ans || [],
            explanation: q.explanation || q.exp || '',
            reference: q.textbookReference || q.ref || '',
            id: q.id || '', difficulty: q.difficulty || '',
            knowledgePoint: q.knowledgePoint || q.kp || ''
          };
        }),
        format: format, subjectName: subjectName
      });
    },

    _exportSyncChunked: function(questions, format, subjectName, onProgress, onComplete) {
      var self = this;
      var chunkSize = 200;
      var chunks = [];
      for (var i = 0; i < questions.length; i += chunkSize) {
        chunks.push(questions.slice(i, Math.min(i + chunkSize, questions.length)));
      }
      var all = '';
      var done = 0;
      function process(idx) {
        if (idx >= chunks.length) {
          self._exportCount++;
          var ext = format === 'csv' ? '.csv' : format === 'html' ? '.html' : '.json';
          var mime = format === 'csv' ? 'text/csv' : format === 'html' ? 'text/html' : 'application/json';
          onComplete(new Blob([all], { type: mime }), subjectName + ext, 0, 1);
          return;
        }
        all += _formatQuestionsChunk(chunks[idx], format, subjectName, idx === 0);
        done += chunks[idx].length;
        onProgress(Math.round(done / questions.length * 100));
        setTimeout(function() { process(idx + 1); }, 0);
      }
      setTimeout(function() { process(0); }, 10);
    },

    /* ==========================================================================
     * SECTION 7: Service Worker
     * ========================================================================== */

    _swState: 'unregistered',

    _registerServiceWorker: function() {
      if (!('serviceWorker' in navigator)) {
        this._swState = 'unsupported';
        return;
      }
      var self = this;
      if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(function() { self._swState = 'active'; })
          .catch(function(err) { self._swState = 'error: ' + (err.message || 'unknown'); });
      } else {
        this._swState = 'skipped (non-HTTPS)';
      }
    },

    /* ==========================================================================
     * SECTION 8: Init
     * ========================================================================== */

    _boot: function() {
      var self = this;
      function tryInstall() {
        var study = _getStudy();
        if (study && study._renderQuestion && study._parseOptions) {
          self._install();
          setTimeout(function() { self._registerServiceWorker(); }, 3000);
          return true;
        }
        return false;
      }
      if (tryInstall()) return;
      var start = Date.now();
      var poll = setInterval(function() {
        if (tryInstall()) { clearInterval(poll); }
        else if (Date.now() - start > _READY_TIMEOUT) { clearInterval(poll); }
      }, _READY_POLL_MS);
    }
  };

  /* ==========================================================================
   * SECTION 9: Helpers
   * ========================================================================== */

  function _getStudy() {
    return (window.MediCard && window.MediCard.ScreenStudy) || null;
  }

  function _getQuestionsFor(study, subjectId) {
    if (study._currentSubject === subjectId && study._questions && study._questions.length) {
      return study._questions;
    }
    if (MediCard.QuestionLoader) {
      return MediCard.QuestionLoader.getSubject(subjectId) || [];
    }
    return [];
  }

  function _esc(str) {
    if (!str) return '';
    if (window.MediCard && window.MediCard.Crypto && window.MediCard.Crypto.escapeHtml) {
      return window.MediCard.Crypto.escapeHtml(str);
    }
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatQuestionsChunk(questions, format, subjectName, isFirst) {
    switch (format) {
      case 'csv': return _toCSV(questions, isFirst);
      case 'html': return _toHTML(questions, subjectName, isFirst);
      default: return JSON.stringify(questions, null, 2);
    }
  }

  function _csvEscape(str) {
    str = String(str || '');
    if (str.indexOf(',') >= 0 || str.indexOf('"') >= 0 || str.indexOf('\n') >= 0) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function _toCSV(questions, includeHeader) {
    var lines = [];
    if (includeHeader) lines.push('ID,Question,Options,CorrectAnswers,Explanation,Reference,Difficulty,KnowledgePoint');
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      lines.push([
        _csvEscape(q.id), _csvEscape(q.question),
        _csvEscape((q.options || []).join(' | ')),
        _csvEscape((q.correctAnswers || []).join(',')),
        _csvEscape(q.explanation), _csvEscape(q.reference),
        _csvEscape(q.difficulty), _csvEscape(q.knowledgePoint)
      ].join(','));
    }
    return lines.join('\n');
  }

  function _toHTML(questions, subjectName, isFirst) {
    var h = '';
    if (isFirst) {
      h += '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n';
      h += '<title>' + _esc(subjectName) + ' — 题库导出</title>\n';
      h += '<style>body{font-family:"Noto Sans SC",sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;background:#fafafa}h1{color:#1a1a2e;border-bottom:2px solid #e0e0e0;padding-bottom:8px}.q-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:12px 0}.q-num{font-weight:700;color:#666;font-size:12px;margin-bottom:6px}.q-text{font-size:15px;line-height:1.6;margin-bottom:10px}.q-ans{color:#10b981;font-weight:600}.q-exp{color:#666;font-size:11px;margin-top:4px;font-style:italic}</style>\n</head>\n<body>\n';
      h += '<h1>📖 ' + _esc(subjectName) + '</h1>\n';
    }
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var correctSet = {};
      var ans = q.correctAnswers || [];
      for (var a = 0; a < ans.length; a++) correctSet[ans[a]] = true;
      h += '<div class="q-card">\n';
      h += '  <div class="q-num">#' + (q.id || (i+1)) + '</div>\n';
      h += '  <div class="q-text">' + _esc(q.question) + '</div>\n';
      if (q.options && q.options.length) {
        for (var o = 0; o < q.options.length; o++) {
          var label = String.fromCharCode(65 + o);
          var isC = !!correctSet[label] || !!correctSet[o] || !!correctSet[String(o)];
          h += '  <div class="' + (isC ? 'q-ans' : '') + '">' + label + '. ' + _esc(q.options[o]) + (isC ? ' ✓' : '') + '</div>\n';
        }
      }
      if (q.explanation) h += '  <div class="q-exp">💡 ' + _esc(q.explanation) + '</div>\n';
      if (q.reference) h += '  <div class="q-exp">📚 ' + _esc(q.reference) + '</div>\n';
      h += '</div>\n';
    }
    return h;
  }

  /** Web Worker code — stringified for Blob URL */
  function _EXPORT_WORKER_CODE() {
    return [
      'var _e=function(s){return s?String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""};',
      'var _c=function(s){s=String(s||"");return s.indexOf(",")>=0||s.indexOf(\'"\')>=0||s.indexOf("\\n")>=0?\'"\'+s.replace(/"/g,\'""\')+\'"\':s};',
      'function _csv(qs,hdr){var l=[];if(hdr)l.push("ID,Question,Options,CorrectAnswers,Explanation,Reference,Difficulty,KnowledgePoint");',
      'for(var i=0;i<qs.length;i++){var q=qs[i];l.push([_c(q.id),_c(q.question),_c((q.options||[]).join(" | ")),_c((q.correctAnswers||[]).join(",")),_c(q.explanation),_c(q.reference),_c(q.difficulty),_c(q.knowledgePoint)].join(","))}return l.join("\\n")}',
      'function _html(qs,nm,first){var h="";if(first){h+="<!DOCTYPE html>\\n<html lang=\\"zh-CN\\">\\n<head>\\n<meta charset=\\"UTF-8\\">\\n";',
      'h+="<title>"+_e(nm)+" — 题库导出</title>\\n";',
      'h+="<style>body{font-family:\\"Noto Sans SC\\",sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;background:#fafafa}h1{color:#1a1a2e;border-bottom:2px solid #e0e0e0;padding-bottom:8px}.q-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:12px 0;box-shadow:0 1px 3px rgba(0,0,0,0.05)}.q-num{font-weight:700;color:#666;font-size:12px;margin-bottom:6px}.q-text{font-size:15px;line-height:1.6;margin-bottom:10px}.q-ans{color:#10b981;font-weight:600}.q-exp{color:#666;font-size:11px;margin-top:4px;font-style:italic}</style>\\n</head>\\n<body>\\n";',
      'h+="<h1>📖 "+_e(nm)+"</h1>\\n"}',
      'for(var i=0;i<qs.length;i++){var q=qs[i],cs={},an=q.correctAnswers||[];',
      'for(var a=0;a<an.length;a++)cs[an[a]]=true;',
      'h+="<div class=\\"q-card\\">\\n  <div class=\\"q-num\\">#"+(q.id||(i+1))+"</div>\\n  <div class=\\"q-text\\">"+_e(q.question)+"</div>\\n";',
      'if(q.options&&q.options.length){for(var o=0;o<q.options.length;o++){var lb=String.fromCharCode(65+o),ic=!!cs[lb]||!!cs[o]||!!cs[String(o)];',
      'h+="  <div class=\\""+(ic?"q-ans":"")+"\\">"+lb+". "+_e(q.options[o])+(ic?" ✓":"")+"</div>\\n"}}',
      'if(q.explanation)h+="  <div class=\\"q-exp\\">💡 "+_e(q.explanation)+"</div>\\n";',
      'if(q.reference)h+="  <div class=\\"q-exp\\">📚 "+_e(q.reference)+"</div>\\n";',
      'h+="</div>\\n"}return h}',
      'self.onmessage=function(e){var d=e.data;if(d.action!=="export")return;',
      'var qs=d.questions,f=d.format||"json",nm=d.subjectName||"export",CS=1000;',
      'if(qs.length>CS){var tc=Math.ceil(qs.length/CS),cks=[];',
      'for(var c=0;c<tc;c++){var cq=qs.slice(c*CS,(c+1)*CS);',
      'var ct=f==="csv"?_csv(cq,c===0):f==="html"?_html(cq,nm,c===0):JSON.stringify(cq,null,2);',
      'var ext=f==="csv"?".csv":f==="html"?".html":".json";',
      'var mt=f==="csv"?"text/csv":f==="html"?"text/html":"application/json";',
      'cks.push({content:ct,filename:nm+"_part"+(c+1)+ext,mime:mt});',
      'self.postMessage({type:"progress",percent:Math.round((c+1)/tc*100)})}',
      'self.postMessage({type:"complete",chunks:cks})}',
      'else{var ct=f==="csv"?_csv(qs,true):f==="html"?_html(qs,nm,true)+"\\n</body>\\n</html>":JSON.stringify(qs,null,2);',
      'var ext=f==="csv"?".csv":f==="html"?".html":".json";',
      'var mt=f==="csv"?"text/csv":f==="html"?"text/html":"application/json";',
      'self.postMessage({type:"complete",content:ct,filename:nm+ext,mime:mt,chunks:[{content:ct,filename:nm+ext,mime:mt}]})}};'
    ].join('\n');
  }

  /* ==========================================================================
   * SECTION 10: Auto-boot
   * ========================================================================== */

  window.speedEngine = Engine;

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function() { Engine._boot(); }, 80);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { Engine._boot(); }, 80);
    });
  }

  console.log(
    '%c⚡ %cSpeed Engine v2 %cloaded — %chtml-cache + event-delegation + sync-preload',
    'font-size:14px;', 'font-weight:bold;color:#06b6d4;', 'color:#aaa;', 'color:#888;'
  );
})();
