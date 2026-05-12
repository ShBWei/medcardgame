/**
 * MediCard Duel — Subject Selection Screen
 * 8 subjects with checkboxes and quick-select presets
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenSubject = {
    _selected: new Set(),
    _forMultiplayer: false,

    render() {
      var screen = document.getElementById('screen-subject');
      if (!screen) return;

      // Restore saved selection
      var saved = MediCard.Storage.getSelectedSubjects();
      if (saved && saved.length > 0) {
        this._selected = new Set(saved);
      } else {
        // Default: select all 8 subjects
        var allSubjects = MediCard.Config.subjectCategories[0].subjects;
        this._selected = new Set(allSubjects);
      }

      this._renderContent(screen);
    },

    _renderContent(screen) {
      var self = this;
      var allSubjects = MediCard.Config.subjectCategories[0].subjects;
      var stats = this._getStats();
      var meta = MediCard.Config.subjectMeta;

      var html = '' +
        '<div class="subject-header">' +
          '<h2>📚 科目选择</h2>' +
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
        var questions = MediCard.QuestionLoader.getSubject(subId);
        var isSelected = self._selected.has(subId);
        html += '<div class="subject-item' + (isSelected ? ' selected' : '') + '" data-subject="' + subId + '">' +
          '<span class="subject-item-icon">' + (m.icon || '📚') + '</span>' +
          '<div class="subject-item-info">' +
            '<div class="subject-item-name">' + (m.name || subId) + '</div>' +
            '<div class="subject-item-count">' + questions.length + '题</div>' +
          '</div>' +
          '<div class="subject-item-check">✓</div>' +
        '</div>';
      });

      html += '</div></div>';

      // Statistics
      html += '<div class="selection-stats">' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#64748b">' + stats.common + '</span><span class="selection-stat-label">普通</span></div>' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#06b6d4">' + stats.rare + '</span><span class="selection-stat-label">稀有</span></div>' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#a855f7">' + stats.epic + '</span><span class="selection-stat-label">史诗</span></div>' +
        '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#fbbf24">' + stats.legendary + '</span><span class="selection-stat-label">传说</span></div>' +
      '</div>' +
      '<div class="selection-stats">' +
        '<span style="font-size:12px;color:var(--text-muted);">预计游戏时长：约' + Math.floor(stats.total / 60) + '-' + Math.floor(stats.total / 40) + '分钟</span>' +
      '</div>';

      // Action buttons
      html += '<div class="subject-actions">' +
        '<button class="btn btn-primary btn-lg" id="btn-confirm-subjects">⚔️ 确认开始</button>' +
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
          MediCard.Storage.saveSelectedSubjects([...self._selected]);
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

    _countInCategory(subjects) {
      var self = this;
      return subjects.filter(function(s) { return self._selected.has(s); }).length;
    },

    _getStats() {
      var self = this;
      var stats = { total: 0, common: 0, rare: 0, epic: 0, legendary: 0 };
      self._selected.forEach(function(subId) {
        var questions = MediCard.QuestionLoader.getSubject(subId);
        stats.total += questions.length;
        questions.forEach(function(q) {
          stats[q.difficulty] = (stats[q.difficulty] || 0) + 1;
        });
      });
      return stats;
    }
  };

  window.MediCard = MediCard;
})();
