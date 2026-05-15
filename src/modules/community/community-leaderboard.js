/**
 * MediCard Community — Dual Leaderboard (V1.0)
 * Battle rank + Contribution rank, weekly/total tabs
 * Injects entry button into title screen — zero modification
 */
(function() {
  var MC = window.MedicalKillCommunity || {};

  MC.Leaderboard = {
    _overlay: null,

    /** Inject leaderboard button into title screen */
    injectButton: function() {
      // Watch for title screen render to inject button
      var self = this;
      var _checkInterval = setInterval(function() {
        var menu = document.querySelector('.title-menu');
        if (menu && !document.getElementById('btn-community-leaderboard')) {
          var btn = document.createElement('button');
          btn.id = 'btn-community-leaderboard';
          btn.className = 'btn btn-secondary btn-lg';
          btn.textContent = '🏆 排行榜';
          btn.addEventListener('click', function() { self.show(); });
          menu.appendChild(btn);
        }
      }, 500);
    },

    show: function() {
      this._removeOverlay();
      var self = this;
      MC.checkWeeklyReset();

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay mkc-overlay';
      overlay.style.zIndex = '4000';
      this._overlay = overlay;

      var content = document.createElement('div');
      content.className = 'mkc-modal';
      content.style.cssText = 'max-width:520px;width:95%;max-height:85vh;overflow-y:auto;animation:modalEnter 250ms ease-out;';

      content.innerHTML = this._renderHTML();
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) self.close(); });
      setTimeout(function() { self._attachEvents(content); }, 50);

      // Fetch global leaderboard from server in background, refresh when ready
      this.fetchFromServer(function(data) {
        if (data && self._overlay) {
          var contentEl = self._overlay.querySelector('.mkc-modal');
          if (contentEl) self._refresh(contentEl);
        }
      });
    },

    close: function() {
      this._removeOverlay();
    },

    _removeOverlay: function() {
      if (this._overlay && this._overlay.parentNode) this._overlay.remove();
      this._overlay = null;
    },

    _renderHTML: function() {
      var currentTab = this._currentTab || 'battle';
      var currentPeriod = this._currentPeriod || 'total';
      return '' +
        '<div class="mkc-lb-header">' +
          '<h3>🏆 排行榜</h3>' +
          '<button class="btn btn-ghost btn-sm mkc-close-btn" id="mkc-lb-close">✕</button>' +
        '</div>' +
        // Tab row — Battle / Contribution
        '<div class="mkc-tabs">' +
          '<button class="mkc-tab ' + (currentTab === 'battle' ? 'active' : '') + '" data-tab="battle">⚔️ 对战实力榜</button>' +
          '<button class="mkc-tab ' + (currentTab === 'contribution' ? 'active' : '') + '" data-tab="contribution">📝 题库贡献榜</button>' +
        '</div>' +
        // Period toggle
        '<div class="mkc-period-toggle">' +
          '<button class="mkc-period-btn ' + (currentPeriod === 'total' ? 'active' : '') + '" data-period="total">总榜</button>' +
          '<button class="mkc-period-btn ' + (currentPeriod === 'weekly' ? 'active' : '') + '" data-period="weekly">周榜</button>' +
        '</div>' +
        // Rankings
        '<div class="mkc-rankings" id="mkc-rankings">' +
          this._renderRankings(currentTab, currentPeriod) +
        '</div>';
    },

    _renderRankings: function(tab, period) {
      var data = tab === 'battle'
        ? this._getBattleData(period)
        : this._getContributionData(period);

      if (data.length === 0) {
        return '<div class="mkc-empty">暂无排行数据<br><small>去玩一局或贡献题目吧！</small></div>';
      }

      var html = '';
      var myId = this._myId();
      var medals = ['👑', '🥈', '🥉'];

      data.slice(0, 20).forEach(function(entry, idx) {
        var isMe = entry.userId === myId;
        var medalHtml = idx < 3 ? '<span class="mkc-medal">' + medals[idx] + '</span>' : '<span class="mkc-rank-num">' + (idx + 1) + '</span>';
        var nameClass = idx < 3 ? ' mkc-name-gold' : '';
        html += '<div class="mkc-rank-item' + (isMe ? ' mkc-is-me' : '') + '">' +
          '<div class="mkc-rank-badge">' + medalHtml + '</div>' +
          '<div class="mkc-rank-info">' +
            '<span class="mkc-rank-name' + nameClass + '">' + _esc(entry.name || '匿名') + '</span>' +
            '<span class="mkc-rank-detail">' + (tab === 'battle'
              ? '积分:' + (entry.score || 0) + ' · ' + (entry.wins || 0) + '胜 · 胜率' + (entry.winRate || 0) + '%'
              : '信誉:' + (entry.reputation || 0) + ' · 贡献' + (entry.totalValue || 0) + ' · 通过' + (entry.approved || 0) + '题') +
            '</span>' +
          '</div>' +
          '<div class="mkc-rank-score">' + (tab === 'battle'
            ? '<b>' + (entry.score || 0) + '</b><small>分</small>'
            : '<b>' + (entry.reputation || 0) + '</b><small>分</small>') +
          '</div>' +
          (idx < 3 ? '<button class="btn btn-ghost btn-sm mkc-share-btn" data-rank="' + (idx + 1) + '" data-tab="' + tab + '">📤</button>' : '') +
        '</div>';
      });

      // My rank at bottom
      var myRank = -1;
      for (var i = 0; i < data.length; i++) {
        if (data[i].userId === myId) { myRank = i + 1; break; }
      }
      if (myRank > 20 || myRank < 0) {
        var myEntry = null;
        for (var j = 0; j < data.length; j++) {
          if (data[j].userId === myId) { myEntry = data[j]; break; }
        }
        if (myEntry) {
          html += '<div class="mkc-rank-divider">··· 我的排名 ···</div>';
          html += '<div class="mkc-rank-item mkc-is-me" style="margin-top:0;">' +
            '<div class="mkc-rank-badge"><span class="mkc-rank-num">' + myRank + '</span></div>' +
            '<div class="mkc-rank-info">' +
              '<span class="mkc-rank-name">' + _esc(myEntry.name || '匿名') + '</span>' +
              '<span class="mkc-rank-detail">' + (tab === 'battle'
                ? '积分:' + (myEntry.score || 0) + ' · ' + (myEntry.wins || 0) + '胜'
                : '信誉:' + (myEntry.reputation || 0) + ' · 贡献' + (myEntry.totalValue || 0)) +
              '</span>' +
            '</div>' +
            '<div class="mkc-rank-score">' +
              '<b>' + (tab === 'battle' ? (myEntry.score || 0) : (myEntry.reputation || 0)) + '</b><small>分</small>' +
            '</div>' +
          '</div>';
        }
      }

      return html;
    },

    _getBattleData: function(period) {
      // Try fetching from server first for global rankings
      var self = this;
      if (this._serverData && this._serverData.battle) {
        return this._serverData.battle;
      }

      var cached = MC.getLeaderboard('battle', period);
      if (cached.length > 0) return cached;

      // Build from game stats (local fallback)
      var allStats = {};
      try {
        var users = JSON.parse(localStorage.getItem('medicard_users') || '[]');
        var allKeys = [];
        for (var k = 0; k < localStorage.length; k++) {
          var key = localStorage.key(k);
          if (key && key.indexOf('medicard_u_') === 0 && key.indexOf('_game_stats') > 0) {
            allKeys.push(key);
          }
        }
        allKeys.forEach(function(key) {
          var uid = key.replace('medicard_u_', '').replace('_game_stats', '');
          try {
            var stats = JSON.parse(localStorage.getItem(key)) || [];
            var wins = stats.filter(function(s) { return s.won; }).length;
            var score = stats.reduce(function(a, s) { return a + (s.score || 0); }, 0);
            var winRate = stats.length > 0 ? Math.round(wins / stats.length * 100) : 0;
            var name = '';
            for (var ui = 0; ui < users.length; ui++) {
              if (users[ui].id === uid) { name = users[ui].username; break; }
            }
            allStats[uid] = {
              userId: uid, name: name || uid, score: Math.round(score),
              wins: wins, totalGames: stats.length, winRate: winRate, maxStreak: 0
            };
          } catch(e) {}
        });
      } catch(e) {}

      var list = Object.values(allStats);
      list.sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
      });
      return list;
    },

    _getContributionData: function(period) {
      if (this._serverData && this._serverData.contribution) {
        return this._serverData.contribution;
      }
      return MC.getLeaderboard('contribution', period);
    },

    /** Fetch leaderboard from server */
    fetchFromServer: function(callback) {
      var self = this;
      fetch('/api/leaderboard?type=battle&period=total')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (Array.isArray(data)) {
            self._serverData = self._serverData || {};
            self._serverData.battle = data;
          }
          return fetch('/api/leaderboard?type=contribution&period=total');
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (Array.isArray(data)) {
            self._serverData = self._serverData || {};
            self._serverData.contribution = data;
          }
          if (callback) callback(self._serverData);
        })
        .catch(function() {
          // Server unavailable, fall back to localStorage
          if (callback) callback(null);
        });
    },

    /** Push stats to server after game ends. Retries on failure + offline queue. */
    pushToServer: function(entry, weekly) {
      if (!entry || !entry.userId) return;
      var payload = [entry];
      if (weekly) {
        payload.push(Object.assign({}, entry, { weekly: true }));
      }
      var self = this;
      _doPush(payload, 0);

      function _doPush(data, attempt) {
        fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function(res) {
          if (res.ok) {
            // Success — flush any queued entries
            _flushQueue();
          } else if (attempt < 2) {
            setTimeout(function() { _doPush(data, attempt + 1); }, 2000 * (attempt + 1));
          } else {
            _enqueue(data);
          }
        }).catch(function() {
          if (attempt < 2) {
            setTimeout(function() { _doPush(data, attempt + 1); }, 2000 * (attempt + 1));
          } else {
            _enqueue(data);
          }
        });
      }

      function _enqueue(data) {
        try {
          var q = JSON.parse(localStorage.getItem('mkc_push_queue') || '[]');
          q.push({ data: data, ts: Date.now() });
          if (q.length > 20) q = q.slice(-20);
          localStorage.setItem('mkc_push_queue', JSON.stringify(q));
        } catch(e) {}
      }

      function _flushQueue() {
        try {
          var q = JSON.parse(localStorage.getItem('mkc_push_queue') || '[]');
          if (!q.length) return;
          var batch = [];
          q.forEach(function(item) { batch = batch.concat(item.data); });
          localStorage.removeItem('mkc_push_queue');
          fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch)
          }).catch(function() {
            // Re-enqueue on failure
            localStorage.setItem('mkc_push_queue', JSON.stringify(q));
          });
        } catch(e) {}
      }
    },

    /** Try to flush any queued leaderboard pushes (call on app start) */
    flushPendingPushes: function() {
      try {
        var q = JSON.parse(localStorage.getItem('mkc_push_queue') || '[]');
        if (q.length > 0) {
          var batch = [];
          q.forEach(function(item) { batch = batch.concat(item.data); });
          localStorage.removeItem('mkc_push_queue');
          fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch)
          }).catch(function() { /* will retry next game end */ });
        }
      } catch(e) {}
    },

    _myId: function() {
      try {
        var raw = localStorage.getItem('medicard_current_user_id');
        return raw ? JSON.parse(raw) : '';
      } catch(e) { return ''; }
    },

    _attachEvents: function(content) {
      var self = this;

      // Tab switching
      content.querySelectorAll('.mkc-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
          self._currentTab = this.getAttribute('data-tab');
          self._refresh(content);
        });
      });

      // Period switching
      content.querySelectorAll('.mkc-period-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          self._currentPeriod = this.getAttribute('data-period');
          self._refresh(content);
        });
      });

      // Close
      var closeBtn = content.querySelector('#mkc-lb-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

      // Share buttons
      content.querySelectorAll('.mkc-share-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rank = this.getAttribute('data-rank');
          var tab = this.getAttribute('data-tab');
          var label = tab === 'battle' ? '对战实力榜' : '题库贡献榜';
          var text = '我在医学杀' + label + '排第' + rank + '名，敢来挑战吗？';
          _tryShare(text);
        });
      });
    },

    _refresh: function(content) {
      content.innerHTML = this._renderHTML();
      this._attachEvents(content);
    }
  };

  /* ============ Helpers ============ */
  function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function _tryShare(text) {
    if (navigator.share) {
      navigator.share({ title: 'MediCard 医杀', text: text }).catch(function() {});
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-100px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        alert('已复制分享文案：\n' + text);
      } catch(e) {}
    }
  }

  // Auto-inject on DOM ready
  function _tryInject() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { MC.Leaderboard.injectButton(); });
    } else {
      MC.Leaderboard.injectButton();
    }
  }
  _tryInject();

  // Flush any queued leaderboard pushes from previous session
  setTimeout(function() { MC.Leaderboard.flushPendingPushes(); }, 3000);

  console.log('[MKC] Leaderboard module loaded');
})();
