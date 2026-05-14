/**
 * MediCard 医杀 — Result Screen (Enhanced)
 * Detailed game stats, accuracy, damage, review
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenResult = {
    _lastStats: null,

    render() {
      var screen = document.getElementById('screen-result');
      if (!screen) return;

      var stats = MediCard.Storage.getGameStats();
      var lastGame = stats[stats.length - 1] || {};
      var won = lastGame.won;
      var score = lastGame.score || 0;
      var accuracy = lastGame.accuracy || 0;
      var accuracyDetail = lastGame.accuracyDetail || '0/0';
      var damageDealt = lastGame.damageDealt || 0;
      var damageTaken = lastGame.damageTaken || 0;
      var cardsPlayed = lastGame.cardsPlayed || 0;
      var difficulty = lastGame.difficulty || 'normal';
      var diffLabels = { easy: '简单', normal: '普通', hard: '困难' };
      var totalGames = stats.length;
      var wins = stats.filter(function(s) { return s.won; }).length;
      var winRate = totalGames > 0 ? Math.round(wins / totalGames * 100) : 0;

      // Recent 10 games accuracy
      var recent10 = stats.slice(-10);
      var recentAcc = recent10.length > 0
        ? Math.round(recent10.reduce(function(a, s) { return a + (s.accuracy || 0); }, 0) / recent10.length)
        : 0;

      var html = '' +
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;padding:24px;text-align:center;overflow-y:auto;">' +
        // Result icon
        '<div style="font-size:72px;animation:bounceIn 500ms ease-out;margin-top:16px;">' + (won ? '🏆' : '💀') + '</div>' +
        '<h2 style="font-size:28px;font-weight:900;margin:12px 0 4px;color:' + (won ? 'var(--accent-yellow)' : 'var(--accent-red)') + '">' +
          (won ? '胜利！' : '失败...') +
        '</h2>' +
        '<p style="color:var(--text-muted);margin-bottom:20px;font-size:13px;">' +
          (won ? '你成功击败了AI对手！' : '再接再厉，继续学习，下次一定能赢！') +
          ' · 难度：' + (diffLabels[difficulty] || '普通') +
        '</p>' +
        // Score display
        '<div style="margin-bottom:8px;">' +
          '<div style="font-size:42px;font-weight:900;font-family:var(--font-mono);color:#fbbf24;text-shadow:0 0 20px rgba(251,191,36,0.3);">' + score + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">本局得分 · 答对' + accuracyDetail.split('/')[0] + '题</div>' +
        '</div>';

      // Detailed stats card
      html += '<div class="glass-panel" style="width:100%;max-width:360px;padding:16px;margin-bottom:16px;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;">' +
          '<div>' +
            '<div style="font-size:28px;font-weight:900;font-family:var(--font-mono);color:' + (accuracy >= 60 ? '#10b981' : accuracy >= 40 ? '#fbbf24' : '#ef4444') + ';">' + accuracy + '%</div>' +
            '<div style="font-size:11px;color:var(--text-muted);">答题正确率</div>' +
            '<div style="font-size:10px;color:var(--text-muted);">' + accuracyDetail + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:28px;font-weight:900;font-family:var(--font-mono);color:#ef4444;">' + damageDealt + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);">造成伤害</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:28px;font-weight:900;font-family:var(--font-mono);color:#f97316;">' + damageTaken + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);">受到伤害</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:28px;font-weight:900;font-family:var(--font-mono);color:var(--accent-cyan);">' + cardsPlayed + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);">使用卡牌</div>' +
          '</div>' +
        '</div>' +
        '</div>';

      // Overall stats
      html += '<div class="glass-panel" style="width:100%;max-width:360px;padding:12px 16px;margin-bottom:20px;">' +
        '<div style="display:flex;justify-content:space-around;text-align:center;">' +
          '<div><div style="font-size:20px;font-weight:900;">' + totalGames + '</div><div style="font-size:10px;color:var(--text-muted);">总局数</div></div>' +
          '<div><div style="font-size:20px;font-weight:900;color:#fbbf24;">' + wins + '</div><div style="font-size:10px;color:var(--text-muted);">胜场</div></div>' +
          '<div><div style="font-size:20px;font-weight:900;color:' + (winRate >= 50 ? '#10b981' : '#ef4444') + ';">' + winRate + '%</div><div style="font-size:10px;color:var(--text-muted);">总胜率</div></div>' +
          '<div><div style="font-size:20px;font-weight:900;color:var(--accent-cyan);">' + recentAcc + '%</div><div style="font-size:10px;color:var(--text-muted);">近10场</div></div>' +
        '</div>' +
        '</div>';

      // Action buttons
      html += '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">' +
        '<button class="btn btn-primary btn-lg" id="btn-play-again">🔄 再来一局</button>' +
        '<button class="btn btn-secondary" id="btn-review">📝 复习错题</button>' +
        '<button class="btn btn-ghost" id="btn-result-home">🏠 返回主页</button>' +
        '</div>' +
      '</div>';

      screen.innerHTML = html;

      document.getElementById('btn-play-again').addEventListener('click', function() {
        MediCard.GameState.goToScreen('subject');
      });
      document.getElementById('btn-review').addEventListener('click', function() {
        if (MediCard.WrongQuestionBook && MediCard.WrongQuestionBook.getCount('wrong') > 0) {
          MediCard.GameState.goToScreen('notebook');
        } else if (window._medicardOpenNotebook) {
          window._medicardOpenNotebook();
        } else {
          alert('📝 错题本空空如也！\n\n答题时答错的题目会自动记录到错题本中。');
        }
      });
      document.getElementById('btn-result-home').addEventListener('click', function() {
        MediCard.GameState.goToScreen('title');
      });
    }
  };

  window.MediCard = MediCard;
})();
