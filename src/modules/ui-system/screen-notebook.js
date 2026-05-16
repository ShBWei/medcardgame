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
      this._activeTab = 'wrong'; // 'wrong' | 'bookmark'

      var totalWrong = MediCard.WrongQuestionBook.getCount('wrong');
      var totalBookmark = MediCard.WrongQuestionBook.getCount('bookmark');
      if (totalWrong === 0 && totalBookmark === 0) {
        this._showEmpty();
        return;
      }

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
        // Kick off async loading for uncached subjects
        self._ensureSubjectsLoaded();
      }, 50);
    },

    /** Ensure all subjects with wrong/bookmarked questions are loaded */
    _ensureSubjectsLoaded: function() {
      var loader = MediCard.QuestionLoader;
      if (!loader) return;
      var allIds = [];
      var wrongIds = MediCard.WrongQuestionBook.getAll('wrong');
      var bookmarkIds = MediCard.WrongQuestionBook.getAll('bookmark');
      for (var i = 0; i < wrongIds.length; i++) allIds.push(wrongIds[i]);
      for (var j = 0; j < bookmarkIds.length; j++) allIds.push(bookmarkIds[j]);

      var neededSubjects = {};
      for (var k = 0; k < allIds.length; k++) {
        var subj = MediCard.WrongQuestionBook._subjectFromId(allIds[k]);
        if (subj && subj !== 'unknown') neededSubjects[subj] = true;
      }

      var self = this;
      var subjectList = Object.keys(neededSubjects);
      var loadedCount = 0;
      for (var s = 0; s < subjectList.length; s++) {
        if (loader._loadedSubjects.has(subjectList[s])) {
          loadedCount++;
        } else {
          loader.loadSubject(subjectList[s]);
        }
      }

      // If all already cached, instantly refresh question list
      if (loadedCount === subjectList.length) {
        this._refreshQuestionList();
      } else {
        // Wait for loads to complete, then refresh
        loader.onReady(function() {
          self._refreshQuestionList();
        });
      }
    },

    /** Refresh the question list in-place after subjects load */
    _refreshQuestionList: function() {
      var qlist = document.getElementById('ntb-qlist');
      if (!qlist) return;
      var groups = MediCard.WrongQuestionBook.getBySubject(this._activeTab);
      var subjects = Object.keys(groups).sort();
      var firstSubj = subjects[0] || '';
      qlist.innerHTML = this._renderQuestionList(firstSubj, groups[firstSubj] || []);
      this._attachQuestionCards(qlist);
      this._updateTabCounts();
    },

    _updateTabCounts: function() {
      var content = this._overlay ? this._overlay.querySelector('.ntb-modal') : null;
      if (!content) return;
      var wrongGroups = MediCard.WrongQuestionBook.getBySubject('wrong');
      var bookmarkGroups = MediCard.WrongQuestionBook.getBySubject('bookmark');
      var wrongTotal = MediCard.WrongQuestionBook.getCount('wrong');
      var bookmarkTotal = MediCard.WrongQuestionBook.getCount('bookmark');

      var wrongTab = content.querySelector('.ntb-tab-btn[data-tab="wrong"]');
      var bookmarkTab = content.querySelector('.ntb-tab-btn[data-tab="bookmark"]');
      if (wrongTab) wrongTab.innerHTML = '❌ 错题 <span class="ntb-tab-count">' + wrongTotal + '</span>';
      if (bookmarkTab) bookmarkTab.innerHTML = '⭐ 收藏 <span class="ntb-tab-count">' + bookmarkTotal + '</span>';

      // Update subject tab counts
      var tabCounts = this._activeTab === 'bookmark' ? bookmarkGroups : wrongGroups;
      content.querySelectorAll('.ntb-subj-tab').forEach(function(tab) {
        var subj = tab.getAttribute('data-subj');
        var count = tabCounts[subj] ? tabCounts[subj].length : 0;
        var countEl = tab.querySelector('.ntb-subj-count');
        if (countEl) countEl.textContent = count;
        tab.style.display = count > 0 ? '' : 'none';
      });
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
      var tab = this._activeTab || 'wrong';
      var groups = MediCard.WrongQuestionBook.getBySubject(tab);
      var meta = MediCard.Config.subjectMeta || {};
      var totalWrong = MediCard.WrongQuestionBook.getCount('wrong');
      var totalBookmark = MediCard.WrongQuestionBook.getCount('bookmark');
      var totalCount = tab === 'bookmark' ? totalBookmark : totalWrong;

      if (this._mode === 'test') return this._renderTestHTML();

      // Build subject tabs
      var subjects = Object.keys(groups).sort();
      var tabsHtml = '';
      for (var s = 0; s < subjects.length; s++) {
        var subj = subjects[s];
        var m = meta[subj] || {};
        tabsHtml += '<button class="ntb-subj-tab' + (s === 0 ? ' active' : '') + '" data-subj="' + _esc(subj) + '">' +
          (m.icon || '📚') + ' <span class="ntb-subj-name">' + (m.name || subj) + '</span> ' +
          '<span class="ntb-subj-count">' + groups[subj].length + '</span>' +
          '</button>';
      }

      // Build question list for first subject
      var firstSubj = subjects[0] || '';
      var questionListHtml = this._renderQuestionList(firstSubj, groups[firstSubj] || []);

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
        '<div class="ntb-subj-tabs" id="ntb-tabs">' + tabsHtml + '</div>' +
        '<div class="ntb-question-list" id="ntb-qlist">' + questionListHtml + '</div>';
    },

    _renderQuestionList: function(subjName, ids) {
      if (!ids || ids.length === 0) {
        return '<div class="ntb-empty-subj">暂无题目</div>';
      }

      var meta = MediCard.Config.subjectMeta || {};
      var m = meta[subjName] || {};
      var isLoaded = MediCard.QuestionLoader && MediCard.QuestionLoader._loadedSubjects.has(subjName);

      var html = '<div class="ntb-subj-header">' +
        '<span class="ntb-subj-title">' + (m.icon || '📚') + ' ' + (m.name || subjName) + '</span>' +
        '<span class="ntb-subj-count">' + ids.length + '题</span>' +
        (isLoaded ? '' : ' <span class="ntb-loading-tag">加载中...</span>') +
        '</div>';

      // Use indexed lookup for loaded subjects, temp placeholder for unloaded
      var loader = MediCard.QuestionLoader;
      var questions = (loader && loader._cache[subjName]) ? loader._cache[subjName] : null;

      for (var i = 0; i < ids.length; i++) {
        var qid = ids[i];
        // Try index first (O(1)), fall back to linear scan
        var q = null;
        if (questions) {
          var entry = loader._questionIndex[qid];
          if (entry && entry.subjectId === subjName) {
            q = questions[entry.index];
            if (!q || (q.id !== qid && q.cardId !== qid)) q = null;
          }
          if (!q) {
            // Fallback linear scan
            for (var j = 0; j < questions.length; j++) {
              if (questions[j].id === qid || questions[j].cardId === qid) {
                q = questions[j]; break;
              }
            }
          }
        }

        html += '<div class="ntb-q-card" data-qid="' + _esc(qid) + '" data-subj="' + _esc(subjName) + '">';
        html += '<div class="ntb-q-header">';
        html += '<span class="ntb-q-num">#' + (i + 1) + '</span>';
        html += '<span class="ntb-q-text">' + _esc(q ? (q.question || q.q || '') : (isLoaded ? '(题目未找到)' : '加载中...')) + '</span>';
        html += '<span class="ntb-q-toggle">▼</span>';
        html += '</div>';
        html += '<div class="ntb-q-detail" style="display:none;">';
        if (q) {
          html += this._renderQuestionDetail(q);
        } else if (isLoaded) {
          html += '<div class="ntb-detail-placeholder">该题目数据暂不可用</div>';
        } else {
          html += '<div class="ntb-detail-placeholder ntb-loading">题目加载中，请稍候... <span class="ntb-loading-dot"></span></div>';
        }
        html += '<button class="btn btn-ghost btn-sm ntb-delete-btn" data-qid="' + _esc(qid) + '">🗑 移除此题</button>';
        html += '</div>';
        html += '</div>';
      }

      return html;
    },

    /** Render the expanded detail section for a single question */
    _renderQuestionDetail: function(q) {
      var html = '';
      var opts = q.options || q.opts || [];
      var correct = q.correctAnswers || q.ans || [];
      var correctSet = {};
      for (var ci = 0; ci < correct.length; ci++) correctSet[correct[ci]] = true;

      html += '<div class="ntb-options">';
      var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (var oi = 0; oi < opts.length; oi++) {
        var isCorrect = correctSet[oi] || correctSet[String(oi)] || correctSet[labels[oi]];
        html += '<div class="ntb-option' + (isCorrect ? ' correct' : '') + '">' +
          '<span class="ntb-opt-label">' + labels[oi] + '</span> ' + _esc(opts[oi]) +
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
      var area = document.getElementById('ntb-test-area');
      if (!area) return;

      // Update progress
      var progressPct = Math.round(this._testAnswered / this._testQuestions.length * 100);
      var fill = document.getElementById('ntb-progress-fill');
      var text = document.getElementById('ntb-progress-text');
      if (fill) fill.style.width = progressPct + '%';
      if (text) text.textContent = this._testAnswered + '/' + this._testQuestions.length + ' · 正确' + this._testCorrect;

      var self = this;
      var loader = MediCard.QuestionLoader;

      // Try indexed lookup first
      var q = MediCard.WrongQuestionBook.getQuestionData(qid);

      if (q) {
        this._renderTestQuestion(q, qid, area);
        return;
      }

      // Not in cache — try async load
      if (loader && loader.findQuestionById) {
        area.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">加载题目中...</div>';
        loader.findQuestionById(qid, function(found) {
          if (found) {
            self._renderTestQuestion(found, qid, area);
          } else {
            // Skip question we genuinely can't find
            self._testIndex++;
            self._showNextTestQuestion();
          }
        });
        return;
      }

      // Absolute fallback — skip
      this._testIndex++;
      this._showNextTestQuestion();
    },

    /** Render a test question into the test area */
    _renderTestQuestion: function(q, qid, area) {
      var self = this;
      var opts = q.options || q.opts || [];
      var correct = q.correctAnswers || q.ans || [];
      var correctSet = {};
      for (var ci = 0; ci < correct.length; ci++) correctSet[correct[ci]] = true;

      var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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

      // Wrong/Bookmark tab switching
      content.querySelectorAll('.ntb-tab-btn').forEach(function(tabBtn) {
        tabBtn.addEventListener('click', function() {
          var tab = this.getAttribute('data-tab');
          if (tab === self._activeTab) return;
          self._activeTab = tab;
          // Re-render
          content.innerHTML = self._renderHTML();
          self._attachEvents(content);
          self._ensureSubjectsLoaded();
        });
      });

      // Subject tab switching
      content.querySelectorAll('.ntb-subj-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          var subj = this.getAttribute('data-subj');
          // Update active tab
          content.querySelectorAll('.ntb-subj-tab').forEach(function(t) { t.classList.remove('active'); });
          this.classList.add('active');
          // Update question list
          var groups = MediCard.WrongQuestionBook.getBySubject(self._activeTab);
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
            // Only test on wrong questions (not bookmarks)
            var testIds = MediCard.WrongQuestionBook.getAll('wrong');
            if (testIds.length === 0) return;
            self._mode = 'test';
            // Shuffle
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
            // Apply deferred removals before switching back to view
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

      // Close
      var closeBtn = document.getElementById('ntb-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

      // Delete button (handles both wrong and bookmark)
      content.querySelectorAll('.ntb-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var qid = this.getAttribute('data-qid');
          var tab = self._activeTab || 'wrong';
          MediCard.WrongQuestionBook.deleteEntry(tab, qid);
          // Remove card from DOM
          var card = this.closest('.ntb-q-card');
          if (card) card.remove();
          // Refresh tab counts
          self._updateTabCounts();
          var remaining = MediCard.WrongQuestionBook.getCount(tab);
          // If no more questions in this tab, switch or close
          if (remaining === 0) {
            var otherTab = tab === 'wrong' ? 'bookmark' : 'wrong';
            if (MediCard.WrongQuestionBook.getCount(otherTab) > 0) {
              self._activeTab = otherTab;
              content.innerHTML = self._renderHTML();
              self._attachEvents(content);
              self._ensureSubjectsLoaded();
            } else {
              self.close();
            }
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
    if (MediCard.Crypto && MediCard.Crypto.escapeHtml) {
      return MediCard.Crypto.escapeHtml(str);
    }
    // Fallback: basic HTML escaping
    var s = String(str == null ? '' : str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Expose global accessor for title screen / study module buttons
  window._medicardOpenNotebook = function() {
    if (MediCard.QuestionLoader) {
      // Preload ALL subjects that have wrong OR bookmarked questions
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

  console.log('[Notebook] Wrong question notebook module loaded');
})();
