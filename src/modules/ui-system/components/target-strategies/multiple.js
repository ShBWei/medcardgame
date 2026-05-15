/**
 * MediCard 医杀 — Target Strategy: Multiple Opponents (3+ players)
 * Shows a modal popup for target selection. Avoids DOM event-destruction
 * caused by _updateMultiplayerOpponents replacing innerHTML of opponent divs.
 */
(function() {
  var MediCard = window.MediCard || {};
  MediCard.TargetStrategies = MediCard.TargetStrategies || {};

  MediCard.TargetStrategies.Multiple = {
    execute: function(ctx) {
      this._showPopup(ctx);
    },

    _showPopup: function(ctx) {
      // Remove any existing popup
      var existing = document.getElementById('attack-target-popup');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'attack-target-popup';
      overlay.className = 'modal-overlay';
      overlay.setAttribute('role', 'presentation');
      overlay.style.cssText = 'z-index:40000;';

      var box = document.createElement('div');
      box.className = 'modal-content';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.style.cssText = 'max-width:360px;width:90%;animation:modalEnter 200ms ease-out;';

      // Title
      var title = document.createElement('div');
      title.style.cssText = 'text-align:center;font-size:15px;font-weight:700;margin-bottom:6px;';
      title.textContent = '🎯 选择攻击目标';
      box.appendChild(title);

      // Subtitle: card name + effect
      var card = ctx.card;
      var subtitle = document.createElement('div');
      subtitle.style.cssText = 'text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:12px;';
      subtitle.textContent = (card ? card.cardName + ' · ' + (card.cardEffect || '') : '');
      box.appendChild(subtitle);

      // Opponent buttons
      var btnList = document.createElement('div');
      btnList.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

      for (var i = 0; i < ctx.alivePlayers.length; i++) {
        var target = ctx.alivePlayers[i];
        var targetIdx = MediCard.GameState.players.indexOf(target);
        (function(tIdx) {
          var btn = document.createElement('button');
          btn.className = 'btn btn-secondary';
          btn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;width:100%;text-align:left;';
          var icon = (target.identityIcon || '👤');
          var name = target.name || ('玩家' + (tIdx + 1));
          var hp = target.resources ? (target.resources.hp.current + '/' + target.resources.hp.max) : '?';
          btn.innerHTML = '<span style="font-size:20px;">' + icon + '</span>' +
            '<span style="flex:1;font-weight:600;">' + _escape(name) + '</span>' +
            '<span style="color:var(--accent-red);font-size:13px;">❤️ ' + hp + '</span>';
          btn.addEventListener('click', function() {
            overlay.remove();
            ctx.onSelect(target);
          });
          btnList.appendChild(btn);
        })(targetIdx);
      }

      // Cancel button
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-ghost';
      cancelBtn.style.cssText = 'margin-top:12px;width:100%;';
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', function() {
        overlay.remove();
        _cleanupEsc();
        if (ctx.onCancel) ctx.onCancel();
      });

      box.appendChild(btnList);
      box.appendChild(cancelBtn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // ESC handler
      var escHandler = function(e) {
        if (e.key === 'Escape') {
          overlay.remove();
          _cleanupEsc();
          if (ctx.onCancel) ctx.onCancel();
        }
      };
      document.addEventListener('keydown', escHandler);

      function _cleanupEsc() {
        document.removeEventListener('keydown', escHandler);
      }

      // Click outside to close
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.remove();
          _cleanupEsc();
          if (ctx.onCancel) ctx.onCancel();
        }
      });
    }
  };

  function _escape(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.MediCard = MediCard;
})();
