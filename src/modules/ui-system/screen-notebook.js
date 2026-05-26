/**
 * MediCard 医杀 — Wrong Question Notebook (错题本) V2.0
 * View mode: all questions grouped by subject, full detail visible inline.
 * Self-test mode: quiz on wrong questions, auto-remove on correct answer.
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenNotebook = {
    _overlay: null,
    _mode: 'view',       // 'view' | 'test'
    _testQuestions: [],  // shuffled questions for test mode
    _testIndex: 0,
    _testCorrect: 0,
    _testAnswered: 0,
    _testAnsweredIds: [], // correctly answered IDs for deferred removal
    _questionCache: null, // { qid: questionData } — prebuilt for fast lookup

    show: function() {
      this._removeOverlay();
      var self = this;
      this._mode = 'view';
      this._activeTab = 'wrong';

      var totalWrong = MediCard.WrongQuestionBook.getCount('wrong');
      var totalBookmark = MediCard.WrongQuestionBook.getCount('bookmark');
      if (totalWrong === 0 && totalBookmark === 0) {
        this._showEmpty();
        return;
      }

      // Preload cache from already-cached subjects so first render shows data
      this._preloadCache();

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay ntb-overlay';
      overlay.style.zIndex = '4000';
      this._overlay = overlay;

      var content = document.createElement('div');
      content.className = 'ntb-modal';
      content.style.cssText = 'max-width:720px;width:96%;max-height:90vh;overflow-y:auto;animation:modalEnter 250ms ease-out;border-radius:16px;';

      content.innerHTML = this._renderHTML();
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) self.close(); });
      setTimeout(function() {
        self._attachEvents(content);
        self._ensureSubjectsLoaded();
      }, 50);
    },

    /**
     * Progressive subject loading: preload cache from already-loaded subjects
     * immediately, then use onSubjectReady per subject to fill in remaining data.
     * No waiting for ALL subjects — each section updates as its data arrives.
     */
    _ensureSubjectsLoaded: function() {
      var loader = MediCard.QuestionLoader;
      var WB = MediCard.WrongQuestionBook;
      if (!loader || !WB) return;

      var allIds = [];
      var wrongIds = WB.getAll('wrong');
      var bookmarkIds = WB.getAll('bookmark');
      for (var i = 0; i < wrongIds.length; i++) allIds.push(wrongIds[i]);
      for (var j = 0; j < bookmarkIds.length; j++) allIds.push(bookmarkIds[j]);
      if (!allIds.length) return;

      var neededSubjects = {};
      for (var k = 0; k < allIds.length; k++) {
        var subj = WB._subjectFromId(allIds[k]);
        if (subj && subj !== 'unknown') neededSubjects[subj] = true;
      }

      var self = this;
      var subjectList = Object.keys(neededSubjects);

      // Preload cache from subjects that are already in memory
      this._preloadCache();

      // Update sections for already-loaded subjects immediately
      for (var s = 0; s < subjectList.length; s++) {
        var subj = subjectList[s];
        if (loader._loadedSubjects.has(subj)) {
          self._updateSubjectSection(subj);
        }
      }

      // For not-yet-loaded subjects, kick off load + register per-subject callback
      for (var s2 = 0; s2 < subjectList.length; s2++) {
        var subj2 = subjectList[s2];
        if (!loader._loadedSubjects.has(subj2)) {
          loader.loadSubject(subj2);
          (function(subjName) {
            loader.onSubjectReady(subjName, function() {
              self._preloadCache();
              self._updateSubjectSection(subjName);
            });
          })(subj2);
        }
      }
    },

    /**
     * Preload all question data for the current tab into _questionCache.
     * Uses batch lookup (one scan per subject) for speed.
     */
    _preloadCache: function() {
      var WB = MediCard.WrongQuestionBook;
      if (!WB || !WB.getQuestionDataBatch) { this._questionCache = null; return; }
      var tab = this._activeTab || 'wrong';
      var allIds = WB.getAll(tab);
      this._questionCache = WB.getQuestionDataBatch(allIds);
    },

    /**
     * Re-render one subject's section in-place after its data loads.
     * Called by per-subject onSubjectReady callbacks.
     */
    _updateSubjectSection: function(subjName) {
      var section = document.getElementById('ntb-sec-' + subjName);
      if (!section) return;

      var WB = MediCard.WrongQuestionBook;
      var groups = WB.getBySubject(this._activeTab);
      var ids = groups[subjName] || [];

      // Rebuild the section from scratch
      var newHTML = this._renderSubjectSection(subjName, ids);
      var temp = document.createElement('div');
      temp.innerHTML = newHTML;
      var newSection = temp.firstChild;
      if (newSection) {
        section.parentNode.replaceChild(newSection, section);
      }
    },

    _updateTabCounts: function() {
      var content = this._overlay ? this._overlay.querySelector('.ntb-modal') : null;
      if (!content) return;
      var wrongTotal = MediCard.WrongQuestionBook.getCount('wrong');
      var bookmarkTotal = MediCard.WrongQuestionBook.getCount('bookmark');

      var wrongTab = content.querySelector('.ntb-tab-btn[data-tab="wrong"]');
      var bookmarkTab = content.querySelector('.ntb-tab-btn[data-tab="bookmark"]');
      if (wrongTab) wrongTab.innerHTML = '❌ 错题 <span class="ntb-tab-count">' + wrongTotal + '</span>';
      if (bookmarkTab) bookmarkTab.innerHTML = '⭐ 收藏 <span class="ntb-tab-count">' + bookmarkTotal + '</span>';
    },

    close: function() {
      if (this._testAnsweredIds.length > 0) {
        for (var i = 0; i < this._testAnsweredIds.length; i++) {
          MediCard.WrongQuestionBook.deleteEntry('wrong', this._testAnsweredIds[i]);
        }
        this._testAnsweredIds = [];
      }
      this._removeOverlay();
    },

    _removeOverlay: function() {
      if (this._overlay && this._overlay.parentNode) this._overlay.remove();
      this._overlay = null;
    },

    _showEmpty: function() {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay ntb-overlay';
      overlay.style.zIndex = '4000';
      this._overlay = overlay;

      var content = document.createElement('div');
      content.className = 'ntb-modal';
      content.style.cssText = 'max-width:420px;width:90%;animation:modalEnter 250ms ease-out;text-align:center;padding:40px 24px;';

      content.innerHTML = '' +
        '<h3 style="margin:0 0 16px;">📝 错题本</h3>' +
        '<div style="font-size:48px;margin:24px 0;">🎉</div>' +
        '<p style="color:var(--text-secondary);margin-bottom:8px;">错题本空空如也</p>' +
        '<p style="color:var(--text-muted);font-size:12px;">去玩一局游戏，答错的题会自动加入错题本</p>' +
        '<button class="btn btn-ghost btn-sm" id="ntb-close-empty" style="margin-top:16px;">关闭</button>';

      overlay.appendChild(content);
      document.body.appendChild(overlay);

      var self = this;
      overlay.addEventListener('click', function(e) { if (e.target === overlay) self.close(); });
      setTimeout(function() {
        var btn = document.getElementById('ntb-close-empty');
        if (btn) btn.addEventListener('click', function() { self.close(); });
      }, 50);
    },

    // ── HTML Rendering ──────────────────────────────────────────

    _renderHTML: function() {
      var self = this;
      var tab = this._activeTab || 'wrong';
      var groups = MediCard.WrongQuestionBook.getBySubject(tab);
      var totalWrong = MediCard.WrongQuestionBook.getCount('wrong');
      var totalBookmark = MediCard.WrongQuestionBook.getCount('bookmark');

      if (this._mode === 'test') return this._renderTestHTML();

      // Render ALL subject sections in one scrollable list
      var subjects = Object.keys(groups).sort();
      var allSectionsHtml = '';
      for (var s = 0; s < subjects.length; s++) {
        allSectionsHtml += this._renderSubjectSection(subjects[s], groups[subjects[s]] || []);
      }
      if (!allSectionsHtml) {
        allSectionsHtml = '<div class="ntb-empty-subj">暂无题目</div>';
      }

      return '' +
        '<div class="ntb-header">' +
          '<h3 style="margin:0;font-size:clamp(17px,4.5vw,20px);">📝 错题本</h3>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="btn btn-sm" id="ntb-mode-toggle" style="background:#fbbf24;color:#000;min-height:40px;">🧪 自测</button>' +
            '<button class="btn btn-ghost btn-sm" id="ntb-close" style="min-height:40px;min-width:40px;">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="ntb-main-tabs">' +
          '<button class="ntb-tab-btn' + (tab === 'wrong' ? ' active' : '') + '" data-tab="wrong">❌ 错题 <span class="ntb-tab-count">' + totalWrong + '</span></button>' +
          '<button class="ntb-tab-btn' + (tab === 'bookmark' ? ' active' : '') + '" data-tab="bookmark">⭐ 收藏 <span class="ntb-tab-count">' + totalBookmark + '</span></button>' +
        '</div>' +
        '<div class="ntb-question-list" id="ntb-qlist">' + allSectionsHtml + '</div>';
    },

    /**
     * Render one subject section: sticky header + all question cards.
     * Cards show loading placeholders if question data isn't cached yet.
     */
    _renderSubjectSection: function(subjName, ids) {
      if (!ids || ids.length === 0) return '';

      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[subjName] || {};
      var loader = MediCard.QuestionLoader;
      var isLoaded = loader && loader._loadedSubjects.has(subjName);
      var cache = this._questionCache;

      var html = '<div class="ntb-subj-section" id="ntb-sec-' + _esc(subjName) + '">';
      html += '<div class="ntb-subj-header">' +
        '<span class="ntb-subj-title">' + (m.icon || '📚') + ' ' + (m.name || subjName) + '</span>' +
        '<span class="ntb-subj-count">' + ids.length + '题</span>' +
        (isLoaded ? '' : ' <span class="ntb-loading-tag">加载中...</span>') +
        '</div>';

      // Render every card immediately — with data if cached, placeholder if not
      for (var i = 0; i < ids.length; i++) {
        var q = cache ? cache[ids[i]] : null;
        html += this._renderCardHTML(ids[i], i, subjName, q, isLoaded);
      }
      html += '</div>';
      return html;
    },

    /**
     * Render a single question card. Detail (options, answer, knowledge point)
     * is ALWAYS visible inline — no expand/collapse needed.
     */
    _renderCardHTML: function(qid, index, subjName, q, isLoaded) {
      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[subjName] || {};
      var shortSubj = m.name || subjName;
      var chapter = q ? (q.chapter || '') : '';
      var questionText = q ? (q.question || q.q || '') : (isLoaded ? '(题目未找到)' : '加载中...');
      var multiBadge = this._multiSelectBadge(q);

      var html = '<div class="ntb-q-card" data-qid="' + _esc(qid) + '" data-subj="' + _esc(subjName) + '">';

      // Header row: number + question text (left), badges (right)
      html += '<div class="ntb-q-header">';
      html += '<span class="ntb-q-num">#' + (index + 1) + '</span>';
      html += '<span class="ntb-q-text">' + _esc(questionText) + '</span>' + multiBadge;
      html += '<span class="ntb-q-badges">';
      if (shortSubj) {
        html += '<span class="ntb-q-subj-badge">' + (m.icon || '📚') + ' ' + _esc(shortSubj) + '</span>';
      }
      if (chapter) {
        html += '<span class="ntb-q-ch-badge">' + _esc(chapter) + '</span>';
      }
      html += '</span>';
      html += '</div>';

      // Detail: always visible (options + correct answer + knowledge point)
      html += '<div class="ntb-q-detail">';
      if (q) {
        html += this._renderQuestionDetail(q);
      } else if (isLoaded) {
        html += '<div class="ntb-detail-placeholder">该题目数据暂不可用</div>';
      } else {
        html += '<div class="ntb-detail-placeholder ntb-loading"><span class="ntb-loading-dot"></span> 题目加载中，请稍候...</div>';
      }
      html += '<button class="btn btn-ghost btn-sm ntb-delete-btn" data-qid="' + _esc(qid) + '">🗑 移除此题</button>';
      html += '</div>';

      html += '</div>';
      return html;
    },

    // ── Question detail helpers ─────────────────────────────────

    _isMultiSelect: function(q) {
      if (!q) return false;
      if (q.questionType === 'multiple') return true;
      if (q.multiSelect === true || q.type === 'multi-select') return true;
      var correct = q.correctAnswers || q.ans || [];
      var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      var seen = {};
      var count = 0;
      for (var ci = 0; ci < correct.length; ci++) {
        var key = correct[ci];
        if (typeof key === 'number') key = labels[key];
        if (!seen[key]) { seen[key] = true; count++; }
      }
      return count > 1;
    },

    _multiSelectBadge: function(q) {
      return this._isMultiSelect(q) ? ' <span class="ntb-multi-badge">多选</span>' : '';
    },

    _renderQuestionDetail: function(q) {
      var html = '';
      if (this._isMultiSelect(q)) {
        html += '<div class="ntb-multi-notice">📋 多选题 — 需选择多个正确答案</div>';
      }
      var opts = q.options || q.opts || [];
      var correct = q.correctAnswers || q.ans || [];
      var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      var correctSet = {};
      for (var ci = 0; ci < correct.length; ci++) {
        var ck = correct[ci];
        if (typeof ck === 'number') ck = labels[ck];
        correctSet[ck] = true;
      }

      html += '<div class="ntb-options">';
      for (var oi = 0; oi < opts.length; oi++) {
        var label = labels[oi];
        var isCorrect = correctSet[oi] || correctSet[String(oi)] || correctSet[label];
        html += '<div class="ntb-option' + (isCorrect ? ' correct' : '') + '">' +
          '<span class="ntb-opt-label">' + label + '</span> ' + _esc(opts[oi]) +
          (isCorrect ? ' ✓' : '') +
          '</div>';
      }
      html += '</div>';

      var kp = q.knowledgePoint || q.kp;
      var exp = q.explanation || q.exp;
      var ref = q.textbookReference || q.ref;

      if (kp) html += '<div class="ntb-kp"><span class="ntb-kp-label">📖 知识点</span> ' + _esc(kp) + '</div>';
      if (exp) html += '<div class="ntb-explanation">💡 ' + _esc(exp) + '</div>';
      if (ref) html += '<div class="ntb-explanation">📚 参考：' + _esc(ref) + '</div>';

      return html;
    },

    // ── Test mode ───────────────────────────────────────────────

    _renderTestHTML: function() {
      return '' +
        '<div class="ntb-header">' +
          '<h3>🧪 错题自测</h3>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-sm" id="ntb-mode-toggle" style="background:var(--bg-tertiary);">📖 浏览模式</button>' +
            '<button class="btn btn-ghost btn-sm" id="ntb-close">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="ntb-test-progress">' +
          '<div class="ntb-progress-bar"><div class="ntb-progress-fill" id="ntb-progress-fill" style="width:0%;"></div></div>' +
          '<div class="ntb-progress-text" id="ntb-progress-text">准备开始...</div>' +
        '</div>' +
        '<div class="ntb-test-area" id="ntb-test-area">' +
          '<div style="text-align:center;padding:40px;">' +
            '<p style="color:var(--text-secondary);margin-bottom:16px;">共 <b>' + this._testQuestions.length + '</b> 道错题等待复习</p>' +
            '<p style="color:var(--text-muted);font-size:12px;margin-bottom:24px;">答对自动移出错题本 · 答错继续保留</p>' +
            '<button class="btn btn-primary btn-lg" id="ntb-start-test">🧪 开始自测</button>' +
          '</div>' +
        '</div>';
    },

    _startTest: function() {
      this._testIndex = 0;
      this._testCorrect = 0;
      this._testAnswered = 0;
      this._testAnsweredIds = [];
      var allIds = MediCard.WrongQuestionBook.getAll('wrong');
      for (var i = allIds.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = allIds[i]; allIds[i] = allIds[j]; allIds[j] = tmp;
      }
      this._testQuestions = allIds;

      var WB = MediCard.WrongQuestionBook;
      if (WB && WB.getQuestionDataBatch) {
        this._questionCache = WB.getQuestionDataBatch(allIds);
      } else {
        this._questionCache = null;
      }

      this._showNextTestQuestion();
    },

    _showNextTestQuestion: function() {
      if (this._testIndex >= this._testQuestions.length) {
        this._finishTest();
        return;
      }

      var qid = this._testQuestions[this._testIndex];
      var area = document.getElementById('ntb-test-area');
      if (!area) return;

      var progressPct = Math.round(this._testAnswered / this._testQuestions.length * 100);
      var fill = document.getElementById('ntb-progress-fill');
      var text = document.getElementById('ntb-progress-text');
      if (fill) fill.style.width = progressPct + '%';
      if (text) text.textContent = this._testAnswered + '/' + this._testQuestions.length + ' · 正确' + this._testCorrect;

      var self = this;

      // Fast path: preloaded cache
      var q = this._questionCache && this._questionCache[qid];
      if (q) {
        this._renderTestQuestion(q, qid, area);
        return;
      }

      // O(1) lookup
      q = MediCard.WrongQuestionBook.getQuestionData(qid);
      if (q) {
        this._renderTestQuestion(q, qid, area);
        return;
      }

      // Async fallback
      var loader = MediCard.QuestionLoader;
      if (loader && loader.findQuestionById) {
        area.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">加载题目中...</div>';
        loader.findQuestionById(qid, function(found) {
          if (found) {
            self._renderTestQuestion(found, qid, area);
          } else {
            self._testIndex++;
            self._showNextTestQuestion();
          }
        });
        return;
      }

      this._testIndex++;
      this._showNextTestQuestion();
    },

    _renderTestQuestion: function(q, qid, area) {
      var self = this;
      var opts = q.options || q.opts || [];
      var correct = q.correctAnswers || q.ans || [];
      var isMulti = this._isMultiSelect(q);
      var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      var correctSet = {};
      for (var ci = 0; ci < correct.length; ci++) {
        var ck = correct[ci];
        if (typeof ck === 'number') ck = labels[ck];
        correctSet[ck] = true;
      }

      this._testCurrentCorrectSet = correctSet;
      this._testCurrentIsMulti = isMulti;
      this._testSelectedOptions = [];

      var multiHint = isMulti
        ? '<div class="ntb-multi-notice">📋 多选题 — 点击选项选中/取消，选好后点「确认提交」</div>'
        : '';
      var submitBtn = isMulti
        ? '<button class="btn btn-primary" id="ntb-test-submit" style="margin-top:12px;width:100%;">✅ 确认提交</button>'
        : '';

      area.innerHTML = '' +
        '<div class="ntb-test-question">' +
          '<div class="ntb-test-q-num">第 ' + (this._testIndex + 1) + '/' + this._testQuestions.length + ' 题' +
            (isMulti ? ' <span class="ntb-multi-badge">多选</span>' : '') +
          '</div>' +
          '<div class="ntb-test-q-text">' + _esc(q.question || q.q || '') + '</div>' +
          multiHint +
          '<div class="ntb-test-options" id="ntb-test-options">' +
            opts.map(function(opt, oi) {
              return '<button class="ntb-test-opt-btn' + (isMulti ? ' multi-select' : '') + '" data-oi="' + oi + '">' +
                '<span class="ntb-opt-label">' + labels[oi] + '</span> ' + _esc(opt) +
                '</button>';
            }).join('') +
          '</div>' +
          submitBtn +
          '<div id="ntb-test-feedback" class="ntb-test-feedback" style="display:none;"></div>' +
          '<div id="ntb-test-explanation" style="display:none;margin-top:12px;padding:12px;background:rgba(0,0,0,0.15);border-radius:8px;font-size:12px;color:var(--text-secondary);"></div>' +
          '<button class="btn btn-primary" id="ntb-test-next" style="display:none;margin-top:12px;width:100%;">下一题 →</button>' +
        '</div>';

      var optBtns = area.querySelectorAll('.ntb-test-opt-btn');
      for (var oi2 = 0; oi2 < optBtns.length; oi2++) {
        (function(btn, oi) {
          btn.addEventListener('click', function() {
            if (isMulti) {
              self._toggleMultiOption(btn, oi);
            } else {
              self._handleTestAnswer(qid, [oi], q);
            }
          });
        })(optBtns[oi2], oi2);
      }

      if (isMulti) {
        var submitBtnEl = document.getElementById('ntb-test-submit');
        if (submitBtnEl) {
          submitBtnEl.addEventListener('click', function() {
            if (self._testSelectedOptions.length === 0) return;
            self._handleTestAnswer(qid, self._testSelectedOptions.slice(), q);
          });
        }
      }

      var nextBtn = document.getElementById('ntb-test-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          self._testIndex++;
          self._showNextTestQuestion();
        });
      }
    },

    _toggleMultiOption: function(btn, oi) {
      var idx = this._testSelectedOptions.indexOf(oi);
      if (idx >= 0) {
        this._testSelectedOptions.splice(idx, 1);
        btn.classList.remove('selected');
      } else {
        this._testSelectedOptions.push(oi);
        btn.classList.add('selected');
      }
    },

    _handleTestAnswer: function(qid, selectedOis, q) {
      var correctSet = this._testCurrentCorrectSet || {};
      var isMulti = this._testCurrentIsMulti;
      var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      var isCorrect;
      if (isMulti) {
        var selectedSet = {};
        for (var si = 0; si < selectedOis.length; si++) {
          selectedSet[labels[selectedOis[si]]] = true;
        }
        var allCorrectSelected = true;
        for (var ck in correctSet) {
          if (!selectedSet[ck]) { allCorrectSelected = false; break; }
        }
        var noExtraSelected = true;
        for (var sl in selectedSet) {
          if (!correctSet[sl]) { noExtraSelected = false; break; }
        }
        isCorrect = allCorrectSelected && noExtraSelected;
      } else {
        var so = selectedOis[0];
        isCorrect = correctSet[so] || correctSet[String(so)] || correctSet[labels[so]];
      }

      var optBtns = document.querySelectorAll('#ntb-test-options .ntb-test-opt-btn');
      for (var i = 0; i < optBtns.length; i++) {
        optBtns[i].disabled = true;
        var oi = parseInt(optBtns[i].getAttribute('data-oi'), 10);
        var label = labels[oi];
        var isRight = correctSet[oi] || correctSet[String(oi)] || correctSet[label];
        if (isRight) optBtns[i].classList.add('correct');
        if (!isMulti) {
          if (oi === selectedOis[0] && !isCorrect) optBtns[i].classList.add('wrong');
        } else {
          var wasSelected = optBtns[i].classList.contains('selected');
          if (wasSelected && !isRight) optBtns[i].classList.add('wrong');
        }
      }

      var submitBtn = document.getElementById('ntb-test-submit');
      if (submitBtn) submitBtn.style.display = 'none';

      this._testAnswered++;

      var feedback = document.getElementById('ntb-test-feedback');
      var explanation = document.getElementById('ntb-test-explanation');
      var nextBtn = document.getElementById('ntb-test-next');

      if (feedback) {
        feedback.style.display = 'block';
        if (isCorrect) {
          this._testCorrect++;
          this._testAnsweredIds.push(qid);
          feedback.innerHTML = '<span style="color:#10b981;">✅ 回答正确！此题已从错题本移除</span>';
        } else {
          var correctLabels = [];
          for (var ck2 in correctSet) { correctLabels.push(ck2); }
          feedback.innerHTML = '<span style="color:#ef4444;">❌ 回答错误！正确答案：' + correctLabels.join(', ') + '</span>';
        }
      }

      if (explanation) {
        explanation.style.display = 'block';
        var expText = q.explanation || q.exp || '暂无解析';
        explanation.innerHTML = '💡 ' + _esc(expText);
      }

      if (nextBtn) {
        nextBtn.style.display = 'block';
        if (this._testIndex + 1 >= this._testQuestions.length) {
          nextBtn.textContent = '查看结果 →';
        }
      }
    },

    _finishTest: function() {
      var area = document.getElementById('ntb-test-area');
      if (!area) return;
      var total = this._testQuestions.length;
      var correct = this._testCorrect;
      var pct = total > 0 ? Math.round(correct / total * 100) : 0;

      if (this._testAnsweredIds.length > 0) {
        for (var i = 0; i < this._testAnsweredIds.length; i++) {
          MediCard.WrongQuestionBook.deleteEntry('wrong', this._testAnsweredIds[i]);
        }
        this._testAnsweredIds = [];
      }

      var remaining = MediCard.WrongQuestionBook.getCount('wrong');

      area.innerHTML = '' +
        '<div style="text-align:center;padding:32px 16px;">' +
          '<div style="font-size:48px;margin-bottom:16px;">' + (pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚') + '</div>' +
          '<div style="font-size:28px;font-weight:900;color:#fbbf24;margin-bottom:8px;">' + correct + ' / ' + total + '</div>' +
          '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">正确率 ' + pct + '%</div>' +
          '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">' +
            (remaining > 0 ? '还有 <b>' + remaining + '</b> 道错题待复习' : '🎊 错题本已清空！') +
          '</div>' +
          (remaining > 0
            ? '<button class="btn btn-primary" id="ntb-retest" style="margin-right:8px;">🔄 重新自测</button>' +
              '<button class="btn btn-ghost" id="ntb-back-to-view">📖 浏览错题</button>'
            : '<button class="btn btn-ghost" id="ntb-back-to-view">📖 返回浏览</button>') +
        '</div>';

      var self = this;
      var retestBtn = document.getElementById('ntb-retest');
      var backBtn = document.getElementById('ntb-back-to-view');
      if (retestBtn) {
        retestBtn.addEventListener('click', function() { self._startTest(); });
      }
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          self._mode = 'view';
          if (remaining === 0) {
            self.close();
            return;
          }
          var content = self._overlay.querySelector('.ntb-modal');
          if (content) {
            content.innerHTML = self._renderHTML();
            self._attachEvents(content);
          }
        });
      }
    },

    // ── Event handling ──────────────────────────────────────────

    _attachEvents: function(content) {
      var self = this;

      // Wrong/Bookmark tab switching
      content.querySelectorAll('.ntb-tab-btn').forEach(function(tabBtn) {
        tabBtn.addEventListener('click', function() {
          var tab = this.getAttribute('data-tab');
          if (tab === self._activeTab) return;
          self._activeTab = tab;
          content.innerHTML = self._renderHTML();
          self._attachEvents(content);
          self._ensureSubjectsLoaded();
        });
      });

      // Mode toggle (view ↔ test)
      var modeBtn = document.getElementById('ntb-mode-toggle');
      if (modeBtn) {
        modeBtn.addEventListener('click', function() {
          if (self._mode === 'view') {
            var testIds = MediCard.WrongQuestionBook.getAll('wrong');
            if (testIds.length === 0) return;
            self._mode = 'test';
            for (var i = testIds.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var tmp = testIds[i]; testIds[i] = testIds[j]; testIds[j] = tmp;
            }
            self._testQuestions = testIds;
            self._testIndex = 0;
            self._testCorrect = 0;
            self._testAnswered = 0;
            self._testAnsweredIds = [];
            content.innerHTML = self._renderHTML();
            self._attachEvents(content);
          } else {
            if (self._testAnsweredIds.length > 0) {
              for (var r = 0; r < self._testAnsweredIds.length; r++) {
                MediCard.WrongQuestionBook.deleteEntry('wrong', self._testAnsweredIds[r]);
              }
              self._testAnsweredIds = [];
            }
            self._mode = 'view';
            content.innerHTML = self._renderHTML();
            self._attachEvents(content);
            self._ensureSubjectsLoaded();
          }
        });
      }

      // Close button
      var closeBtn = document.getElementById('ntb-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

      // Start test button
      var startBtn = document.getElementById('ntb-start-test');
      if (startBtn) {
        startBtn.addEventListener('click', function() { self._startTest(); });
      }

      // Delegated delete handler — one listener on qlist catches all card deletes
      var qlist = document.getElementById('ntb-qlist');
      if (qlist && !qlist._ntbDelegated) {
        qlist._ntbDelegated = true;
        qlist.addEventListener('click', function(e) {
          var delBtn = e.target.closest('.ntb-delete-btn');
          if (!delBtn) return;
          e.stopPropagation();

          var qid = delBtn.getAttribute('data-qid');
          var tab = self._activeTab || 'wrong';
          MediCard.WrongQuestionBook.deleteEntry(tab, qid);

          // Remove card from DOM
          var card = delBtn.closest('.ntb-q-card');
          if (card) {
            var section = card.closest('.ntb-subj-section');
            card.remove();

            // Update subject section count in header
            if (section) {
              var remainingCards = section.querySelectorAll('.ntb-q-card').length;
              var countEl = section.querySelector('.ntb-subj-count');
              if (countEl) countEl.textContent = remainingCards + '题';

              // Remove entire section if empty
              if (remainingCards === 0) {
                section.remove();
              }
            }
          }

          self._updateTabCounts();

          // If no entries left, close or switch tabs
          var remaining = MediCard.WrongQuestionBook.getCount(tab);
          if (remaining === 0) {
            var otherTab = tab === 'wrong' ? 'bookmark' : 'wrong';
            var modal = self._overlay ? self._overlay.querySelector('.ntb-modal') : null;
            if (modal && MediCard.WrongQuestionBook.getCount(otherTab) > 0) {
              self._activeTab = otherTab;
              modal.innerHTML = self._renderHTML();
              self._attachEvents(modal);
              self._ensureSubjectsLoaded();
            } else {
              self.close();
            }
          }
        });
      }
    }
  };

  /* ============ Helpers ============ */
  function _esc(str) {
    if (MediCard.Crypto && MediCard.Crypto.escapeHtml) {
      return MediCard.Crypto.escapeHtml(str);
    }
    var s = String(str == null ? '' : str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Expose global accessor for title screen / study module buttons
  window._medicardOpenNotebook = function() {
    if (MediCard.QuestionLoader) {
      var wrongIds = MediCard.WrongQuestionBook.getAll('wrong');
      var bookmarkIds = MediCard.WrongQuestionBook.getAll('bookmark');
      var allIds = wrongIds.concat(bookmarkIds);
      var neededSubjects = {};
      for (var i = 0; i < allIds.length; i++) {
        var subj = MediCard.WrongQuestionBook._subjectFromId(allIds[i]);
        if (subj && subj !== 'unknown') neededSubjects[subj] = true;
      }
      var subjects = Object.keys(neededSubjects);
      for (var j = 0; j < subjects.length; j++) {
        MediCard.QuestionLoader.loadSubject(subjects[j]);
      }
    }
    MediCard.ScreenNotebook.show();
  };

  console.log('[Notebook] Wrong question notebook V2.0 module loaded');
})();
