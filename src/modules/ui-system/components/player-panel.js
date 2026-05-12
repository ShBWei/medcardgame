/**
 * MediCard 医杀 — Player Panel Component (V5.2)
 * Displays player HP hearts, identity
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.PlayerPanel = {
    render(player, containerId, isOpponent) {
      var container = document.getElementById(containerId);
      if (!container) return;

      var res = player.resources || {};
      var identity = player.identity;
      var meta = MediCard.IdentityData.getIdentityInfo(identity);

      var html = '<div class="' + (isOpponent ? 'opponent-info' : 'player-status-bar') + '">';

      // Name and identity line
      html += '<div class="player-info-header" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
      if (isOpponent) {
        html += '<span class="player-name" style="font-weight:700;font-size:14px;">' + (player.name || '对手') + '</span>';
        if (player.identityRevealed && meta) {
          html += '<span class="identity-badge" style="font-size:12px;color:' + meta.color + ';">' + meta.icon + ' ' + meta.name + '</span>';
        } else if (player.isAI) {
          html += '<span class="identity-badge" style="font-size:12px;color:#64748b;">🤖 AI</span>';
        }
      } else {
        html += '<span class="player-name" style="font-weight:700;font-size:14px;">' + (player.name || '你') + '</span>';
        if (meta) {
          html += '<span class="identity-badge" style="font-size:12px;color:' + meta.color + ';">' + meta.icon + ' ' + meta.name + '</span>';
        }
      }
      html += '</div>';

      // HP hearts (1❤️ = 1HP)
      html += this._renderHearts(res.hp);

      if (!isOpponent) {
        html += '<div class="player-resource" style="margin-top:4px;">' +
          '<span class="label" style="font-size:11px;color:var(--text-muted);">HP</span>' +
          '<span class="value" style="color:#10b981;font-weight:700;">' + (res.hp ? res.hp.current + '/' + res.hp.max : '0/4') + '</span>' +
          '</div>';
      }

      html += '</div>';
      container.innerHTML = html;
    },

    _renderHearts(hp) {
      if (!hp) return '';
      var maxHP = hp.max || 4;
      var currentHP = hp.current || 0;
      var html = '<div class="hp-hearts" style="display:flex;align-items:center;gap:2px;font-size:18px;">';
      for (var i = 0; i < maxHP; i++) {
        if (i < currentHP) {
          html += '<span class="hp-heart full" style="filter:drop-shadow(0 0 3px rgba(239,68,68,0.5));">❤️</span>';
        } else {
          html += '<span class="hp-heart empty" style="opacity:0.3;">🤍</span>';
        }
      }
      html += '<span class="hp-num" style="font-size:12px;color:var(--text-secondary);margin-left:6px;">' + currentHP + '/' + maxHP + '</span>';
      html += '</div>';
      return html;
    },

    updateResources(player, containerId) {
      this.render(player, containerId, true);
    }
  };

  window.MediCard = MediCard;
})();
