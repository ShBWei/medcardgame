/**
 * MediCard Duel — Deck Screen
 * Shows deck composition and card collection
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.ScreenDeck = {
    render() {
      var screen = document.getElementById('screen-deck');
      if (!screen) return;

      var stats = MediCard.QuestionLoader.getSelectionStats();

      var html = '<div style="padding:20px;overflow-y:auto;">' +
        '<h2 style="text-align:center;margin-bottom:16px;">📋 卡组概览</h2>' +
        '<div class="selection-stats" style="margin-bottom:16px;">' +
          '<div class="selection-stat-item"><span class="selection-stat-value">' + stats.total + '</span><span class="selection-stat-label">总卡牌</span></div>' +
          '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#64748b">' + (stats.byDifficulty.common||0) + '</span><span class="selection-stat-label">普通</span></div>' +
          '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#06b6d4">' + (stats.byDifficulty.rare||0) + '</span><span class="selection-stat-label">稀有</span></div>' +
          '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#a855f7">' + (stats.byDifficulty.epic||0) + '</span><span class="selection-stat-label">史诗</span></div>' +
          '<div class="selection-stat-item"><span class="selection-stat-value" style="color:#fbbf24">' + (stats.byDifficulty.legendary||0) + '</span><span class="selection-stat-label">传说</span></div>' +
        '</div>';

      var meta = MediCard.Config.subjectMeta;
      for (var subId in stats.bySubject) {
        var m = meta[subId] || {};
        html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
          '<span style="font-size:20px;">' + (m.icon||'📚') + '</span>' +
          '<span style="flex:1;">' + (m.name||subId) + '</span>' +
          '<span style="color:var(--text-muted);">' + stats.bySubject[subId] + '题</span>' +
          '</div>';
      }

      html += '<div style="text-align:center;margin-top:16px;">' +
        '<button class="btn btn-ghost" onclick="MediCard.GameState.goToScreen(\'title\')">← 返回</button>' +
        '</div></div>';

      screen.innerHTML = html;
    }
  };

  window.MediCard = MediCard;
})();
