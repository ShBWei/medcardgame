/**
 * MediCard 医杀 — Wrong Question Notebook (错题本) V1.0
 * View mode: browse wrong questions grouped by subject
 * Self-test mode: quiz on wrong questions, auto-remove on correct answer
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

    show: function() {
      this._removeOverlay();
      var self = this;
      this._mode = 'view';

      var totalWrong = MediCard.WrongQuestionBook.getCount('wrong');
      if (totalWrong === 0) {
        this._showEmpty();
        return;
      }

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay ntb-overlay';
      overlay.style.zIndex = '4000';
      this._overlay = overlay;

      var content = document.createElement('div');
      content.className = 'ntb-modal';
      content.style.cssText = 'max-width:560px;width:95%;max-height:85vh;overflow-y:auto;animation:modalEnter 250ms ease-out;';

      content.innerHTML = this._renderHTML();
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) self.close(); });
      setTimeout(function() { self._attachEvents(content); }, 50);
    },

    close: function() {
      // Apply deferred removals (correctly answered in test mode)
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

    _renderHTML: function() {
      var self = this;
      var groups = MediCard.WrongQuestionBook.getBySubject('wrong');
      var meta = MediCard.Config.subjectMeta || {};
      var totalCount = MediCard.WrongQuestionBook.getCount('wrong');

      if (this._mode === 'test') return this._renderTestHTML();

      // Build subject tabs
      var subjects = Object.keys(groups).sort();
      var tabsHtml = '';
      for (var s = 0; s < subjects.length; s++) {
        var subj = subjects[s];
        var m = meta[subj] || {};
        tabsHtml += '<button class="ntb-subj-tab' + (s === 0 ? ' active' : '') + '" data-subj="' + _esc(subj) + '">' +
          (m.icon || '📚') + ' ' + (m.name || subj) + ' <span class="ntb-subj-count">' + groups[subj].length + '</span>' +
          '</button>';
      }

      // Build question list for first subject
      var firstSubj = subjects[0] || '';
      var questionListHtml = this._renderQuestionList(firstSubj, groups[firstSubj] || []);

      return '' +
        '<div class="ntb-header">' +
          '<h3>📝 错题本 <span style="font-size:12px;color:var(--text-muted);font-weight:400;">共' + totalCount + '题</span></h3>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-sm" id="ntb-mode-toggle" style="background:#fbbf24;color:#000;">🧪 自测模式</button>' +
            '<button class="btn btn-ghost btn-sm" id="ntb-close">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="ntb-subj-tabs" id="ntb-tabs">' + tabsHtml + '</div>' +
        '<div class="ntb-question-list" id="ntb-qlist">' + questionListHtml + '</div>';
    },

    _renderQuestionList: function(subjName, ids) {
      if (!ids || ids.length === 0) {
        return '<div class="ntb-empty-subj">该科目暂无错题</div>';
      }

      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[subjName] || {};
      var html = '<div class="ntb-subj-header">' +
        '<span class="ntb-subj-title">' + (m.icon || '📚') + ' ' + (m.name || subjName) + '</span>' +
        '<span class="ntb-subj-count">' + ids.length + '题</span>' +
        '</div>';

      // Load questions and render
      var loader = MediCard.QuestionLoader;
      var questions = loader && loader.getSubject ? loader.getSubject(subjName) : null;

      for (var i = 0; i < ids.length; i++) {
        var qid = ids[i];
        var q = null;
        if (questions) {
          for (var j = 0; j < questions.length; j++) {
            if (questions[j].id === qid) { q = questions[j]; break; }
          }
        }

        html += '<div class="ntb-q-card" data-qid="' + _esc(qid) + '" data-subj="' + _esc(subjName) + '">';
        html += '<div class="ntb-q-header">';
        html += '<span class="ntb-q-num">#' + (i + 1) + '</span>';
        html += '<span class="ntb-q-text">' + _esc(q ? (q.question || q.q || qid) : qid) + '</span>';
        html += '<span class="ntb-q-toggle">▼</span>';
        html += '</div>';
        html += '<div class="ntb-q-detail" style="display:none;">';
        if (q) {
          var opts = q.options || q.opts || [];
          var correct = q.correctAnswers || q.ans || [];
          var correctSet = {};
          for (var ci = 0; ci < correct.length; ci++) correctSet[correct[ci]] = true;

          html += '<div class="ntb-options">';
          var labels = ['A', 'B', 'C', 'D', 'E'];
          for (var oi = 0; oi < opts.length; oi++) {
            var isCorrect = correctSet[oi] || correctSet[String(oi)] || correctSet[labels[oi]];
            html += '<div class="ntb-option' + (isCorrect ? ' correct' : '') + '">' +
              '<span class="ntb-opt-label">' + labels[oi] + '</span> ' + _esc(opts[oi]) +
              (isCorrect ? ' ✓' : '') +
              '</div>';
          }
          html += '</div>';

          if (q.explanation || q.exp) {
            html += '<div class="ntb-explanation">💡 ' + _esc(q.explanation || q.exp) + '</div>';
          }
          if (q.knowledgePoint || q.kp) {
            html += '<div class="ntb-kp">📖 知识点：' + _esc(q.knowledgePoint || q.kp) + '</div>';
          }
          if (q.textbookReference || q.ref) {
            html += '<div class="ntb-kp">📚 参考：' + _esc(q.textbookReference || q.ref) + '</div>';
          }
        } else {
          html += '<div class="ntb-explanation" style="color:var(--text-muted);">题目数据未加载，请先在科目选择中加载该科目</div>';
        }
        html += '<button class="btn btn-ghost btn-sm ntb-delete-btn" data-qid="' + _esc(qid) + '">🗑 移除此题</button>';
        html += '</div>';
        html += '</div>';
      }

      return html;
    },

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
      // Shuffle IDs
      for (var i = allIds.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = allIds[i]; allIds[i] = allIds[j]; allIds[j] = tmp;
      }
      this._testQuestions = allIds;
      this._showNextTestQuestion();
    },

    _showNextTestQuestion: function() {
      if (this._testIndex >= this._testQuestions.length) {
        this._finishTest();
        return;
      }

      var qid = this._testQuestions[this._testIndex];
      var q = MediCard.WrongQuestionBook.getQuestionData(qid);
      var area = document.getElementById('ntb-test-area');
      if (!area) return;

      // Update progress
      var progressPct = Math.round(this._testAnswered / this._testQuestions.length * 100);
      var fill = document.getElementById('ntb-progress-fill');
      var text = document.getElementById('ntb-progress-text');
      if (fill) fill.style.width = progressPct + '%';
      if (text) text.textContent = this._testAnswered + '/' + this._testQuestions.length + ' · 正确' + this._testCorrect;

      if (!q) {
        // Try to load the subject first, then retry
        var subj = MediCard.WrongQuestionBook._subjectFromId(qid);
        var loader = MediCard.QuestionLoader;
        if (loader && loader.getSubject) {
          loader.getSubject(subj); // trigger load if needed
        }
        // Skip questions we can't load
        this._testIndex++;
        this._showNextTestQuestion();
        return;
      }

      var opts = q.options || q.opts || [];
      var correct = q.correctAnswers || q.ans || [];
      var correctSet = {};
      for (var ci = 0; ci < correct.length; ci++) correctSet[correct[ci]] = true;

      var labels = ['A', 'B', 'C', 'D', 'E'];
      var self = this;

      area.innerHTML = '' +
        '<div class="ntb-test-question">' +
          '<div class="ntb-test-q-num">第 ' + (this._testIndex + 1) + '/' + this._testQuestions.length + ' 题</div>' +
          '<div class="ntb-test-q-text">' + _esc(q.question || q.q || '') + '</div>' +
          '<div class="ntb-test-options" id="ntb-test-options">' +
            opts.map(function(opt, oi) {
              return '<button class="ntb-test-opt-btn" data-oi="' + oi + '">' +
                '<span class="ntb-opt-label">' + labels[oi] + '</span> ' + _esc(opt) +
                '</button>';
            }).join('') +
          '</div>' +
          '<div id="ntb-test-feedback" class="ntb-test-feedback" style="display:none;"></div>' +
          '<div id="ntb-test-explanation" style="display:none;margin-top:12px;padding:12px;background:rgba(0,0,0,0.15);border-radius:8px;font-size:12px;color:var(--text-secondary);"></div>' +
          '<button class="btn btn-primary" id="ntb-test-next" style="display:none;margin-top:12px;width:100%;">下一题 →</button>' +
        '</div>';

      // Attach option click handlers
      var optBtns = area.querySelectorAll('.ntb-test-opt-btn');
      for (var oi2 = 0; oi2 < optBtns.length; oi2++) {
        optBtns[oi2].addEventListener('click', function() {
          var selectedOi = parseInt(this.getAttribute('data-oi'), 10);
          self._handleTestAnswer(qid, selectedOi, correctSet, opts, q);
        });
      }

      var nextBtn = document.getElementById('ntb-test-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          self._testIndex++;
          self._showNextTestQuestion();
        });
      }
    },

    _handleTestAnswer: function(qid, selectedOi, correctSet, opts, q) {
      var isCorrect = correctSet[selectedOi] || correctSet[String(selectedOi)] ||
                      correctSet[['A','B','C','D','E'][selectedOi]];

      // Disable all option buttons
      var optBtns = document.querySelectorAll('#ntb-test-options .ntb-test-opt-btn');
      for (var i = 0; i < optBtns.length; i++) {
        optBtns[i].disabled = true;
        var oi = parseInt(optBtns[i].getAttribute('data-oi'), 10);
        var isRight = correctSet[oi] || correctSet[String(oi)] || correctSet[['A','B','C','D','E'][oi]];
        if (isRight) optBtns[i].classList.add('correct');
        if (oi === selectedOi && !isCorrect) optBtns[i].classList.add('wrong');
      }

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
          var labels = ['A', 'B', 'C', 'D', 'E'];
          var correctLabels = [];
          for (var ci = 0; ci < (q.correctAnswers || q.ans || []).length; ci++) {
            var ca = (q.correctAnswers || q.ans || [])[ci];
            if (typeof ca === 'number') correctLabels.push(labels[ca]);
            else correctLabels.push(ca);
          }
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

      // Apply deferred removals for correctly answered questions
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

    _attachEvents: function(content) {
      var self = this;

      // Subject tab switching
      content.querySelectorAll('.ntb-subj-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          var subj = this.getAttribute('data-subj');
          // Update active tab
          content.querySelectorAll('.ntb-subj-tab').forEach(function(t) { t.classList.remove('active'); });
          this.classList.add('active');
          // Update question list
          var groups = MediCard.WrongQuestionBook.getBySubject('wrong');
          var qlist = document.getElementById('ntb-qlist');
          if (qlist) {
            qlist.innerHTML = self._renderQuestionList(subj, groups[subj] || []);
            self._attachQuestionCards(qlist);
          }
        });
      });

      // Question card expand/collapse
      this._attachQuestionCards(content);

      // Mode toggle
      var modeBtn = document.getElementById('ntb-mode-toggle');
      if (modeBtn) {
        modeBtn.addEventListener('click', function() {
          if (self._mode === 'view') {
            self._mode = 'test';
            var allIds = MediCard.WrongQuestionBook.getAll('wrong');
            // Shuffle
            for (var i = allIds.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var tmp = allIds[i]; allIds[i] = allIds[j]; allIds[j] = tmp;
            }
            self._testQuestions = allIds;
            self._testIndex = 0;
            self._testCorrect = 0;
            self._testAnswered = 0;
            self._testAnsweredIds = [];
            content.innerHTML = self._renderHTML();
            self._attachEvents(content);
          } else {
            self._mode = 'view';
            content.innerHTML = self._renderHTML();
            self._attachEvents(content);
          }
        });
      }

      // Close
      var closeBtn = document.getElementById('ntb-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

      // Delete button
      content.querySelectorAll('.ntb-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var qid = this.getAttribute('data-qid');
          MediCard.WrongQuestionBook.deleteEntry('wrong', qid);
          // Remove card from DOM
          var card = this.closest('.ntb-q-card');
          if (card) card.remove();
          // Refresh tab counts
          self._refreshTabCounts(content);
          // If no more questions, close
          if (MediCard.WrongQuestionBook.getCount('wrong') === 0) {
            self.close();
          }
        });
      });

      // Start test button
      var startBtn = document.getElementById('ntb-start-test');
      if (startBtn) {
        startBtn.addEventListener('click', function() { self._startTest(); });
      }
    },

    _attachQuestionCards: function(container) {
      container.querySelectorAll('.ntb-q-header').forEach(function(header) {
        header.addEventListener('click', function() {
          var card = this.closest('.ntb-q-card');
          var detail = card.querySelector('.ntb-q-detail');
          var toggle = card.querySelector('.ntb-q-toggle');
          if (detail.style.display === 'none') {
            detail.style.display = 'block';
            if (toggle) toggle.textContent = '▲';
          } else {
            detail.style.display = 'none';
            if (toggle) toggle.textContent = '▼';
          }
        });
      });
    },

    _refreshTabCounts: function(content) {
      var groups = MediCard.WrongQuestionBook.getBySubject('wrong');
      content.querySelectorAll('.ntb-subj-tab').forEach(function(tab) {
        var subj = tab.getAttribute('data-subj');
        var count = groups[subj] ? groups[subj].length : 0;
        var countEl = tab.querySelector('.ntb-subj-count');
        if (countEl) countEl.textContent = count;
        if (count === 0) tab.style.opacity = '0.4';
      });
    }
  };

  /* ============ Helpers ============ */
  function _esc(str) {
    return MediCard.Crypto.escapeHtml(str);
  }

  // Expose global accessor for title screen button
  window._medicardOpenNotebook = function() {
    if (MediCard.QuestionLoader) {
      // Preload subjects that have wrong questions
      var groups = MediCard.WrongQuestionBook.getBySubject('wrong');
      var subjects = Object.keys(groups);
      for (var i = 0; i < subjects.length; i++) {
        MediCard.QuestionLoader.getSubject(subjects[i]);
      }
    }
    MediCard.ScreenNotebook.show();
  };

  console.log('[Notebook] Wrong question notebook module loaded');
})();
