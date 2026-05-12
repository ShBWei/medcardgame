/**
 * MediCard Community — Random Challenge (V1.0)
 * Daily random questions from community pool, 10/day limit
 * Injects button into title screen
 */
(function() {
  var MC = window.MedicalKillCommunity || {};

  MC.Challenge = {
    _overlay: null,
    _currentQ: null,
    _answered: false,

    injectButton: function() {
      var self = this;
      var _checkInterval = setInterval(function() {
        var menu = document.querySelector('.title-menu');
        if (menu && !document.getElementById('btn-random-challenge')) {
          var btn = document.createElement('button');
          btn.id = 'btn-random-challenge';
          btn.className = 'btn btn-ghost btn-lg';
          btn.textContent = '🎲 随机挑战';
          btn.style.cssText = 'background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(249,115,22,0.1));border:1px solid rgba(168,85,247,0.3);';
          btn.addEventListener('click', function() { self.start(); });
          menu.appendChild(btn);
          clearInterval(_checkInterval);
        }
      }, 500);
    },

    start: function() {
      if (!MC.canChallengeToday()) {
        alert('今天的随机挑战次数已用完（每日10次），明天再来吧！');
        return;
      }

      var pool = MC.getApprovedQuestions();
      if (pool.length === 0) {
        alert('还没有社区题目，去"题库共建"贡献题目吧！');
        return;
      }

      var q = pool[Math.floor(Math.random() * pool.length)];
      this._currentQ = q;
      this._answered = false;
      this._showQuestion(q);
    },

    _showQuestion: function(q) {
      this._removeOverlay();
      var self = this;

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay mkc-overlay';
      overlay.style.zIndex = '4000';
      this._overlay = overlay;

      var content = document.createElement('div');
      content.className = 'mkc-modal';
      content.style.cssText = 'max-width:500px;width:95%;animation:modalEnter 250ms ease-out;';

      var isMobile = window.innerWidth <= 480;

      // Shuffle options
      var rawOpts = q.options || [];
      var opts = [];
      for (var oi = 0; oi < rawOpts.length; oi++) {
        var s = rawOpts[oi];
        opts.push({ letter: s.charAt(0), text: s.substring(2), display: s });
      }
      // Shuffle
      for (var si = opts.length - 1; si > 0; si--) {
        var sj = Math.floor(Math.random() * (si + 1));
        var tmp = opts[si]; opts[si] = opts[sj]; opts[sj] = tmp;
      }

      var html = '' +
        '<div class="mkc-lb-header">' +
          '<h3>🎲 随机挑战</h3>' +
          '<span style="font-size:11px;color:var(--text-muted);">社区题目 · 答对+2金币</span>' +
          '<button class="btn btn-ghost btn-sm mkc-close-btn" id="mkc-ch-close">✕</button>' +
        '</div>' +
        '<div style="padding:4px 0;">' +
          '<div style="font-size:12px;color:var(--accent-cyan);margin-bottom:4px;">' +
            (q.subject || '综合') + ' · 出题者：' + _esc(q.submitterName || '匿名') +
          '</div>' +
          '<div style="font-size:' + (isMobile ? '15px' : '16px') + ';font-weight:600;line-height:1.6;margin-bottom:16px;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;">' + _esc(q.question || '') + '</div>' +
          '<div id="mkc-ch-options" style="display:flex;flex-direction:column;gap:8px;">';

      opts.forEach(function(opt) {
        html += '<button class="btn btn-secondary mkc-ch-opt" data-letter="' + opt.letter + '" style="text-align:left;padding:12px 16px;width:100%;min-height:44px;font-size:' + (isMobile ? '14px' : '13px') + ';">' + _esc(opt.display) + '</button>';
      });

      html += '</div>' +
        '<div id="mkc-ch-feedback" style="margin-top:12px;"></div>' +
        '<div id="mkc-ch-continue" style="display:none;margin-top:12px;">' +
          '<button class="btn btn-primary" id="mkc-ch-next" style="width:100%;">再来一题</button>' +
          '<button class="btn btn-ghost btn-sm" id="mkc-ch-back" style="width:100%;margin-top:8px;">返回主界面</button>' +
        '</div>' +
      '</div>';

      content.innerHTML = html;
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) self.close(); });

      var self2 = this;
      setTimeout(function() {
        var closeBtn = content.querySelector('#mkc-ch-close');
        if (closeBtn) closeBtn.addEventListener('click', function() { self2.close(); });

        content.querySelectorAll('.mkc-ch-opt').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (self2._answered) return;
            self2._answered = true;
            MC.recordChallenge();

            var choice = this.getAttribute('data-letter');
            var correctAnswers = q.correctAnswers || [];
            var isCorrect = correctAnswers.indexOf(choice) >= 0;

            // Update button styles
            content.querySelectorAll('.mkc-ch-opt').forEach(function(b) {
              b.disabled = true;
              var bl = b.getAttribute('data-letter');
              if (correctAnswers.indexOf(bl) >= 0) {
                b.style.background = 'rgba(16,185,129,0.3)';
                b.style.borderColor = '#10b981';
                b.style.color = '#6ee7b7';
              }
              if (bl === choice && !isCorrect) {
                b.style.background = 'rgba(239,68,68,0.3)';
                b.style.borderColor = '#ef4444';
                b.style.color = '#fca5a5';
              }
            });

            var fb = document.getElementById('mkc-ch-feedback');
            if (fb) {
              fb.innerHTML = isCorrect
                ? '<div style="padding:10px;background:rgba(16,185,129,0.1);border-radius:8px;color:#6ee7b7;">✅ 回答正确！+2金币奖励已发放</div>'
                : '<div style="padding:10px;background:rgba(239,68,68,0.1);border-radius:8px;color:#fca5a5;">❌ 回答错误，再接再厉！<br><span style="font-size:12px;color:var(--text-secondary);">' + (q.explanation || '') + '</span></div>';
            }

            // Reward
            if (isCorrect) {
              // Add coins to player (inject into existing storage)
              try {
                var playerData = JSON.parse(localStorage.getItem('medicard_player_data') || '{}');
                playerData.coins = (playerData.coins || 0) + 2;
                localStorage.setItem('medicard_player_data', JSON.stringify(playerData));
              } catch(e) {}
            }

            var cont = document.getElementById('mkc-ch-continue');
            if (cont) cont.style.display = 'block';
          });
        });

        var nextBtn = content.querySelector('#mkc-ch-next');
        var backBtn = content.querySelector('#mkc-ch-back');
        if (nextBtn) nextBtn.addEventListener('click', function() { self2.close(); self2.start(); });
        if (backBtn) backBtn.addEventListener('click', function() { self2.close(); });
      }, 50);
    },

    close: function() {
      this._removeOverlay();
    },

    _removeOverlay: function() {
      if (this._overlay && this._overlay.parentNode) this._overlay.remove();
      this._overlay = null;
    }
  };

  function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // Auto-inject
  function _tryInject() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { MC.Challenge.injectButton(); });
    } else {
      MC.Challenge.injectButton();
    }
  }
  _tryInject();

  console.log('[MKC] Challenge module loaded');
})();
