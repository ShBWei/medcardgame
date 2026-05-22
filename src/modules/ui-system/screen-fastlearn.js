/**
 * MediCard FastLearn 快学模式 — UI Module
 * 12 cognitive theories → anti-forgetting science learning system
 * Zero modification to existing study/battle modules
 * Reuses study CSS classes for consistent question display
 */
(function() {
  var MediCard = window.MediCard || {};

  var FL = MediCard.FastLearnCore;
  var Study = MediCard.ScreenStudy || {};

  MediCard.ScreenFastLearn = {
    _view: 'dashboard',     // 'dashboard' | 'subjectSelect' | 'session' | 'report' | 'memory' | 'plan'
    _subjects: [],
    _selectedSubjects: [],
    _limit: 30,
    _sessionQueue: [],
    _sessionIndex: 0,
    _sessionCorrect: 0,
    _sessionAnswered: 0,
    _questionStartTime: 0,
    _answered: false,
    _currentShuffled: null,
    _currentQuestion: null,
    _feynmanCount: 0,

    /* ========================================================================
     * ENTRY: Render current view
     * ======================================================================== */

    render: function() {
      if (!FL) { this._showError('FastLearn 核心引擎未加载'); return; }
      FL.load();
      this._ensureScreen();
      this._loadTheme();
      switch (this._view) {
        case 'dashboard': this._renderDashboard(); break;
        case 'subjectSelect': this._renderSubjectSelect(); break;
        case 'session': this._renderQuestion(); break;
        case 'report': this._renderReport(); break;
        case 'memory': this._renderMemoryBrowser(); break;
        case 'plan': this._renderWeeklyPlan(); break;
        default: this._view = 'dashboard'; this._renderDashboard();
      }
    },

    _ensureScreen: function() {
      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;
      screen.className = 'screen active study-theme-' + (this._theme || 'forest');
    },

    _loadTheme: function() {
      try {
        var t = localStorage.getItem('medicard_study_theme');
        this._theme = t || 'forest';
      } catch(e) { this._theme = 'forest'; }
    },

    /* ========================================================================
     * VIEW: Dashboard
     * ======================================================================== */

    _renderDashboard: function() {
      this._view = 'dashboard';
      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;

      var allSubjects = MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : [];
      var meta = MediCard.Config ? (MediCard.Config.subjectMeta || {}) : {};

      var memKeys = FL._memory ? Object.keys(FL._memory).length : 0;
      var avgLevel = FL._computeAverageLevel ? FL._computeAverageLevel() : 0;
      var dueCount = FL.getDueCount(allSubjects);
      var retention = FL._predictRetention ? FL._predictRetention() : 90;
      var gaps = FL.getKnowledgeGapMap();
      var topGaps = gaps.slice(0, 3);

      var html = '';
      // Back bar
      html += '<div class="fl-back-bar">' +
        '<button class="fl-btn-back-sm" id="fl-back-title">← 返回主页</button>' +
        '</div>';

      // Hero card
      html += '<div class="fl-dashboard">' +
        '<div class="fl-hero-card">' +
          '<div class="fl-hero-icon">🧠</div>' +
          '<h2 class="fl-hero-title">快学模式</h2>' +
          '<p class="fl-hero-sub">基于12项认知科学理论 · 智能间隔重复 · 抗遗忘训练</p>' +
        '</div>';

      // Stats row
      html += '<div class="fl-stats-row">' +
        '<div class="fl-stat-card">' +
          '<div class="fl-stat-value">' + memKeys + '</div>' +
          '<div class="fl-stat-label">记忆条目</div>' +
        '</div>' +
        '<div class="fl-stat-card">' +
          '<div class="fl-stat-value">' + avgLevel + '</div>' +
          '<div class="fl-stat-label">平均等级</div>' +
        '</div>' +
        '<div class="fl-stat-card">' +
          '<div class="fl-stat-value">' + dueCount + '</div>' +
          '<div class="fl-stat-label">待复习</div>' +
        '</div>' +
        '<div class="fl-stat-card">' +
          '<div class="fl-stat-value">' + retention + '%</div>' +
          '<div class="fl-stat-label">预估留存</div>' +
        '</div>' +
      '</div>';

      // Start session button
      html += '<button class="fl-btn-start" id="fl-start-session">' +
        (dueCount > 0 ? '⚡ 开始学习（' + dueCount + '题待复习）' : '🚀 开始新学习会话') +
      '</button>';

      // Quick actions row
      html += '<div style="display:flex;gap:10px;">' +
        '<button class="fl-btn-dashboard" id="fl-view-memory" style="flex:1;padding:10px;font-size:13px;color:var(--s-text2);background:var(--s-surface);border:1px solid var(--s-border);border-radius:var(--s-radius);cursor:pointer;">📊 记忆浏览器</button>' +
        '<button class="fl-btn-dashboard" id="fl-view-plan" style="flex:1;padding:10px;font-size:13px;color:var(--s-text2);background:var(--s-surface);border:1px solid var(--s-border);border-radius:var(--s-radius);cursor:pointer;">📅 7日复习计划</button>' +
      '</div>';

      // Weakest knowledge points
      if (topGaps.length > 0) {
        html += '<div class="fl-report-section">' +
          '<h4>⚠️ 薄弱知识点</h4>';
        for (var i = 0; i < topGaps.length; i++) {
          var g = topGaps[i];
          html += '<div class="fl-weak-point">' +
            '<div class="fl-weak-point-rank">' + (i + 1) + '</div>' +
            '<div class="fl-weak-point-info">' +
              '<div class="fl-weak-point-name">' + _esc(g.knowledgePoint || '未知') + '</div>' +
              '<div class="fl-weak-point-bar-wrap"><div class="fl-weak-point-bar" style="width:' + g.errorRate + '%;"></div></div>' +
            '</div>' +
            '<div class="fl-weak-point-pct">' + g.errorRate + '%</div>' +
          '</div>';
        }
        html += '</div>';
      }

      // Weekly plan preview
      var plan = FL.generateWeeklyPlan(allSubjects.slice(0, 4));
      if (plan) {
        html += '<div class="fl-report-section">' +
          '<h4>📅 本周回顾预览</h4>';
        for (var d = 0; d < Math.min(3, plan.length); d++) {
          var day = plan[d];
          var dayNames = ['今天', '明天', '后天', '3天后', '4天后', '5天后', '6天后'];
          html += '<div class="fl-plan-day">' +
            '<div class="fl-plan-day-header">' +
              '<span class="fl-plan-day-name">' + dayNames[d] + '</span>' +
              '<span class="fl-plan-day-count">' + day.count + ' 题待复习</span>' +
            '</div>' +
            (day.focusKP ? '<div class="fl-plan-day-focus">重点：<strong>' + _esc(day.focusKP) + '</strong></div>' : '') +
          '</div>';
        }
        html += '</div>';
      }

      html += '</div>'; // close fl-dashboard

      screen.innerHTML = html;
      this._attachDashboardEvents();
    },

    _attachDashboardEvents: function() {
      var self = this;
      var back = document.getElementById('fl-back-title');
      var start = document.getElementById('fl-start-session');
      var mem = document.getElementById('fl-view-memory');
      var plan = document.getElementById('fl-view-plan');

      if (back) back.addEventListener('click', function() {
        MediCard.GameState.goToScreen('title');
      });
      if (start) start.addEventListener('click', function() {
        self._view = 'subjectSelect';
        self.render();
      });
      if (mem) mem.addEventListener('click', function() {
        self._view = 'memory';
        self.render();
      });
      if (plan) plan.addEventListener('click', function() {
        self._view = 'plan';
        self.render();
      });
    },

    /* ========================================================================
     * VIEW: Subject Selection
     * ======================================================================== */

    _renderSubjectSelect: function() {
      this._view = 'subjectSelect';
      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;

      var subjects = MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : [];
      var meta = MediCard.Config ? (MediCard.Config.subjectMeta || {}) : {};
      var self = this;

      if (this._selectedSubjects.length === 0) {
        // Default: select all
        this._selectedSubjects = subjects.slice();
      }

      var html = '<div class="fl-back-bar">' +
        '<button class="fl-btn-back-sm" id="fl-back-dash">← 返回</button>' +
        '</div>';

      html += '<div class="fl-subject-select">' +
        '<div class="fl-subject-header">' +
          '<h3>选择学习科目</h3>' +
          '<p>选择要纳入智能调度的科目范围</p>' +
        '</div>';

      // Question limit picker
      html += '<div class="fl-limit-row">' +
        '<label>每轮题量：</label>';
      var limits = [10, 20, 30, 50, 100];
      for (var li = 0; li < limits.length; li++) {
        html += '<span class="fl-limit-pill' + (this._limit === limits[li] ? ' active' : '') + '" data-limit="' + limits[li] + '">' + limits[li] + '题</span>';
      }
      html += '</div>';

      // Subject grid
      html += '<div class="fl-subject-grid">';
      for (var s = 0; s < subjects.length; s++) {
        var subj = subjects[s];
        var m = meta[subj] || {};
        var isSel = this._selectedSubjects.indexOf(subj) >= 0;
        var qCount = m.questionCount || '?';
        html += '<div class="fl-subject-card' + (isSel ? ' selected' : '') + '" data-subject="' + subj + '">' +
          '<div class="fl-subject-card-check"></div>' +
          '<div class="fl-subject-card-name">' + _esc(m.name || subj) + '</div>' +
          '<div class="fl-subject-card-count">' + qCount + ' 题</div>' +
        '</div>';
      }
      html += '</div>';

      // Actions
      html += '<div class="fl-subject-actions">' +
        '<button class="fl-btn-back" id="fl-back-dash2">取消</button>' +
        '<button class="fl-btn-start" id="fl-begin-session" ' + (this._selectedSubjects.length === 0 ? 'disabled' : '') + '>开始智能调度学习</button>' +
      '</div>';

      html += '</div>'; // close fl-subject-select

      screen.innerHTML = html;
      this._attachSubjectSelectEvents();
    },

    _attachSubjectSelectEvents: function() {
      var self = this;
      var back1 = document.getElementById('fl-back-dash');
      var back2 = document.getElementById('fl-back-dash2');
      var begin = document.getElementById('fl-begin-session');

      if (back1) back1.addEventListener('click', function() { self._view = 'dashboard'; self.render(); });
      if (back2) back2.addEventListener('click', function() { self._view = 'dashboard'; self.render(); });
      if (begin) begin.addEventListener('click', function() { self._startSession(); });

      // Limit pills
      var pills = document.querySelectorAll('.fl-limit-pill');
      for (var p = 0; p < pills.length; p++) {
        pills[p].addEventListener('click', function() {
          var lim = parseInt(this.getAttribute('data-limit'));
          self._limit = lim;
          self._renderSubjectSelect();
        });
      }

      // Subject cards
      var cards = document.querySelectorAll('.fl-subject-card');
      for (var c = 0; c < cards.length; c++) {
        cards[c].addEventListener('click', function() {
          var subj = this.getAttribute('data-subject');
          var idx = self._selectedSubjects.indexOf(subj);
          if (idx >= 0) {
            self._selectedSubjects.splice(idx, 1);
          } else {
            self._selectedSubjects.push(subj);
          }
          // Toggle visual without full re-render
          this.classList.toggle('selected');
          var beginBtn = document.getElementById('fl-begin-session');
          if (beginBtn) beginBtn.disabled = self._selectedSubjects.length === 0;
        });
      }
    },

    /* ========================================================================
     * VIEW: Session Flow
     * ======================================================================== */

    _startSession: function() {
      if (this._selectedSubjects.length === 0) return;

      // Load questions if needed
      var self = this;
      var loader = MediCard.QuestionLoader;
      var toLoad = [];
      for (var s = 0; s < this._selectedSubjects.length; s++) {
        var qs = loader.getSubject(this._selectedSubjects[s]);
        if (!qs || !qs.length) toLoad.push(this._selectedSubjects[s]);
      }

      var doStart = function() {
        // Get wrong questions for priority boost
        var wrongIds = [];
        if (MediCard.WrongQuestionBook) {
          var wrongList = MediCard.WrongQuestionBook.getWrongList ? MediCard.WrongQuestionBook.getWrongList() : [];
          for (var w = 0; w < wrongList.length; w++) wrongIds.push(wrongList[w]);
        }

        self._sessionQueue = FL.initSession(self._selectedSubjects, self._limit);
        self._sessionIndex = 0;
        self._sessionCorrect = 0;
        self._sessionAnswered = 0;
        self._questionStartTime = 0;
        self._answered = false;
        self._currentShuffled = null;
        self._currentQuestion = null;
        self._view = 'session';

        if (self._sessionQueue.length === 0) {
          self._showError('所选科目暂无题目数据');
          self._view = 'dashboard';
          self.render();
          return;
        }

        self._renderQuestion();
      };

      if (toLoad.length > 0) {
        // Show loading
        var screen = document.getElementById('screen-fastlearn');
        if (screen) screen.innerHTML = '<div class="fl-loading">⏳ 正在加载题目数据...</div>';
        var loaded = 0;
        for (var l = 0; l < toLoad.length; l++) {
          loader.loadSubject(toLoad[l], function() {
            loaded++;
            if (loaded >= toLoad.length) doStart();
          });
        }
        if (toLoad.length === 0) doStart();
      } else {
        doStart();
      }
    },

    _renderQuestion: function() {
      if (this._sessionIndex >= this._sessionQueue.length) {
        this._showReport();
        return;
      }

      this._answered = false;
      var item = this._sessionQueue[this._sessionIndex];
      var q = item.item ? item.item.question : item.question;
      if (!q) { this._sessionIndex++; this._renderQuestion(); return; }

      this._currentQuestion = { item: item, q: q };

      var rawOpts = q.options || q.opts || [];
      var correctRaw = q.correctAnswers || q.ans || [];
      var parsedOptions = [];
      for (var o = 0; o < rawOpts.length; o++) {
        var opt = rawOpts[o];
        if (typeof opt === 'string') {
          parsedOptions.push({ text: opt, isCorrect: correctRaw.indexOf(o) >= 0 });
        } else {
          parsedOptions.push({ text: opt.text || opt.label || '', isCorrect: !!opt.isCorrect });
        }
      }
      var shuffled = [];
      for (var i = parsedOptions.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = parsedOptions[i]; parsedOptions[i] = parsedOptions[j]; parsedOptions[j] = tmp;
      }
      shuffled = parsedOptions;

      var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      this._currentShuffled = [];
      for (var s = 0; s < shuffled.length; s++) {
        this._currentShuffled.push({ letter: labels.charAt(s), text: shuffled[s].text, isCorrect: shuffled[s].isCorrect });
      }

      var qid = item.qid || q.id || '';
      var kp = q.knowledgePoint || q.kp || '';
      var entry = FL._memory ? FL._memory[qid] : null;
      var memLevel = entry ? entry.level : 0;
      var memCount = entry ? entry.reviewCount : 0;
      var isMulti = q.questionType === 'multiple';
      var total = this._sessionQueue.length;
      var idx = this._sessionIndex;

      // Check vulnerability fix
      var needsVulnFix = kp ? FL.needsVulnerabilityFix(kp, item.subjectId) : false;

      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;

      var html = '';

      // Back bar
      html += '<div class="fl-back-bar">' +
        '<button class="fl-btn-back-sm" id="fl-quit-session">✕ 结束学习</button>' +
        '<span style="flex:1;text-align:center;font-size:13px;color:var(--s-text2);">第 ' + (idx + 1) + '/' + total + ' 题</span>' +
        '<span style="font-size:12px;color:var(--s-accent);">✅ ' + this._sessionCorrect + '/' + this._sessionAnswered + '</span>' +
      '</div>';

      // Progress bar
      var pct = Math.round(idx / total * 100);
      html += '<div class="study-question-progress-bar" style="margin:0 16px 10px;">' +
        '<div class="study-question-progress-fill" style="width:' + pct + '%;"></div></div>';

      // Info bar — memory stats
      html += '<div class="fl-info-bar">' +
        '<div class="fl-info-item"><span class="fl-info-icon">🧠</span><span class="fl-memory-badge l' + memLevel + '">Lv.' + memLevel + '</span></div>' +
        '<div class="fl-info-item"><span class="fl-info-icon">🔄</span>复习 <span class="fl-info-value">' + memCount + '</span> 次</div>' +
        (entry && entry.errorCount > 0 ? '<div class="fl-info-item"><span class="fl-info-icon">❌</span>错误 <span class="fl-info-value">' + entry.errorCount + '</span> 次</div>' : '') +
        (entry && entry.nextReview > 0 ? '<div class="fl-info-item"><span class="fl-info-icon">⏰</span>下次 ' + _formatTime(entry.nextReview) + '</div>' : '') +
        (kp ? '<div class="fl-info-item"><span class="fl-info-icon">📖</span>' + _esc(kp.substring(0, 20)) + '</div>' : '') +
      '</div>';

      // Vulnerability fix banner
      if (needsVulnFix) {
        html += '<div class="fl-vuln-banner">' +
          '<span class="fl-vuln-icon">🔴</span>' +
          '<span class="fl-vuln-text">该知识点连续错误，已触发<strong>漏洞修复模式</strong> — 请仔细作答</span>' +
        '</div>';
      }

      // Question area — reuses study CSS classes
      html += '<div style="padding:0 16px;">' +
        (isMulti ? '<div style="text-align:center;font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:8px;padding:6px;background:rgba(251,191,36,0.1);border-radius:6px;border:1px solid rgba(251,191,36,0.25);">⚠️ 多选题 — 选择所有正确答案后提交</div>' : '') +
        '<div class="study-question-card">' +
          '<div class="study-question-text">' + _esc(q.question || q.q || '') + '</div>' +
          (kp ? '<div class="study-question-meta">📖 ' + _esc(kp) + '</div>' : '') +
        '</div>' +
        '<div class="study-options" id="fl-options">';

      for (var optIdx = 0; optIdx < this._currentShuffled.length; optIdx++) {
        var opt = this._currentShuffled[optIdx];
        html += '<button class="study-option-btn" data-letter="' + opt.letter + '">' +
          '<span class="study-option-letter">' + opt.letter + '</span>' +
          _esc(opt.text) +
          '</button>';
      }

      html += '</div>' +
        (isMulti ? '<div style="text-align:center;margin-top:10px;"><button class="study-continue-btn" id="fl-multi-submit" style="display:none;min-width:200px;">提交答案</button></div>' : '') +
        '<div id="fl-feedback-area"></div>' +
      '</div>';

      screen.innerHTML = html;
      this._questionStartTime = Date.now();
      this._attachQuestionEvents(qid, q, isMulti);
    },

    _attachQuestionEvents: function(qid, q, isMulti) {
      var self = this;
      var selected = {};

      var optBtns = document.querySelectorAll('#fl-options .study-option-btn');
      for (var i = 0; i < optBtns.length; i++) {
        optBtns[i].addEventListener('click', function() {
          if (self._answered) return;
          var letter = this.getAttribute('data-letter');

          if (isMulti) {
            if (selected[letter]) {
              delete selected[letter];
              this.classList.remove('study-option-selected');
              this.style.background = '';
              this.style.borderColor = '';
            } else {
              selected[letter] = true;
              this.classList.add('study-option-selected');
              this.style.background = 'rgba(6,182,212,0.2)';
              this.style.borderColor = '#06b6d4';
            }
            var count = Object.keys(selected).length;
            var submitBtn = document.getElementById('fl-multi-submit');
            if (submitBtn) {
              submitBtn.style.display = count > 0 ? '' : 'none';
              submitBtn.textContent = '提交答案（已选' + count + '项）';
            }
          } else {
            self._answered = true;
            self._handleAnswer([letter], qid, q, isMulti);
          }
        });
      }

      if (isMulti) {
        var submitBtn = document.getElementById('fl-multi-submit');
        if (submitBtn) {
          submitBtn.addEventListener('click', function() {
            if (self._answered) return;
            self._answered = true;
            var sels = Object.keys(selected);
            self._handleAnswer(sels, qid, q, isMulti);
          });
        }
      }

      var quitBtn = document.getElementById('fl-quit-session');
      if (quitBtn) {
        quitBtn.addEventListener('click', function() {
          if (confirm('确定要结束当前学习吗？进度将保存。')) {
            FL.save();
            self._view = 'dashboard';
            self.render();
          }
        });
      }
    },

    _handleAnswer: function(selectedLetters, qid, q, isMulti) {
      var self = this;
      this._sessionAnswered++;

      if (typeof selectedLetters === 'string') selectedLetters = [selectedLetters];
      if (!Array.isArray(selectedLetters)) selectedLetters = [];

      var correctLetters = [];
      for (var c = 0; c < this._currentShuffled.length; c++) {
        if (this._currentShuffled[c].isCorrect) correctLetters.push(this._currentShuffled[c].letter);
      }

      var isCorrect;
      if (isMulti) {
        var correctSet = {};
        for (var cs = 0; cs < correctLetters.length; cs++) correctSet[correctLetters[cs]] = true;
        var selectedSet = {};
        for (var ss = 0; ss < selectedLetters.length; ss++) selectedSet[selectedLetters[ss]] = true;
        var allOK = true;
        for (var sl = 0; sl < selectedLetters.length; sl++) {
          if (!correctSet[selectedLetters[sl]]) { allOK = false; break; }
        }
        isCorrect = allOK && selectedLetters.length === correctLetters.length;
      } else {
        isCorrect = correctLetters.indexOf(selectedLetters[0]) >= 0;
      }

      if (isCorrect) this._sessionCorrect++;

      // Record timing
      var elapsed = this._questionStartTime > 0 ? Date.now() - this._questionStartTime : 0;

      // Update FastLearn memory and get analysis
      var errorGene = null;
      if (!isCorrect) {
        var userStr = selectedLetters.sort().join(',');
        var correctStr = correctLetters.sort().join(',');
        var analysis = FL.analyzeError(qid, userStr, correctStr, q);
        errorGene = analysis.genes[0] || 'other';
      }

      // Record in FastLearn core
      var result = FL.recordSessionAnswer(qid, isCorrect, elapsed, q);

      // Highlight options
      var optBtns = document.querySelectorAll('#fl-options .study-option-btn');
      for (var i = 0; i < optBtns.length; i++) {
        optBtns[i].disabled = true;
        var btnLetter = optBtns[i].getAttribute('data-letter');
        if (correctLetters.indexOf(btnLetter) >= 0) {
          optBtns[i].classList.add('correct');
        }
        if (selectedLetters.indexOf(btnLetter) >= 0 && correctLetters.indexOf(btnLetter) < 0) {
          optBtns[i].classList.add('wrong');
        }
      }

      // Build feedback
      var fbArea = document.getElementById('fl-feedback-area');
      if (fbArea) {
        var fbHtml = '<div class="study-feedback ' + (isCorrect ? 'correct-fb' : 'wrong-fb') + '">';
        fbHtml += isCorrect ? '✅ 回答正确！' : '❌ 回答错误';
        if (errorGene) {
          var geneNames = { concept_confusion: '概念混淆', knowledge_gap: '知识空白', memory_blur: '记忆模糊', over_selection: '过度选择', logic_error: '逻辑错误', other: '其他' };
          fbHtml += ' <span class="fl-error-gene-tag">' + (geneNames[errorGene] || errorGene) + '</span>';
        }
        fbHtml += '</div>';

        // Answer comparison for wrong answers
        if (!isCorrect) {
          fbHtml += '<div class="study-answer-compare">' +
            '<div class="study-answer-badge your-answer">' +
              '<div class="study-answer-badge-label">你的答案</div>' +
              '<div class="study-answer-badge-value">' + _esc(selectedLetters.sort().join(', ')) + '</div>' +
            '</div>' +
            '<div class="study-answer-badge correct-answer">' +
              '<div class="study-answer-badge-label">正确答案</div>' +
              '<div class="study-answer-badge-value">' + correctLetters.join(', ') + '</div>' +
            '</div>' +
            '</div>';
        }

        // Explanation
        var exp = q.explanation || q.exp || '';
        if (exp) {
          fbHtml += '<div class="study-explanation">' +
            '<span class="study-exp-label">💡 解析</span>' + _esc(exp) + '</div>';
        }

        // Feynman check prompt (every 5 questions, on correct answers)
        self._feynmanCount++;
        if (isCorrect && self._feynmanCount % 5 === 0) {
          fbHtml += '<div style="text-align:center;margin-top:8px;">' +
            '<button class="study-toolbar-btn" id="fl-feynman-btn" style="color:var(--s-accent);">🗣️ 费曼检验 — 用自己的话解释此题</button>' +
            '</div>';
        }

        // Retraining notice
        if (result.needsRetraining) {
          fbHtml += '<div style="text-align:center;margin-top:8px;font-size:13px;color:#f97316;">' +
            '🔄 此错题将在后续重新出现</div>';
        }

        // Continue button
        fbHtml += '<div class="study-nav-buttons">' +
          '<button class="study-continue-btn" id="fl-continue-btn">' +
            (self._sessionIndex + 1 >= self._sessionQueue.length ? '完成 · 查看报告 →' : '下一题 →') +
          '</button>' +
        '</div>';

        fbArea.innerHTML = fbHtml;

        // Feynman button
        var feynBtn = document.getElementById('fl-feynman-btn');
        if (feynBtn) {
          feynBtn.addEventListener('click', function() {
            self._showFeynmanCheck(q);
          });
        }

        // Continue button
        var contBtn = document.getElementById('fl-continue-btn');
        if (contBtn) {
          contBtn.addEventListener('click', function() {
            FL.advanceQuestion();
            self._sessionIndex++;
            self._renderQuestion();
          });
        }
      }

      // Audio feedback
      if (MediCard.Audio) {
        isCorrect ? MediCard.Audio.playCorrect() : MediCard.Audio.playWrong();
      }
    },

    /* ========================================================================
     * Feynman Check Overlay
     * ======================================================================== */

    _showFeynmanCheck: function(q) {
      var self = this;
      var kp = q.knowledgePoint || q.kp || '';

      var overlay = document.createElement('div');
      overlay.className = 'fl-feynman-overlay';
      overlay.innerHTML = '<div class="fl-feynman-card">' +
        '<h4>🗣️ 费曼检验法</h4>' +
        '<p>假装你在给同学讲解这道题涉及的知识点<br><strong>' + _esc(kp || '此题') + '</strong><br>用自己的话把核心概念写下来（2-3句话即可）</p>' +
        '<textarea class="fl-feynman-textarea" id="fl-feynman-input" placeholder="写下你对这个概念的理解..."></textarea>' +
        '<div class="fl-feynman-actions">' +
          '<button class="fl-feynman-skip" id="fl-feynman-skip">跳过</button>' +
          '<button class="fl-feynman-done" id="fl-feynman-done">完成检验</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(overlay);

      var close = function() { overlay.remove(); };
      overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
      var skipBtn = document.getElementById('fl-feynman-skip');
      var doneBtn = document.getElementById('fl-feynman-done');
      if (skipBtn) skipBtn.addEventListener('click', close);
      if (doneBtn) {
        doneBtn.addEventListener('click', function() {
          var input = document.getElementById('fl-feynman-input');
          if (input && input.value.trim()) {
            // Store Feynman note in memory
            var item = self._sessionQueue[self._sessionIndex];
            var qid = item ? item.qid : '';
            if (qid && FL._memory && FL._memory[qid]) {
              FL._memory[qid].feynmanNote = input.value.trim();
              FL._memory[qid].feynmanTime = Date.now();
              FL._scheduleSave();
            }
          }
          close();
        });
      }
    },

    /* ========================================================================
     * VIEW: Session Report
     * ======================================================================== */

    _showReport: function() {
      FL.save();
      FL.syncToCloud();
      this._view = 'report';
      this.render();
    },

    _renderReport: function() {
      this._view = 'report';
      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;

      var report = FL.generateSessionReport();
      if (!report) {
        this._view = 'dashboard';
        this.render();
        return;
      }

      var total = report.totalAnswered;
      var correct = report.totalCorrect;
      var pct = report.accuracy;
      var grade;
      if (pct >= 90) grade = 'a';
      else if (pct >= 75) grade = 'b';
      else if (pct >= 60) grade = 'c';
      else if (pct >= 40) grade = 'd';
      else grade = 'f';
      var gradeLabels = { a: '优秀', b: '良好', c: '一般', d: '需要加强', f: '继续努力' };

      var html = '';
      html += '<div class="fl-report">';

      // Hero
      html += '<div class="fl-report-hero">' +
        '<div class="fl-report-grade ' + grade + '">' + gradeLabels[grade] + '</div>' +
        '<div class="fl-report-summary">' +
          '完成 <strong>' + total + '</strong> 题 · 正确 <strong>' + correct + '</strong> 题 · 正确率 <strong>' + pct + '%</strong>' +
        '</div>' +
      '</div>';

      // Stats grid
      var totalMin = Math.floor(report.totalTimeMs / 60000);
      var totalSec = Math.floor((report.totalTimeMs % 60000) / 1000);
      html += '<div class="fl-report-stats">' +
        '<div class="fl-report-stat"><div class="fl-report-stat-val">' + report.avgTimeSec + 's</div><div class="fl-report-stat-lbl">平均用时</div></div>' +
        '<div class="fl-report-stat"><div class="fl-report-stat-val">' + report.fastestSec + 's</div><div class="fl-report-stat-lbl">最快</div></div>' +
        '<div class="fl-report-stat"><div class="fl-report-stat-val">' + report.slowestSec + 's</div><div class="fl-report-stat-lbl">最慢</div></div>' +
        '<div class="fl-report-stat"><div class="fl-report-stat-val">' + totalMin + ':' + (totalSec < 10 ? '0' : '') + totalSec + '</div><div class="fl-report-stat-lbl">总用时</div></div>' +
        '<div class="fl-report-stat"><div class="fl-report-stat-val">' + report.averageMemoryLevel + '</div><div class="fl-report-stat-lbl">平均记忆等级</div></div>' +
        '<div class="fl-report-stat"><div class="fl-report-stat-val">' + report.predictedRetention + '%</div><div class="fl-report-stat-lbl">预估留存率</div></div>' +
      '</div>';

      // Learning details
      html += '<div class="fl-report-section">' +
        '<h4>📊 学习详情</h4>' +
        '<div style="font-size:13px;color:var(--s-text2);line-height:1.8;">' +
          '重复训练次数：<strong style="color:var(--s-text);">' + report.retrainings + '</strong><br>' +
          '漏洞修复触发：<strong style="color:var(--s-text);">' + report.vulnerabilityFixes + '</strong><br>' +
          '记忆条目总数：<strong style="color:var(--s-text);">' + (FL._memory ? Object.keys(FL._memory).length : 0) + '</strong>' +
        '</div>' +
      '</div>';

      // Weakest points
      if (report.weakestPoints && report.weakestPoints.length > 0) {
        html += '<div class="fl-report-section">' +
          '<h4>⚠️ 薄弱知识点</h4>';
        for (var i = 0; i < report.weakestPoints.length; i++) {
          var wp = report.weakestPoints[i];
          html += '<div class="fl-weak-point">' +
            '<div class="fl-weak-point-rank">' + (i + 1) + '</div>' +
            '<div class="fl-weak-point-info">' +
              '<div class="fl-weak-point-name">' + _esc(wp.knowledgePoint || wp.kp || '未知') + '</div>' +
              '<div class="fl-weak-point-bar-wrap"><div class="fl-weak-point-bar" style="width:' + Math.min(100, wp.errorRate || 0) + '%;"></div></div>' +
            '</div>' +
            '<div class="fl-weak-point-pct">' + (wp.errorRate || 0) + '%</div>' +
          '</div>';
        }
        html += '</div>';
      }

      // Actions
      html += '<div class="fl-report-actions">' +
        '<button class="fl-btn-dashboard" id="fl-to-dashboard">📊 返回仪表盘</button>' +
        '<button class="fl-btn-start" id="fl-retry-session">🔄 再来一轮</button>' +
      '</div>';

      html += '</div>'; // close fl-report

      screen.innerHTML = html;

      var dashBtn = document.getElementById('fl-to-dashboard');
      var retryBtn = document.getElementById('fl-retry-session');
      var self = this;
      if (dashBtn) dashBtn.addEventListener('click', function() { self._view = 'dashboard'; self.render(); });
      if (retryBtn) retryBtn.addEventListener('click', function() { self._view = 'subjectSelect'; self.render(); });
    },

    /* ========================================================================
     * VIEW: Memory Browser
     * ======================================================================== */

    _renderMemoryBrowser: function() {
      this._view = 'memory';
      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;

      var mem = FL._memory || {};
      var keys = Object.keys(mem);

      // Group by knowledge point
      var grouped = {};
      for (var i = 0; i < keys.length; i++) {
        var e = mem[keys[i]];
        var kp = e.knowledgePoint || '未分类';
        if (!grouped[kp]) grouped[kp] = { entries: [], totalLevel: 0, totalErrors: 0, totalReviews: 0 };
        grouped[kp].entries.push(e);
        grouped[kp].totalLevel += e.level;
        grouped[kp].totalErrors += e.errorCount;
        grouped[kp].totalReviews += e.reviewCount;
      }

      var groupKeys = Object.keys(grouped);
      groupKeys.sort(function(a, b) { return grouped[b].entries.length - grouped[a].entries.length; });

      var html = '';
      html += '<div class="fl-back-bar">' +
        '<button class="fl-btn-back-sm" id="fl-mem-back">← 返回仪表盘</button>' +
        '</div>';

      html += '<div class="fl-memory-browser">' +
        '<div class="fl-memory-header"><h3>📊 记忆浏览器</h3></div>';

      // Level filter pills
      html += '<div class="fl-memory-filter">' +
        '<span class="fl-memory-filter-pill active" data-level="all">全部</span>';
      for (var lv = 0; lv <= 5; lv++) {
        html += '<span class="fl-memory-filter-pill" data-level="' + lv + '">Lv.' + lv + '</span>';
      }
      html += '</div>';

      // Summary
      html += '<div style="font-size:13px;color:var(--s-text2);margin-bottom:12px;">共 <strong style="color:var(--s-text);">' + keys.length + '</strong> 条记忆 · <strong style="color:var(--s-text);">' + groupKeys.length + '</strong> 个知识点</div>';

      // List
      html += '<div class="fl-memory-list" id="fl-memory-list">';
      for (var g = 0; g < groupKeys.length; g++) {
        var grp = grouped[groupKeys[g]];
        var avgLv = (grp.totalLevel / grp.entries.length).toFixed(1);
        html += '<div class="fl-memory-item" data-kp="' + _esc(groupKeys[g]) + '">' +
          '<div class="fl-memory-item-kp">' + _esc(groupKeys[g]) + '</div>' +
          '<div class="fl-memory-item-meta">' +
            '<span class="fl-memory-badge l' + Math.round(parseFloat(avgLv)) + '">Lv.' + avgLv + '</span>' +
            '<span class="fl-memory-item-count">' + grp.entries.length + '题</span>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';
      html += '</div>'; // close fl-memory-browser

      screen.innerHTML = html;

      var self = this;
      var backBtn = document.getElementById('fl-mem-back');
      if (backBtn) backBtn.addEventListener('click', function() { self._view = 'dashboard'; self.render(); });

      // Filter pills
      var pills = document.querySelectorAll('.fl-memory-filter-pill');
      for (var p = 0; p < pills.length; p++) {
        pills[p].addEventListener('click', function() {
          var level = this.getAttribute('data-level');
          // Update active
          var allPills = document.querySelectorAll('.fl-memory-filter-pill');
          for (var ap = 0; ap < allPills.length; ap++) allPills[ap].classList.remove('active');
          this.classList.add('active');
          // Filter items
          var items = document.querySelectorAll('#fl-memory-list .fl-memory-item');
          for (var it = 0; it < items.length; it++) {
            var kpName = items[it].getAttribute('data-kp');
            if (level === 'all') { items[it].style.display = ''; continue; }
            var grpData = grouped[kpName];
            var show = false;
            for (var ei = 0; ei < grpData.entries.length; ei++) {
              if (grpData.entries[ei].level === parseInt(level)) { show = true; break; }
            }
            items[it].style.display = show ? '' : 'none';
          }
        });
      }
    },

    /* ========================================================================
     * VIEW: Weekly Plan
     * ======================================================================== */

    _renderWeeklyPlan: function() {
      this._view = 'plan';
      var screen = document.getElementById('screen-fastlearn');
      if (!screen) return;

      var allSubjects = MediCard.Config ? MediCard.Config.subjectCategories[0].subjects : [];
      var plan = FL.generateWeeklyPlan(allSubjects);
      var dayNames = ['今天', '明天', '后天', '3天后', '4天后', '5天后', '6天后'];
      var dayDates = [];
      var now = Date.now();
      for (var d = 0; d < 7; d++) {
        var dt = new Date(now + d * 24 * 60 * 60 * 1000);
        dayDates.push((dt.getMonth() + 1) + '/' + dt.getDate());
      }

      var html = '';
      html += '<div class="fl-back-bar">' +
        '<button class="fl-btn-back-sm" id="fl-plan-back">← 返回仪表盘</button>' +
        '</div>';

      html += '<div class="fl-weekly-plan">' +
        '<h3>📅 7日复习计划</h3>';

      if (plan) {
        var totalItems = 0;
        for (var d = 0; d < plan.length; d++) totalItems += plan[d].count;

        html += '<div style="font-size:13px;color:var(--s-text2);margin-bottom:14px;">本周共 <strong style="color:var(--s-accent);">' + totalItems + '</strong> 题需要复习</div>';

        for (var d = 0; d < plan.length; d++) {
          var day = plan[d];
          html += '<div class="fl-plan-day">' +
            '<div class="fl-plan-day-header">' +
              '<span class="fl-plan-day-name">' + dayNames[d] + ' (' + dayDates[d] + ')</span>' +
              '<span class="fl-plan-day-count">' + day.count + ' 题</span>' +
            '</div>' +
            (day.focusKP ? '<div class="fl-plan-day-focus">重点攻克：<strong>' + _esc(day.focusKP) + '</strong></div>' : '') +
          '</div>';
        }
      }

      html += '<div style="text-align:center;margin-top:16px;font-size:12px;color:var(--s-text3);">计划基于当前记忆模型生成 · 每日刷新</div>';
      html += '</div>';

      screen.innerHTML = html;

      var self = this;
      var backBtn = document.getElementById('fl-plan-back');
      if (backBtn) backBtn.addEventListener('click', function() { self._view = 'dashboard'; self.render(); });
    },

    /* ========================================================================
     * UTILITY
     * ======================================================================== */

    _showError: function(msg) {
      var screen = document.getElementById('screen-fastlearn');
      if (screen) {
        screen.innerHTML = '<div class="fl-loading" style="color:#ef4444;">⚠️ ' + _esc(msg) + '</div>';
      }
    }
  };

  function _esc(str) {
    if (!str) return '';
    return MediCard.Crypto ? MediCard.Crypto.escapeHtml(String(str)) : String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _formatTime(ts) {
    var diff = ts - Date.now();
    if (diff < 0) return '现在';
    var min = Math.floor(diff / 60000);
    if (min < 60) return min + '分钟';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + '小时';
    return Math.floor(hr / 24) + '天';
  }

  MediCard.ScreenFastLearn = MediCard.ScreenFastLearn;
  window.MediCard = MediCard;

  console.log('[FastLearn] UI module loaded');
})();
