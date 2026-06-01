/**
 * MediCard Duel — Subject Selection Screen
 * 8 subjects with checkboxes and quick-select presets
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenSubject = {
    _selected: new Set(),
    _forMultiplayer: false,
    _chapterSelections: {},  // subjectId → Set of chapter names
    _chapterExpanded: {},    // subjectId → true/false — user has expanded chapter pills
    _chapterProgress: {},    // subjectId → { chapterName: { sessions, lastPlayed } }

    render() {
      var screen = document.getElementById('screen-subject');
      if (!screen) return;

      // Restore saved subject selection
      var saved = MediCard.Storage.getSelectedSubjects();
      if (saved && saved.length > 0) {
        this._selected = new Set(saved);
      } else {
        // Default: select all 8 subjects
        var allSubjects = MediCard.Config.subjectCategories[0].subjects;
        this._selected = new Set(allSubjects);
      }

      // Restore saved chapter selections
      var savedChapters = MediCard.Storage.getSelectedChapters ? MediCard.Storage.getSelectedChapters() : {};
      this._chapterSelections = {};
      for (var subj in savedChapters) {
        if (savedChapters[subj] && savedChapters[subj].length) {
          this._chapterSelections[subj] = new Set(savedChapters[subj]);
        }
      }

      // Restore chapter expanded state (which subjects user clicked "展开" on)
      this._chapterExpanded = MediCard.Storage.get ? (MediCard.Storage.get('chapter_expanded', {})) : {};
      if (!this._chapterExpanded || typeof this._chapterExpanded !== 'object') this._chapterExpanded = {};

      // Load chapter study progress
      this._chapterProgress = MediCard.Storage.getChapterProgress ? MediCard.Storage.getChapterProgress() : {};

      // Re-apply saved chapter filters to QuestionLoader (in case they were cleared by page reload or other flows)
      // Works even when subject data isn't in memory yet — setChapterFilter just stores names
      if (MediCard.QuestionLoader) {
        MediCard.QuestionLoader.clearChapterFilters();
        for (var subj in this._chapterSelections) {
          var chSet = this._chapterSelections[subj];
          if (!chSet || chSet.size === 0) continue;
          var allChapters = MediCard.QuestionLoader.getChapters(subj);
          // Apply filter from saved selections: always apply unless we know it's a full selection
          if (allChapters.length === 0 || chSet.size < allChapters.length) {
            MediCard.QuestionLoader.setChapterFilter(subj, Array.from(chSet));
          }
        }
      }

      this._renderContent(screen);

      // Poll for async subject data loading — re-render when data arrives so chapter pills appear
      if (MediCard.QuestionLoader) {
        var self = this;
        var allSubjsArr = MediCard.Config.subjectCategories[0].subjects;
        var pending = [];
        for (var si2 = 0; si2 < allSubjsArr.length; si2++) {
          var s = allSubjsArr[si2];
          if (self._selected.has(s) && !MediCard.QuestionLoader._cache[s]) {
            pending.push(s);
            MediCard.QuestionLoader.loadSubject(s);
          }
        }
        if (pending.length > 0) {
          var checks = 0;
          var pollId = setInterval(function() {
            checks++;
            var anyLoaded = false;
            for (var pi = 0; pi < pending.length; pi++) {
              if (MediCard.QuestionLoader._cache[pending[pi]]) { anyLoaded = true; break; }
            }
            if (anyLoaded) {
              var scr = document.getElementById('screen-subject');
              if (scr && scr.classList.contains('active')) self._renderContent(scr);
            }
            var allDone = true;
            for (var pi2 = 0; pi2 < pending.length; pi2++) {
              if (!MediCard.QuestionLoader._cache[pending[pi2]]) { allDone = false; break; }
            }
            if (allDone || checks >= 30) clearInterval(pollId);
          }, 150);
        }
      }
    },

    _renderContent(screen) {
      var self = this;
      var allSubjects = MediCard.Config.subjectCategories[0].subjects;
      var stats = this._getStats();
      var meta = MediCard.Config.subjectMeta;

      var html = '' +
        '<div class="subject-header">' +
          '<h2>📚 科目选择</h2>' +
          (self._forMultiplayer ? '<p style="font-size:12px;color:#fbbf24;margin-bottom:4px;">🌐 联机模式：房主的科目选择将作为本局最终科目</p>' : '') +
          '<p class="selected-count">已选 <strong>' + this._selected.size + '/' + allSubjects.length + '</strong> 科 · 共计 <strong>' + stats.total + '</strong> 题</p>' +
        '</div>';

      // Quick select presets
      html += '<div class="quick-select-bar">';
      MediCard.Config.quickSelectPresets.forEach(function(preset) {
        html += '<button class="quick-select-btn" data-preset="' + (preset.subjects ? preset.subjects.join(',') : 'all') + '">' +
          preset.icon + ' ' + preset.name + '</button>';
      });
      html += '</div>';

      // Single category (all 8 subjects in one group)
      var cat = MediCard.Config.subjectCategories[0];
      html += '<div class="subject-category">' +
        '<div class="category-header">' +
          '<span class="category-title">' + cat.name + '</span>' +
          '<span class="category-count">' + self._countInCategory(cat.subjects) + '/' + cat.subjects.length + '</span>' +
        '</div>' +
        '<div class="subject-grid open">';

      cat.subjects.forEach(function(subId) {
        var m = meta[subId] || {};
        var count = MediCard.QuestionLoader.getSubjectCount(subId);
        var isSelected = self._selected.has(subId);
        html += '<div class="subject-item' + (isSelected ? ' selected' : '') + '" data-subject="' + subId + '" role="checkbox" aria-checked="' + (isSelected ? 'true' : 'false') + '" tabindex="0">' +
          '<span class="subject-item-icon">' + (m.icon || '📚') + '</span>' +
          '<div class="subject-item-info">' +
            '<div class="subject-item-name">' + (m.name || subId) + '</div>' +
            '<div class="subject-item-count">' + count + '题</div>' +
          '</div>' +
          '<div class="subject-item-check">✓</div>' +
        '</div>';
      });

      html += '</div></div>';

      // Chapter selection areas — collapsible, one per selected subject
      var allSubjectsArr = MediCard.Config.subjectCategories[0].subjects;
      for (var si = 0; si < allSubjectsArr.length; si++) {
        var subId2 = allSubjectsArr[si];
        if (!self._selected.has(subId2)) continue;
        var m2 = meta[subId2] || {};
        var chapters = MediCard.QuestionLoader.getChapters(subId2);
        var chapSel = self._chapterSelections[subId2];
        var isExpanded = self._chapterExpanded[subId2] === true;
        var isCustomized = chapSel && chapters.length > 0 && chapSel.size < chapters.length;

        // Auto-select all chapters if none selected yet for this subject
        if (!chapSel && chapters.length > 0) {
          chapSel = new Set(chapters);
          self._chapterSelections[subId2] = chapSel;
        }

        var selCount = chapSel ? chapSel.size : chapters.length;
        var totalCh = chapters.length || 1;

        html += '<div class="subject-chapter-area' + (isExpanded ? ' expanded' : '') + '" data-subj="' + subId2 + '">' +
          '<div class="subject-chapter-header">' +
            '<span class="subject-chapter-title">' + (m2.icon || '📚') + ' ' + (m2.name || subId2) + ' · ' + chapters.length + '章节</span>';
        if (isCustomized) {
          html += '<span class="chapter-customized-badge">已选' + selCount + '/' + totalCh + '</span>';
        }
        html += '<span class="chapter-expand-toggle" data-subj="' + subId2 + '">' +
          (isExpanded ? '收起 ▲' : '选择章节 ▶') +
          '</span>';
        if (isExpanded && chapters.length > 0) {
          html += '<span class="chapter-toggle-all" data-action="all" data-subj="' + subId2 + '">全选</span>' +
            '<span class="chapter-toggle-all" data-action="none" data-subj="' + subId2 + '">取消</span>';
        }
        html += '</div><div class="chapter-pills' + (isExpanded ? '' : ' collapsed') + '" data-subj="' + subId2 + '">';
        if (chapters.length === 0) {
          // No chapter data — show single "all questions" pill
          var totalCount = MediCard.QuestionLoader.getSubjectCount(subId2);
          html += '<span class="chapter-pill disabled">全部题目 <em class="ch-pill-count">' + totalCount + '</em></span>';
        } else {
          // Build chapter count map (one scan)
          var rawQ = MediCard.QuestionLoader._getSubjectRaw(subId2);
          var chCount = {};
          if (rawQ) {
            for (var qi = 0; qi < rawQ.length; qi++) {
              var ch = rawQ[qi].chapter;
              if (ch) chCount[ch] = (chCount[ch] || 0) + 1;
            }
          }
          // Build progress data lookup
          var subjProgress = self._chapterProgress[subId2] || {};
          for (var ci = 0; ci < chapters.length; ci++) {
            var chName = chapters[ci];
            var isChSel = chapSel && chapSel.has(chName);
            var chProg = subjProgress[chName];
            var progressHtml = '';
            if (chProg && chProg.sessions > 0) {
              progressHtml = '<span class="ch-pill-dot" title="已学习' + chProg.sessions + '次"></span>';
            }
            html += '<span class="chapter-pill' + (isChSel ? ' selected' : '') + '" data-chapter="' + self._escapeAttr(chName) + '" data-subj="' + subId2 + '">' +
              chName + ' <em class="ch-pill-count">' + (chCount[chName] || 0) + '</em>' + progressHtml +
              '</span>';
          }
        }
        html += '</div></div>';
      }

      // Statistics
      html += '<div class="selection-stats">' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#64748b">' + stats.byDifficulty.common + '</span><span class="selection-stat-label">普通</span></div>' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#06b6d4">' + stats.byDifficulty.rare + '</span><span class="selection-stat-label">稀有</span></div>' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#a855f7">' + stats.byDifficulty.epic + '</span><span class="selection-stat-label">史诗</span></div>' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#fbbf24">' + stats.byDifficulty.legendary + '</span><span class="selection-stat-label">传说</span></div>' +
      '</div>' +
      '<div class="selection-stats">' +
        '<span style="font-size:12px;color:var(--text-muted);">预计游戏时长：约' + Math.floor(stats.total / 60) + '-' + Math.floor(stats.total / 40) + '分钟</span>' +
      '</div>';

      // Action buttons
      html += '<div class="subject-actions">' +
        '<button class="btn btn-primary btn-lg" id="btn-confirm-subjects">' + (self._forMultiplayer ? '🌐 确认并进入房间' : '⚔️ 确认开始') + '</button>' +
        '<button class="btn btn-ghost" id="btn-back-subjects">← 返回</button>' +
      '</div>';

      screen.innerHTML = html;

      // Attach events
      this._attachEvents(screen);
    },

    _attachEvents(screen) {
      var self = this;

      // Subject toggle
      screen.querySelectorAll('.subject-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var subId = this.getAttribute('data-subject');
          if (self._selected.has(subId)) {
            self._selected.delete(subId);
          } else {
            self._selected.add(subId);
          }
          // Save selection
          MediCard.Storage.saveSelectedSubjects([...self._selected]);
          // Refresh stats and UI
          self._renderContent(screen);
        });
        item.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
          }
        });
      });

      // Quick select buttons
      screen.querySelectorAll('.quick-select-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var preset = this.getAttribute('data-preset');
          if (preset === 'all') {
            var all = MediCard.Config.subjectCategories[0].subjects;
            self._selected = new Set(all);
          } else {
            self._selected = new Set(preset.split(','));
          }
          // Reset chapter selections for subjects deselected by quick-select
          var newSel = {};
          for (var subj in self._chapterSelections) {
            if (self._selected.has(subj)) newSel[subj] = self._chapterSelections[subj];
          }
          self._chapterSelections = newSel;
          MediCard.Storage.saveSelectedSubjects([...self._selected]);
          self._renderContent(screen);
        });
      });

      // Chapter expand/collapse toggle
      screen.querySelectorAll('.chapter-expand-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
          e.stopPropagation();
          var subj = this.getAttribute('data-subj');
          self._chapterExpanded[subj] = !self._chapterExpanded[subj];
          // Save expanded state
          MediCard.Storage.set('chapter_expanded', self._chapterExpanded);
          // If collapsing without ever customizing, ensure all chapters selected
          if (!self._chapterExpanded[subj]) {
            var chapters = MediCard.QuestionLoader.getChapters(subj);
            if (!self._chapterSelections[subj] || self._chapterSelections[subj].size === 0) {
              self._chapterSelections[subj] = new Set(chapters);
            }
          }
          self._renderContent(screen);
        });
      });

      // Chapter pill toggles (event delegation on container)
      screen.querySelectorAll('.chapter-pills').forEach(function(pills) {
        pills.addEventListener('click', function(e) {
          var pill = e.target.closest('.chapter-pill');
          if (!pill || pill.classList.contains('disabled')) return;
          var subj = pill.getAttribute('data-subj');
          var chName = pill.getAttribute('data-chapter');
          if (!self._chapterSelections[subj]) self._chapterSelections[subj] = new Set();
          if (self._chapterSelections[subj].has(chName)) {
            self._chapterSelections[subj].delete(chName);
          } else {
            self._chapterSelections[subj].add(chName);
          }
          self._renderContent(screen);
        });
      });

      // Chapter toggle-all links
      screen.querySelectorAll('.chapter-toggle-all').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.stopPropagation();
          var subj = this.getAttribute('data-subj');
          var action = this.getAttribute('data-action');
          var chapters = MediCard.QuestionLoader.getChapters(subj);
          if (action === 'all') {
            self._chapterSelections[subj] = new Set(chapters);
          } else {
            self._chapterSelections[subj] = new Set();
          }
          self._renderContent(screen);
        });
      });

      // Confirm
      var btnConfirm = document.getElementById('btn-confirm-subjects');
      if (btnConfirm) btnConfirm.addEventListener('click', function() {
        if (self._selected.size === 0) {
          alert('请至少选择一个科目！');
          return;
        }
        MediCard.GameState.setSelectedSubjects([...self._selected]);
        MediCard.QuestionLoader.init([...self._selected]);

        // Apply chapter filters
        MediCard.QuestionLoader.clearChapterFilters();
        var chapterMap = {};
        var progressUpdate = {};
        for (var subj in self._chapterSelections) {
          var chSet = self._chapterSelections[subj];
          if (!chSet || chSet.size === 0) continue;
          var allChapters = MediCard.QuestionLoader.getChapters(subj);
          var chArr = Array.from(chSet);
          // Apply filter: always set unless data is loaded AND it's a full selection
          if (allChapters.length === 0 || chSet.size < allChapters.length) {
            MediCard.QuestionLoader.setChapterFilter(subj, chArr);
          }
          chapterMap[subj] = chArr;
          // Track study progress: record sessions per chapter
          var subjProg = self._chapterProgress[subj] || {};
          chSet.forEach(function(ch) {
            var entry = subjProg[ch] || { sessions: 0, lastPlayed: '' };
            entry.sessions += 1;
            entry.lastPlayed = new Date().toISOString();
            subjProg[ch] = entry;
          });
          progressUpdate[subj] = subjProg;
        }
        // Persist chapter selections
        if (MediCard.Storage.saveSelectedChapters) {
          MediCard.Storage.saveSelectedChapters(chapterMap);
        }
        // Persist chapter progress
        if (MediCard.Storage.saveChapterProgress) {
          for (var pSubj in progressUpdate) {
            self._chapterProgress[pSubj] = progressUpdate[pSubj];
          }
          MediCard.Storage.saveChapterProgress(self._chapterProgress);
        }
        // Persist expanded state
        MediCard.Storage.set('chapter_expanded', self._chapterExpanded);

        console.log('[Subject] Confirm: _selectedSubjects=' + JSON.stringify(Array.from(MediCard.QuestionLoader._selectedSubjects)));
        console.log('[Subject] Confirm: _chapterFilters=' + JSON.stringify(MediCard.QuestionLoader._chapterFilters));

        if (self._forMultiplayer) {
          // Go to lobby for online 1v1
          self._forMultiplayer = false;
          MediCard.GameState.goToScreen('lobby');
        } else {
          MediCard.UI.startGame();
        }
      });

      // Back
      var btnBack = document.getElementById('btn-back-subjects');
      if (btnBack) btnBack.addEventListener('click', function() {
        MediCard.GameState.goToScreen('title');
      });
    },

    _escapeAttr: function(str) {
      return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _countInCategory(subjects) {
      var self = this;
      return subjects.filter(function(s) { return self._selected.has(s); }).length;
    },

    _getStats() {
      var self = this;
      var stats = { total: 0, byDifficulty: { common: 0, rare: 0, epic: 0, legendary: 0 }, bySubject: {} };
      var selectedArr = Array.from(self._selected);
      for (var i = 0; i < selectedArr.length; i++) {
        var subj = selectedArr[i];
        var questions = MediCard.QuestionLoader._getSubjectRaw(subj);
        if (!questions || !questions.length) {
          var meta = MediCard.Config.subjectMeta[subj];
          stats.total += meta ? (meta.questionCount || 0) : 0;
          stats.bySubject[subj] = meta ? (meta.questionCount || 0) : 0;
          continue;
        }
        // Apply chapter filter if user has made a partial selection
        var chapSel = self._chapterSelections[subj];
        var allChapters = MediCard.QuestionLoader.getChapters(subj);
        var filterSet = null;
        if (chapSel && chapSel.size > 0 && allChapters.length > 0 && chapSel.size < allChapters.length) {
          filterSet = {};
          chapSel.forEach(function(ch) { filterSet[ch] = true; });
        }
        for (var j = 0; j < questions.length; j++) {
          var q = questions[j];
          if (filterSet && !filterSet[q.chapter]) continue;
          stats.total++;
          var d = q.difficulty || 'common';
          stats.byDifficulty[d] = (stats.byDifficulty[d] || 0) + 1;
        }
        stats.bySubject[subj] = (stats.bySubject[subj] || 0);
      }
      return stats;
    }
  };

  window.MediCard = MediCard;
})();
