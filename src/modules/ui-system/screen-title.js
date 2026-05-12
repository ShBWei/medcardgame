/**
 * MediCard 医杀 — Title Screen (V5.2)
 */
(function() {
  var MediCard = window.MediCard || {};

  // Expose click handlers globally so inline onclick works
  window._medicardGoSingle = function() {
    MediCard.Audio.playButtonClick();
    _showDifficultyPicker(function(difficulty) {
      MediCard.Storage.set('difficulty', difficulty);
      MediCard.GameState.setMode('single');
      MediCard.GameState.goToScreen('subject');
    });
  };

  function _showDifficultyPicker(callback) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';

    var content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'max-width:380px;text-align:center;animation:modalEnter 250ms ease-out;';

    var difficulties = [
      { id: 'easy', name: '简单', desc: 'AI正确率50%', icon: '🌱', color: '#10b981' },
      { id: 'normal', name: '普通', desc: 'AI正确率70%', icon: '⚔️', color: '#fbbf24' },
      { id: 'hard', name: '困难', desc: 'AI正确率90%', icon: '💀', color: '#ef4444' }
    ];

    var currentDifficulty = MediCard.Storage.get('difficulty', 'normal');

    var html = '<h3 style="margin-bottom:8px;">选择AI难度</h3><p style="color:var(--text-muted);font-size:12px;margin-bottom:16px;">AI答题正确率越高，越难对付</p>';

    difficulties.forEach(function(d) {
      var isSelected = d.id === currentDifficulty;
      html += '<button class="btn btn-lg" style="display:block;width:100%;margin-bottom:8px;text-align:left;' +
        'background:' + (isSelected ? d.color + '22' : 'var(--bg-tertiary)') + ';' +
        'border:2px solid ' + (isSelected ? d.color : 'rgba(100,116,139,0.3)') + ';' +
        'color:' + (isSelected ? d.color : 'var(--text-primary)') + ';' +
        'border-radius:12px;padding:14px 18px;" data-diff="' + d.id + '">' +
        '<span style="font-size:24px;margin-right:12px;">' + d.icon + '</span>' +
        '<span style="font-weight:700;font-size:16px;">' + d.name + '</span>' +
        '<span style="float:right;font-size:12px;color:var(--text-muted);margin-top:4px;">' + d.desc + '</span>' +
        '</button>';
    });

    html += '<button class="btn btn-ghost btn-sm" style="margin-top:8px;" id="diff-cancel">取消</button>';
    content.innerHTML = html;
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    content.querySelectorAll('[data-diff]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var diff = this.getAttribute('data-diff');
        overlay.remove();
        if (callback) callback(diff);
      });
    });

    document.getElementById('diff-cancel').addEventListener('click', function() {
      overlay.remove();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
  }
  window._medicardGoMulti = function() {
    MediCard.Audio.playButtonClick();
    MediCard.GameState.setMode('multiplayer');
    MediCard.ScreenSubject._forMultiplayer = true;
    MediCard.GameState.goToScreen('subject');
  };
  window._medicardShowStats = function() {
    MediCard.Audio.playButtonClick();
    var stats = MediCard.Storage.getGameStats();
    var wrongQs = MediCard.Storage.getWrongQuestions();
    var totalGames = stats.length;
    var wins = stats.filter(function(s) { return s.won; }).length;
    var winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(0) : 0;
    var recent10 = stats.slice(-10);
    var recentAcc = recent10.length > 0
      ? (recent10.reduce(function(a,s){return a+(s.accuracy||0);},0) / recent10.length).toFixed(1)
      : '0.0';
    var totalDmgDealt = stats.reduce(function(a,s){return a+(s.damageDealt||0);},0);
    var totalDmgTaken = stats.reduce(function(a,s){return a+(s.damageTaken||0);},0);

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';

    var content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'max-width:420px;animation:modalEnter 250ms ease-out;padding:24px;';

    content.innerHTML = '' +
      '<h3 style="margin:0 0 16px;text-align:center;">📊 学习统计</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;margin-bottom:16px;">' +
        '<div class="glass-panel" style="padding:12px;">' +
          '<div style="font-size:24px;font-weight:900;color:var(--accent-cyan);">' + totalGames + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">总局数</div>' +
        '</div>' +
        '<div class="glass-panel" style="padding:12px;">' +
          '<div style="font-size:24px;font-weight:900;color:#fbbf24;">' + wins + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">胜场</div>' +
        '</div>' +
        '<div class="glass-panel" style="padding:12px;">' +
          '<div style="font-size:24px;font-weight:900;color:' + (winRate >= 50 ? '#10b981' : '#ef4444') + ';">' + winRate + '%</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">胜率</div>' +
        '</div>' +
        '<div class="glass-panel" style="padding:12px;">' +
          '<div style="font-size:24px;font-weight:900;color:var(--accent-cyan);">' + recentAcc + '%</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">近10场正确率</div>' +
        '</div>' +
      '</div>' +
      '<div class="glass-panel" style="padding:10px 14px;margin-bottom:12px;text-align:center;">' +
        '<span style="font-size:12px;">⚔️ 造成伤害 <b>' + totalDmgDealt + '</b></span>' +
        '<span style="margin:0 16px;">|</span>' +
        '<span style="font-size:12px;">💔 受到伤害 <b>' + totalDmgTaken + '</b></span>' +
        '<span style="margin:0 16px;">|</span>' +
        '<span style="font-size:12px;">📝 错题 <b>' + wrongQs.length + '</b></span>' +
      '</div>' +
      '<button class="btn btn-ghost btn-sm" id="stats-close" style="display:block;margin:0 auto;">关闭</button>';

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    document.getElementById('stats-close').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  };

  MediCard.ScreenTitle = {
    render() {
      var screen = document.getElementById('screen-title');
      if (!screen) return;
      var stats = MediCard.Storage.getGameStats();
      var winCount = stats.filter(function(s) { return s.won; }).length;
      var totalGames = stats.length;
      var totalQuestions = 0;
      MediCard.Config.subjectCategories[0].subjects.forEach(function(s) {
        var q = MediCard.QuestionLoader.getSubject(s);
        totalQuestions += q.length;
      });

      var currentUser = MediCard.Storage.getCurrentUser();
      var username = currentUser ? currentUser.username : '医学战士';
      var avatarColor = currentUser ? currentUser.avatarColor : '#06b6d4';
      var avatarIcon = currentUser ? currentUser.avatarIcon : '👨‍⚕️';

      screen.innerHTML = '' +
        '<div class="title-logo">' +
          '<div class="title-logo-icon">⚕️</div>' +
          '<h1 class="title-game-name">MediCard 医杀</h1>' +
          '<p class="title-subtitle">医学知识 · 策略对战</p>' +
          '<p class="title-version">V5.2 · ' + MediCard.Config.subjectCategories[0].subjects.length + '学科 · ' + totalQuestions + '题</p>' +
        '</div>' +
        '<div class="title-user-bar">' +
          '<span class="title-user-avatar" style="background:' + avatarColor + ';">' + avatarIcon + '</span>' +
          '<span class="title-user-name">' + _esc(username) + '</span>' +
          '<button class="btn btn-ghost btn-sm" id="btn-logout">切换账号</button>' +
        '</div>' +
        '<div class="title-menu stagger-children">' +
          '<button class="btn btn-primary btn-lg" id="btn-single">⚔️ 单人练习</button>' +
          '<button class="btn btn-gold btn-lg" id="btn-multi">🌐 联机对战</button>' +
          '<button class="btn btn-ghost" id="btn-stats">📊 学习统计</button>' +
        '</div>' +
        (totalGames > 0 ? '<div class="title-stats">' +
          '<span>🎮 ' + totalGames + '场</span>' +
          '<span>🏆 ' + winCount + '胜</span>' +
          '<span>📈 ' + (totalGames > 0 ? (winCount/totalGames*100).toFixed(0) : 0) + '%胜率</span>' +
        '</div>' : '');
    },

    attachEvents() {
      var btnSingle = document.getElementById('btn-single');
      var btnMulti = document.getElementById('btn-multi');
      var btnStats = document.getElementById('btn-stats');
      var btnLogout = document.getElementById('btn-logout');

      if (btnSingle) btnSingle.addEventListener('click', function(e) { window._medicardGoSingle(); });
      if (btnMulti) btnMulti.addEventListener('click', function(e) { window._medicardGoMulti(); });
      if (btnStats) btnStats.addEventListener('click', function() { window._medicardShowStats(); });

      if (btnLogout) {
        btnLogout.addEventListener('click', function() {
          if (confirm('确定要切换账号吗？游戏数据不会丢失。')) {
            MediCard.Storage.remove('current_user_id');
            MediCard.GameState.goToScreen('auth');
          }
        });
      }
    }
  };

  function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.MediCard = MediCard;
})();
