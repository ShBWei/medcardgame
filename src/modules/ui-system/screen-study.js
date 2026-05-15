/**
 * MediCard 医途刷题工坊 — Standalone Study Module
 * Pure single-player question practice. No cards, no battle.
 * Reuses QuestionLoader, WrongQuestionBook, Crypto utilities.
 * 4 healing themes with ambient animations.
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenStudy = {
    // ── State ──
    _currentSubject: null,
    _questions: [],
    _questionIndex: 0,
    _sessionCorrect: 0,
    _sessionAnswered: 0,
    _sessionWrongIds: [],
    _answered: false,
    _timerOn: false,
    _timerRemaining: 0,
    _timerInterval: null,
    _theme: 'forest',

    // ── Public API ──

    render: function() {
      this._loadedMap = {}; // reset for fresh preload check
      this._loadTheme();
      this._loadSubjectProgress();
      var screen = document.getElementById('screen-study');
      if (!screen) return;
      screen.className = 'screen active study-theme-' + this._theme;

      var self = this;
      var meta = MediCard.Config.subjectMeta || {};
      var subjects = MediCard.Config.subjectCategories[0].subjects;

      var totalAnswered = 0;
      var totalCorrect = 0;
      var totalQuestions = 0;
      for (var s = 0; s < subjects.length; s++) {
        var prog = this._progress[subjects[s]] || { answered: 0, correct: 0 };
        totalAnswered += prog.answered;
        totalCorrect += prog.correct;
        totalQuestions += (meta[subjects[s]] && meta[subjects[s]].questionCount) || 0;
      }

      var statsHtml = '' +
        '<div class="study-stats-bar">' +
          '<div class="study-stat-chip">' +
            '<div class="study-stat-chip-value">' + totalAnswered + '</div>' +
            '<div class="study-stat-chip-label">已答</div>' +
          '</div>' +
          '<div class="study-stat-chip">' +
            '<div class="study-stat-chip-value">' + (totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0) + '%</div>' +
            '<div class="study-stat-chip-label">正确率</div>' +
          '</div>' +
          '<div class="study-stat-chip">' +
            '<div class="study-stat-chip-value">' + totalQuestions + '</div>' +
            '<div class="study-stat-chip-label">总题量</div>' +
          '</div>' +
        '</div>';

      // Build grid — check which subjects are already cached (instant) vs need loading
      var loadedCount = 0;
      var gridHtml = '';
      for (var i = 0; i < subjects.length; i++) {
        var subj = subjects[i];
        var m = meta[subj] || {};
        var prog = this._progress[subj] || { answered: 0, correct: 0 };
        var pct = m.questionCount ? Math.round(prog.answered / m.questionCount * 100) : 0;
        var isLoaded = this._isSubjectLoaded(subj);
        if (isLoaded) loadedCount++;
        gridHtml += this._renderSubjectCard(subj, m, prog, pct, isLoaded);
      }

      var wrongCount = MediCard.WrongQuestionBook ? MediCard.WrongQuestionBook.getCount('wrong') : 0;
      var loadStatusHtml = loadedCount < subjects.length
        ? '<div id="study-load-status" style="text-align:center;font-size:11px;color:var(--study-text-muted);margin-bottom:6px;">题库加载中 ' + loadedCount + '/' + subjects.length + ' <span class="study-loading-dot"></span><span class="study-loading-dot"></span><span class="study-loading-dot"></span></div>'
        : '';

      var html = '' +
        '<div class="study-particles" id="study-particles">' +
          '<div class="study-cloud"></div><div class="study-cloud"></div><div class="study-cloud"></div><div class="study-cloud"></div><div class="study-cloud"></div>' +
          '<div class="study-leaf"></div><div class="study-leaf"></div><div class="study-leaf"></div><div class="study-leaf"></div><div class="study-leaf"></div><div class="study-leaf"></div><div class="study-leaf"></div>' +
          '<div class="study-halo"></div>' +
        '</div>' +
        '<div class="study-container" id="study-container">' +
          '<div class="study-header">' +
            '<div class="study-header-left">' +
              '<button class="study-back-btn" id="study-back" title="返回">←</button>' +
              '<span class="study-title">📖 医途刷题工坊</span>' +
            '</div>' +
            '<div class="study-header-right">' +
              '<button class="study-header-btn" id="study-theme-btn" title="切换主题">🎨</button>' +
              (wrongCount > 0 ? '<button class="study-header-btn" id="study-wrong-btn" title="错题本(' + wrongCount + '题)">📝</button>' : '') +
            '</div>' +
          '</div>' +
          '<div id="study-main-area">' +
            loadStatusHtml +
            statsHtml +
            '<div class="study-subject-grid" id="study-subject-grid">' + gridHtml + '</div>' +
          '</div>' +
        '</div>';

      screen.innerHTML = html;

      var existingParticles = document.querySelectorAll('.study-light-particle');
      for (var ep = 0; ep < existingParticles.length; ep++) existingParticles[ep].remove();

      this._attachSubjectEvents();
      this._attachHeaderEvents();
      this._spawnLightParticles();

      // Preload all subjects in parallel (uses localStorage cache when available — instant)
      this._preloadAllSubjects(subjects);
    },

    /** Check if a subject's questions are already loaded in memory */
    _isSubjectLoaded: function(subjectId) {
      var loader = MediCard.QuestionLoader;
      if (!loader) return false;
      var qs = loader.getSubject(subjectId);
      return qs && qs.length > 0;
    },

    /** Render a single subject card (used for initial render + incremental updates) */
    _renderSubjectCard: function(subj, m, prog, pct, isLoaded) {
      if (!m) m = (MediCard.Config.subjectMeta || {})[subj] || {};
      if (!prog) prog = { answered: 0, correct: 0 };
      if (!pct && pct !== 0) pct = m.questionCount ? Math.round(prog.answered / m.questionCount * 100) : 0;
      if (isLoaded === undefined) isLoaded = this._isSubjectLoaded(subj);
      return '' +
        '<div class="study-subject-card' + (isLoaded ? '' : ' study-subject-loading') + '" data-subject="' + _esc(subj) + '">' +
          '<span class="study-subject-icon">' + (m.icon || '📚') + '</span>' +
          '<div class="study-subject-name">' + (m.name || subj) + '</div>' +
          '<div class="study-subject-count">' +
            (isLoaded
              ? ((m.questionCount || 0) + '题 · 已答' + prog.answered + ' · 正确率' + (prog.answered > 0 ? Math.round(prog.correct / prog.answered * 100) : 0) + '%')
              : '加载中...') +
          '</div>' +
          '<div class="study-subject-progress"><div class="study-subject-progress-fill" style="width:' + pct + '%;"></div></div>' +
        '</div>';
    },

    /** Preload all subjects in parallel. Cached subjects appear instantly. */
    _preloadAllSubjects: function(subjects) {
      var self = this;
      var loader = MediCard.QuestionLoader;
      if (!loader) return;

      var pending = 0;
      for (var i = 0; i < subjects.length; i++) {
        var subj = subjects[i];
        if (this._isSubjectLoaded(subj)) continue; // already in memory
        pending++;
        // loadSubject triggers lazy fetch + localStorage cache
        loader.loadSubject(subj);
      }

      if (pending === 0) {
        // All cached — remove loading indicator immediately
        var statusEl = document.getElementById('study-load-status');
        if (statusEl) statusEl.style.display = 'none';
        return;
      }

      // Poll until all subjects are loaded, updating the grid as each arrives
      var checkInterval = setInterval(function() {
        var stillPending = 0;
        var newlyLoaded = [];
        for (var j = 0; j < subjects.length; j++) {
          var subj = subjects[j];
          if (!self._isSubjectLoaded(subj)) {
            stillPending++;
          } else if (!self._loadedMap[subj]) {
            self._loadedMap[subj] = true;
            newlyLoaded.push(subj);
          }
        }

        // Update cards that just finished loading
        for (var k = 0; k < newlyLoaded.length; k++) {
          self._updateSubjectCard(newlyLoaded[k]);
        }

        var statusEl = document.getElementById('study-load-status');
        if (stillPending === 0) {
          clearInterval(checkInterval);
          if (statusEl) statusEl.style.display = 'none';
        } else if (statusEl) {
          var loadedNow = subjects.length - stillPending;
          statusEl.innerHTML = '题库加载中 ' + loadedNow + '/' + subjects.length + ' <span class="study-loading-dot"></span><span class="study-loading-dot"></span><span class="study-loading-dot"></span>';
        }
      }, 150);
    },

    /** Update a single subject card in-place once its data has loaded */
    _updateSubjectCard: function(subjectId) {
      var card = document.querySelector('.study-subject-card[data-subject="' + _esc(subjectId) + '"]');
      if (!card) return;
      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[subjectId] || {};
      var prog = this._progress[subjectId] || { answered: 0, correct: 0 };
      var pct = m.questionCount ? Math.round(prog.answered / m.questionCount * 100) : 0;
      card.classList.remove('study-subject-loading');
      card.innerHTML = '' +
        '<span class="study-subject-icon">' + (m.icon || '📚') + '</span>' +
        '<div class="study-subject-name">' + (m.name || subjectId) + '</div>' +
        '<div class="study-subject-count">' + (m.questionCount || 0) + '题 · 已答' + prog.answered + ' · 正确率' + (prog.answered > 0 ? Math.round(prog.correct / prog.answered * 100) : 0) + '%</div>' +
        '<div class="study-subject-progress"><div class="study-subject-progress-fill" style="width:' + pct + '%;"></div></div>';
      // Re-attach click handler
      var self = this;
      card.addEventListener('click', function() {
        self.startSubject(subjectId);
      });
    },

    _loadedMap: {}, // tracks which subjects we know are loaded (avoids redundant card updates)

    /** Enter question session for a subject */
    startSubject: function(subjectId) {
      var self = this;
      this._currentSubject = subjectId;
      this._questionIndex = 0;
      this._sessionCorrect = 0;
      this._sessionAnswered = 0;
      this._sessionWrongIds = [];
      this._answered = false;
      this._timerOn = false;
      this._stopTimer();

      var questions = MediCard.QuestionLoader.getSubject(subjectId);
      if (questions && questions.length > 0) {
        this._questions = this._shuffleQuestions(questions);
        this._questionIndex = this._getSavedIndex(subjectId);
        this._renderQuestion();
        return;
      }

      // Subject not loaded yet — show loading and wait
      this._showLoading();
      MediCard.QuestionLoader.onReady(function() {
        var qs = MediCard.QuestionLoader.getSubject(subjectId);
        if (qs && qs.length > 0) {
          self._questions = self._shuffleQuestions(qs);
          self._questionIndex = self._getSavedIndex(subjectId);
          self._renderQuestion();
        } else {
          // Still not available — show error
          document.getElementById('study-main-area').innerHTML = '' +
            '<div class="study-empty">' +
              '<div class="study-empty-icon">⚠️</div>' +
              '<p>题库加载失败，请返回重试</p>' +
              '<button class="study-action-btn primary" id="study-back-subjects">← 返回</button>' +
            '</div>';
          var backBtn = document.getElementById('study-back-subjects');
          if (backBtn) backBtn.addEventListener('click', function() { self.goBack(); });
        }
      });
      // Also trigger loading just in case
      MediCard.QuestionLoader.loadSubject(subjectId);
    },

    /** Go back to subject list */
    goBack: function() {
      this._stopTimer();
      this._currentSubject = null;
      this._questions = [];
      this._answered = false;
      this.render();
    },

    // ── Progress persistence ──

    _progress: {},

    _loadSubjectProgress: function() {
      try {
        var raw = localStorage.getItem('medicard_study_progress');
        if (raw) this._progress = JSON.parse(raw);
      } catch(e) { this._progress = {}; }
      if (!this._progress || typeof this._progress !== 'object') this._progress = {};
    },

    _saveSubjectProgress: function() {
      try {
        localStorage.setItem('medicard_study_progress', JSON.stringify(this._progress));
      } catch(e) {}
      // Also sync to server
      this._syncProgressToServer();
    },

    _syncProgressToServer: function() {
      try {
        var Storage = MediCard.Storage;
        if (!Storage) return;
        var userId = Storage.getCurrentUserId();
        if (!userId) return;
        var data = {
          userId: userId,
          studyProgress: this._progress
        };
        fetch('/api/study-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(function() {});
      } catch(e) {}
    },

    _restoreProgressFromServer: function(callback) {
      var self = this;
      var userId = MediCard.Storage ? MediCard.Storage.getCurrentUserId() : null;
      if (!userId) { if (callback) callback(); return; }
      try {
        fetch('/api/study-progress?userId=' + encodeURIComponent(userId))
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.ok && data.studyProgress) {
              // Merge server progress (takes precedence for answered count)
              var serverProg = data.studyProgress;
              var localProg = self._progress || {};
              var subjects = MediCard.Config.subjectCategories[0].subjects;
              for (var s = 0; s < subjects.length; s++) {
                var subj = subjects[s];
                if (serverProg[subj]) {
                  localProg[subj] = serverProg[subj];
                }
              }
              self._progress = localProg;
              self._saveSubjectProgress();
            }
            if (callback) callback();
          })
          .catch(function() { if (callback) callback(); });
      } catch(e) { if (callback) callback(); }
    },

    _getSavedIndex: function(subjectId) {
      var prog = this._progress[subjectId];
      return prog ? (prog.index || 0) : 0;
    },

    _recordAnswer: function(correct) {
      var subj = this._currentSubject;
      if (!this._progress[subj]) {
        this._progress[subj] = { answered: 0, correct: 0, index: 0 };
      }
      this._progress[subj].answered++;
      if (correct) this._progress[subj].correct++;
      this._progress[subj].index = this._questionIndex + 1;
      if (this._progress[subj].index >= this._questions.length) {
        this._progress[subj].index = 0; // wrap around
      }
      this._saveSubjectProgress();
    },

    // ── Theme ──

    _loadTheme: function() {
      try {
        var t = localStorage.getItem('medicard_study_theme');
        if (t && ['nightstudy', 'sakura', 'camp', 'catcafe', 'seaside', 'minimal'].indexOf(t) >= 0) {
          this._theme = t;
        }
      } catch(e) { this._theme = 'nightstudy'; }
    },

    _setTheme: function(themeId) {
      this._theme = themeId;
      try { localStorage.setItem('medicard_study_theme', themeId); } catch(e) {}
      var screen = document.getElementById('screen-study');
      if (screen) {
        screen.className = screen.className.replace(/study-theme-\w+/g, '') + ' study-theme-' + themeId;
      }
    },

    _showThemePicker: function() {
      var self = this;
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.zIndex = '5000';

      var themes = [
        { id: 'nightstudy', name: '深夜暖光自习室', desc: '暖黄灯光 · 桌面陪伴', preview: 'nightstudy' },
        { id: 'sakura',     name: '春日樱花庭院',   desc: '粉色柔光 · 花瓣轻舞', preview: 'sakura' },
        { id: 'camp',       name: '星空露营地',     desc: '深蓝夜空 · 篝火噼啪', preview: 'camp' },
        { id: 'catcafe',    name: '猫咪咖啡馆',     desc: '奶油橘色 · 猫咪相伴', preview: 'catcafe' },
        { id: 'seaside',    name: '海边日落',       desc: '橙红渐变 · 海浪轻拍', preview: 'seaside' },
        { id: 'minimal',    name: '极简白噪音',     desc: '纯白极简 · 专注无声', preview: 'minimal' }
      ];

      var optionsHtml = themes.map(function(t) {
        return '' +
          '<div class="study-theme-option' + (self._theme === t.id ? ' selected' : '') + '" data-theme="' + t.id + '">' +
            '<div class="study-theme-preview ' + t.preview + '"></div>' +
            '<div class="study-theme-name">' + t.name + '</div>' +
            '<div class="study-theme-desc">' + t.desc + '</div>' +
          '</div>';
      }).join('');

      var content = document.createElement('div');
      content.className = 'modal-content';
      content.style.cssText = 'max-width:380px;animation:modalEnter 250ms ease-out;';
      content.innerHTML = '' +
        '<h3 style="margin:0 0 4px;text-align:center;">🎨 切换主题</h3>' +
        '<p style="text-align:center;color:var(--text-muted, #888);font-size:12px;margin-bottom:12px;">选择让你最舒服的视觉风格</p>' +
        '<div class="study-theme-picker">' + optionsHtml + '</div>' +
        '<button class="btn btn-ghost btn-sm" id="theme-picker-close" style="display:block;margin:12px auto 0;">关闭</button>';

      overlay.appendChild(content);
      document.body.appendChild(overlay);

      content.querySelectorAll('.study-theme-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          var themeId = this.getAttribute('data-theme');
          self._setTheme(themeId);
          overlay.remove();
        });
      });

      document.getElementById('theme-picker-close').addEventListener('click', function() { overlay.remove(); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    },

    // ── Question rendering ──

    _renderQuestion: function() {
      if (!this._questions.length || this._questionIndex >= this._questions.length) {
        this._showSessionSummary();
        return;
      }

      this._answered = false;
      this._stopTimer();
      var q = this._questions[this._questionIndex];

      // Randomize options
      var rawOpts = q.options || q.opts || [];
      var correctRaw = q.correctAnswers || q.ans || [];
      var parsedOptions = this._parseOptions(rawOpts, correctRaw);
      var shuffled = this._shuffleOptions(parsedOptions);

      var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      this._currentShuffled = shuffled.map(function(opt, idx) {
        return { letter: labels.charAt(idx), text: opt.text, isCorrect: opt.isCorrect };
      });

      var total = this._questions.length;
      var idx = this._questionIndex;
      var pct = Math.round(idx / total * 100);

      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[this._currentSubject] || {};
      var subjectName = m.name || this._currentSubject;

      var qId = q.id || (this._currentSubject + '_' + idx);
      var isBookmarked = MediCard.WrongQuestionBook && MediCard.WrongQuestionBook.isBookmarked(qId);

      var html = '' +
        '<div class="study-question-area">' +
          '<div class="study-question-header">' +
            '<span class="study-question-num">' + subjectName + ' · 第' + (idx + 1) + '/' + total + '题</span>' +
            '<span>' + (q.difficulty === 'rare' ? '🔷' : q.difficulty === 'epic' ? '💎' : '') + '</span>' +
          '</div>' +
          '<div class="study-question-progress-bar"><div class="study-question-progress-fill" style="width:' + pct + '%;"></div></div>' +
          (this._timerOn ? '<div style="text-align:center;font-size:18px;font-weight:700;color:var(--study-accent);margin-bottom:8px;" id="study-timer-display">30</div>' : '') +
          '<div class="study-question-card">' +
            '<div class="study-question-text">' + _esc(q.question || q.q || '') + '</div>' +
            (q.knowledgePoint || q.kp ? '<div class="study-question-meta">📖 ' + _esc(q.knowledgePoint || q.kp) + '</div>' : '') +
          '</div>' +
          '<div class="study-options" id="study-options">' +
            this._currentShuffled.map(function(opt) {
              return '<button class="study-option-btn" data-letter="' + opt.letter + '">' +
                '<span class="study-option-letter">' + opt.letter + '</span>' +
                _esc(opt.text) +
                '</button>';
            }).join('') +
          '</div>' +
          '<div id="study-feedback-area"></div>' +
          '<div class="study-toolbar">' +
            '<button class="study-toolbar-btn' + (isBookmarked ? ' bookmarked' : '') + '" id="study-bookmark-btn">' + (isBookmarked ? '⭐ 已收藏' : '☆ 收藏') + '</button>' +
            '<button class="study-toolbar-btn" id="study-flag-btn">🚩 质疑</button>' +
            '<button class="study-toolbar-btn" id="study-skip-btn">⏭ 跳过</button>' +
          '</div>' +
        '</div>';

      document.getElementById('study-main-area').innerHTML = html;

      this._attachQuestionEvents(qId, q);
      this._updateHeaderForQuestion();

      if (this._timerOn) {
        this._startTimer(30);
      }
    },

    _attachQuestionEvents: function(qId, q) {
      var self = this;

      // Option clicks
      var optBtns = document.querySelectorAll('#study-options .study-option-btn');
      for (var i = 0; i < optBtns.length; i++) {
        optBtns[i].addEventListener('click', function() {
          if (self._answered) return;
          self._answered = true;
          self._stopTimer();
          var letter = this.getAttribute('data-letter');
          self._handleAnswer(letter, qId, q);
        });
      }

      // Bookmark
      var bmBtn = document.getElementById('study-bookmark-btn');
      if (bmBtn && MediCard.WrongQuestionBook) {
        bmBtn.addEventListener('click', function() {
          var nowBm = MediCard.WrongQuestionBook.toggleBookmark(qId);
          bmBtn.textContent = nowBm ? '⭐ 已收藏' : '☆ 收藏';
          if (nowBm) { bmBtn.classList.add('bookmarked'); }
          else { bmBtn.classList.remove('bookmarked'); }
        });
      }

      // Flag
      var flagBtn = document.getElementById('study-flag-btn');
      if (flagBtn) {
        flagBtn.addEventListener('click', function() {
          // Use community flag if available, otherwise just mark
          self._flagQuestion(qId);
          flagBtn.classList.add('flagged');
          flagBtn.textContent = '✅ 已质疑';
          flagBtn.disabled = true;
        });
      }

      // Skip
      var skipBtn = document.getElementById('study-skip-btn');
      if (skipBtn) {
        skipBtn.addEventListener('click', function() {
          if (self._answered) return;
          self._stopTimer();
          self._sessionAnswered++;
          self._recordAnswer(false);
          self._questionIndex++;
          self._renderQuestion();
        });
      }
    },

    _handleAnswer: function(letter, qId, q) {
      var self = this;
      this._sessionAnswered++;

      var correctLetters = this._currentShuffled
        .filter(function(o) { return o.isCorrect; })
        .map(function(o) { return o.letter; });

      var isCorrect = correctLetters.indexOf(letter) >= 0;

      if (isCorrect) {
        this._sessionCorrect++;
      } else {
        this._sessionWrongIds.push(qId);
        // Add to wrong question book
        if (MediCard.WrongQuestionBook) {
          MediCard.WrongQuestionBook.addWrong(qId);
        }
      }

      this._recordAnswer(isCorrect);

      // Highlight options
      var optBtns = document.querySelectorAll('#study-options .study-option-btn');
      for (var i = 0; i < optBtns.length; i++) {
        optBtns[i].disabled = true;
        var btnLetter = optBtns[i].getAttribute('data-letter');
        if (correctLetters.indexOf(btnLetter) >= 0) {
          optBtns[i].classList.add('correct');
        } else if (btnLetter === letter) {
          optBtns[i].classList.add('wrong');
        }
      }

      // Show feedback
      var fbArea = document.getElementById('study-feedback-area');
      if (fbArea) {
        var fbHtml = '<div class="study-feedback ' + (isCorrect ? 'correct-fb' : 'wrong-fb') + '">';
        if (isCorrect) {
          fbHtml += '✅ 回答正确！';
        } else {
          fbHtml += '❌ 回答错误！正确答案：<strong>' + correctLetters.join(', ') + '</strong>';
        }
        fbHtml += '</div>';

        // Explanation
        var exp = q.explanation || q.exp;
        var ref = q.textbookReference || q.ref;
        if (exp || ref) {
          fbHtml += '<div class="study-explanation">';
          if (exp) fbHtml += '💡 ' + _esc(exp);
          if (exp && ref) fbHtml += '<br>';
          if (ref) fbHtml += '📚 参考：' + _esc(ref);
          fbHtml += '</div>';
        }

        fbHtml += '<button class="study-continue-btn" id="study-continue-btn">' +
          (this._questionIndex + 1 >= this._questions.length ? '完成 · 查看总结 →' : '下一题 →') +
          '</button>';

        fbArea.innerHTML = fbHtml;

        var contBtn = document.getElementById('study-continue-btn');
        if (contBtn) {
          contBtn.addEventListener('click', function() {
            self._questionIndex++;
            self._renderQuestion();
          });
        }
      }

      // Play audio feedback
      if (MediCard.Audio) {
        isCorrect ? MediCard.Audio.playCorrect() : MediCard.Audio.playWrong();
      }
    },

    // ── Session summary ──

    _showSessionSummary: function() {
      this._stopTimer();
      var total = this._sessionAnswered;
      var correct = this._sessionCorrect;
      var pct = total > 0 ? Math.round(correct / total * 100) : 0;

      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[this._currentSubject] || {};
      var subjectName = m.name || this._currentSubject;

      var icon = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📚';
      var msg = pct >= 90 ? '太棒了！知识掌握扎实！' :
                pct >= 70 ? '很好！继续加油！' :
                pct >= 50 ? '还不错，多复习错题哦~' :
                '别灰心，每次刷题都是进步！';

      var newWrongCount = this._sessionWrongIds.length;
      var totalWrongCount = MediCard.WrongQuestionBook ? MediCard.WrongQuestionBook.getCount('wrong') : 0;

      var html = '' +
        '<div class="study-summary">' +
          '<div class="study-summary-icon">' + icon + '</div>' +
          '<div class="study-summary-title">' + subjectName + ' · 本轮完成</div>' +
          '<p style="color:var(--study-text-secondary);font-size:14px;margin:4px 0 16px;">' + msg + '</p>' +
          '<div class="study-summary-stats">' +
            '<div class="study-summary-stat">' +
              '<div class="study-stat-value">' + correct + ' / ' + total + '</div>' +
              '<div class="study-stat-label">正确 / 总题数</div>' +
            '</div>' +
            '<div class="study-summary-stat">' +
              '<div class="study-stat-value">' + pct + '%</div>' +
              '<div class="study-stat-label">正确率</div>' +
            '</div>' +
            '<div class="study-summary-stat">' +
              '<div class="study-stat-value">' + (newWrongCount > 0 ? '+' + newWrongCount : '0') + '</div>' +
              '<div class="study-stat-label">新增错题（总计' + totalWrongCount + '）</div>' +
            '</div>' +
          '</div>' +
          '<div class="study-summary-actions">' +
            '<button class="study-action-btn primary" id="study-retry">🔄 重新刷题</button>' +
            '<button class="study-action-btn primary" id="study-continue">▶ 继续未答</button>' +
            (newWrongCount > 0
              ? '<button class="study-action-btn" id="study-review-wrong">📝 复习错题(' + newWrongCount + ')</button>'
              : '') +
            '<button class="study-action-btn" id="study-back-subjects">📚 换科目</button>' +
          '</div>' +
        '</div>';

      document.getElementById('study-main-area').innerHTML = html;
      this._updateHeaderForSummary();
      this._attachSummaryEvents();
    },

    _attachSummaryEvents: function() {
      var self = this;

      var retryBtn = document.getElementById('study-retry');
      var continueBtn = document.getElementById('study-continue');
      var reviewWrongBtn = document.getElementById('study-review-wrong');
      var backBtn = document.getElementById('study-back-subjects');

      if (retryBtn) retryBtn.addEventListener('click', function() {
        self._questions = self._shuffleQuestions(self._questions);
        self._questionIndex = 0;
        self._sessionCorrect = 0;
        self._sessionAnswered = 0;
        self._sessionWrongIds = [];
        self._renderQuestion();
      });

      if (continueBtn) continueBtn.addEventListener('click', function() {
        // Resume from where they left off
        self._questionIndex = self._getSavedIndex(self._currentSubject);
        self._sessionCorrect = 0;
        self._sessionAnswered = 0;
        self._sessionWrongIds = [];
        self._renderQuestion();
      });

      if (reviewWrongBtn) reviewWrongBtn.addEventListener('click', function() {
        // Create a mini-session from wrong answers this session
        var wrongQs = [];
        for (var i = 0; i < self._sessionWrongIds.length; i++) {
          var q = self._findQuestionById(self._sessionWrongIds[i]);
          if (q) wrongQs.push(q);
        }
        if (wrongQs.length > 0) {
          self._questions = wrongQs;
          self._questionIndex = 0;
          self._sessionCorrect = 0;
          self._sessionAnswered = 0;
          self._sessionWrongIds = [];
          self._renderQuestion();
        }
      });

      if (backBtn) backBtn.addEventListener('click', function() {
        self.goBack();
      });
    },

    // ── Header state management ──

    _updateHeaderForQuestion: function() {
      var self = this;
      // Change back button behavior to go back to subject list
      var backBtn = document.getElementById('study-back');
      if (backBtn) {
        var newBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBtn, backBtn);
        newBtn.addEventListener('click', function() { self.goBack(); });
      }
    },

    _updateHeaderForSummary: function() {
      var self = this;
      var backBtn = document.getElementById('study-back');
      if (backBtn) {
        var newBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBtn, backBtn);
        newBtn.addEventListener('click', function() { self.goBack(); });
      }
    },

    _attachSubjectEvents: function() {
      var self = this;
      var cards = document.querySelectorAll('.study-subject-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', function() {
          var subjectId = this.getAttribute('data-subject');
          if (subjectId) self.startSubject(subjectId);
        });
      }
    },

    _attachHeaderEvents: function() {
      var self = this;

      var backBtn = document.getElementById('study-back');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          MediCard.GameState.goToScreen('title');
        });
      }

      var themeBtn = document.getElementById('study-theme-btn');
      if (themeBtn) {
        themeBtn.addEventListener('click', function() {
          self._showThemePicker();
        });
      }

      var wrongBtn = document.getElementById('study-wrong-btn');
      if (wrongBtn) {
        wrongBtn.addEventListener('click', function() {
          if (window._medicardOpenNotebook) {
            window._medicardOpenNotebook();
          }
        });
      }
    },

    // ── Timer ──

    _startTimer: function(seconds) {
      var self = this;
      this._timerRemaining = seconds;
      this._stopTimer();
      this._timerInterval = setInterval(function() {
        self._timerRemaining--;
        var display = document.getElementById('study-timer-display');
        if (display) {
          display.textContent = self._timerRemaining;
          display.style.color = self._timerRemaining <= 5 ? 'var(--study-wrong)' :
                                self._timerRemaining <= 10 ? '#fbbf24' : 'var(--study-accent)';
        }
        if (self._timerRemaining <= 0) {
          self._stopTimer();
          if (!self._answered) {
            self._answered = true;
            self._sessionAnswered++;
            self._recordAnswer(false);
            var q = self._questions[self._questionIndex];
            var qId = q.id || (self._currentSubject + '_' + self._questionIndex);
            if (MediCard.WrongQuestionBook) MediCard.WrongQuestionBook.addWrong(qId);
            self._sessionWrongIds.push(qId);

            // Show correct answer
            var correctLetters = self._currentShuffled
              .filter(function(o) { return o.isCorrect; })
              .map(function(o) { return o.letter; });

            var optBtns = document.querySelectorAll('#study-options .study-option-btn');
            for (var i = 0; i < optBtns.length; i++) {
              optBtns[i].disabled = true;
              if (correctLetters.indexOf(optBtns[i].getAttribute('data-letter')) >= 0) {
                optBtns[i].classList.add('correct');
              }
            }

            var fbArea = document.getElementById('study-feedback-area');
            if (fbArea) {
              fbArea.innerHTML = '' +
                '<div class="study-feedback wrong-fb">⏰ 时间到！正确答案：<strong>' + correctLetters.join(', ') + '</strong></div>' +
                '<button class="study-continue-btn" id="study-continue-btn">' +
                  (self._questionIndex + 1 >= self._questions.length ? '完成 · 查看总结 →' : '下一题 →') +
                '</button>';
              var contBtn = document.getElementById('study-continue-btn');
              if (contBtn) contBtn.addEventListener('click', function() {
                self._questionIndex++;
                self._renderQuestion();
              });
            }
          }
        }
      }, 1000);
    },

    _stopTimer: function() {
      if (this._timerInterval) {
        clearInterval(this._timerInterval);
        this._timerInterval = null;
      }
    },

    _toggleTimer: function() {
      this._timerOn = !this._timerOn;
      if (this._timerOn && !this._answered && this._currentSubject) {
        this._startTimer(30);
      } else if (!this._timerOn) {
        this._stopTimer();
      }
    },

    // ── Helpers ──

    _parseOptions: function(rawOpts, correctRaw) {
      var correctSet = {};
      for (var i = 0; i < correctRaw.length; i++) {
        correctSet[correctRaw[i]] = true;
        if (typeof correctRaw[i] === 'number') correctSet[String(correctRaw[i])] = true;
      }
      var result = [];
      for (var j = 0; j < rawOpts.length; j++) {
        var optStr = rawOpts[j];
        // Strip leading label if present (e.g. "A. text" or "A、text" or "A text")
        var text = optStr.replace(/^[A-Z][.\s、)]\s*/, '');
        var letter = String.fromCharCode(65 + j); // A, B, C...
        result.push({ letter: letter, text: text, isCorrect: !!correctSet[letter] || !!correctSet[j] || !!correctSet[String(j)] });
      }
      return result;
    },

    _shuffleOptions: function(options) {
      var arr = options.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    },

    _shuffleQuestions: function(questions) {
      var arr = questions.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    },

    _findQuestionById: function(qid) {
      // Search in current subject's question bank
      var questions = MediCard.QuestionLoader.getSubject(this._currentSubject);
      if (questions) {
        for (var i = 0; i < questions.length; i++) {
          if (questions[i].id === qid) return questions[i];
        }
      }
      // Search all loaded subjects
      var allSubjects = MediCard.Config.subjectCategories[0].subjects;
      for (var s = 0; s < allSubjects.length; s++) {
        var qs = MediCard.QuestionLoader.getSubject(allSubjects[s]);
        if (qs) {
          for (var j = 0; j < qs.length; j++) {
            if (qs[j].id === qid) return qs[j];
          }
        }
      }
      return null;
    },

    _flagQuestion: function(qId) {
      if (window.MedicalKillCommunity) {
        window.MedicalKillCommunity.toggleFlag(qId, '答案可能有误');
      }
    },

    _showLoading: function() {
      document.getElementById('study-main-area').innerHTML = '' +
        '<div class="study-loading">' +
          '加载题目中 ' +
          '<span class="study-loading-dot"></span>' +
          '<span class="study-loading-dot"></span>' +
          '<span class="study-loading-dot"></span>' +
        '</div>';
    },

    _spawnLightParticles: function() {
      var container = document.getElementById('study-particles');
      if (!container) return;
      var count = 15;
      for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        particle.className = 'study-light-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (3 + Math.random() * 5) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.width = (2 + Math.random() * 3) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
      }
    }
  };

  /** HTML escape helper (mirrors screen-notebook pattern) */
  function _esc(str) {
    if (!str) return '';
    if (MediCard.Crypto && MediCard.Crypto.escapeHtml) return MediCard.Crypto.escapeHtml(str);
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  console.log('[Study] 医途刷题工坊 module loaded');
})();
