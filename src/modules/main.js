/**
 * MediCard Duel — Main Bootstrap
 * Application entry point, screen management, initialization
 */
(function() {
  var MediCard = window.MediCard || {};

  /**
   * UI Manager — screen switching and initialization
   */
  MediCard.UI = {
    _screenMap: {},

    init() {
      // Initialize systems
      MediCard.Audio.init();

      // Create screens
      var app = document.getElementById('app');
      if (!app) return;

      app.innerHTML = '' +
        '<div class="screen active" id="screen-auth"></div>' +
        '<div class="screen" id="screen-title"></div>' +
        '<div class="screen" id="screen-lobby"></div>' +
        '<div class="screen" id="screen-subject"></div>' +
        '<div class="screen" id="screen-battle"></div>' +
        '<div class="screen" id="screen-result"></div>' +
        '<div class="screen" id="screen-notebook"></div>' +
        '<div class="screen" id="screen-study"></div>' +
        // Particle container for effects
        '<div class="particle-container" id="particles"></div>';

      // Check if user is logged in
      var isLoggedIn = !!MediCard.Storage.getCurrentUserId();
      this.showScreen(isLoggedIn ? 'title' : 'auth');
    },

    showScreen(name) {
      var app = document.getElementById('app');
      if (!app) return;

      // Hide all screens
      var screens = app.querySelectorAll('.screen');
      for (var i = 0; i < screens.length; i++) {
        screens[i].classList.remove('active');
      }

      // Show target screen
      var screen = document.getElementById('screen-' + name);
      if (screen) {
        screen.classList.add('active');
        screen.classList.add('screen-transition');
      }

      // Render screen content
      try {
        switch (name) {
          case 'auth':
            MediCard.ScreenAuth.render();
            MediCard.ScreenAuth.attachEvents();
            break;
          case 'title':
            MediCard.ScreenTitle.render();
            MediCard.ScreenTitle.attachEvents();
            break;
          case 'lobby':
            MediCard.ScreenLobby.render();
            MediCard.ScreenLobby.attachEvents();
            break;
          case 'subject':
            if (MediCard.ScreenSubject && MediCard.ScreenSubject.render) {
              MediCard.ScreenSubject.render();
            } else {
              _showError();
            }
            break;
          case 'playing':
            MediCard.ScreenBattle.init();
            break;
          case 'notebook':
            if (MediCard.ScreenNotebook && MediCard.ScreenNotebook.show) {
              MediCard.ScreenNotebook.show();
            }
            break;
          case 'study':
            if (MediCard.ScreenStudy && MediCard.ScreenStudy.render) {
              MediCard.ScreenStudy.render();
              // Restore server progress asynchronously
              if (MediCard.ScreenStudy._restoreProgressFromServer) {
                MediCard.ScreenStudy._restoreProgressFromServer(function() {
                  MediCard.ScreenStudy.render();
                });
              }
            }
            break;
          case 'result':
            MediCard.ScreenResult.render();
            break;
          default:
            console.log('[MediCard.UI] Unknown screen: ' + name);
        }
      } catch (e) {
        console.error('[MediCard.UI] Error rendering screen:', name, e);
        _showError();
      }

      // Sync GameState AFTER render so init() overrides don't break state guards
      if (MediCard.GameState && MediCard.GameState.screen !== name) {
        MediCard.GameState.screen = name;
      }
    },

    startGame() {
      MediCard.GameState.goToScreen('playing');
    }
  };

  // Error handler — shows generic user-friendly message only
  var _errorBox = null;
  var _errorShown = false;
  function _showError() {
    if (_errorShown) return;
    _errorShown = true;
    var box = document.getElementById('medicard-error-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'medicard-error-box';
      box.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(15,23,42,0.98);color:#fca5a5;padding:16px 20px;font-size:14px;z-index:99999;text-align:center;border-bottom:1px solid rgba(239,68,68,0.3);backdrop-filter:blur(8px);';
      box.textContent = '抱歉，游戏遇到了问题，请刷新页面重试。';
      box.addEventListener('click', function() { box.remove(); _errorShown = false; });
      document.body.appendChild(box);
    }
  }

  window.addEventListener('error', function(e) {
    console.error('[MediCard] Global error:', e.message, e.filename, e.lineno, e.error);
    _showError();
  });

  // ── Security: Frame-busting (prevent clickjacking) ──
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }

  // ── Security: Detect tampered localStorage ──
  function _validateStoredData() {
    try {
      var users = MediCard.Storage.getUsers();
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        if (u.username && typeof u.username === 'string' && u.username.length > 100) {
          console.warn('[Security] Possible XSS payload detected in user data, clearing...');
          MediCard.Storage.clear();
          return false;
        }
      }
      return true;
    } catch (e) {
      return true; // Don't block boot on validation error
    }
  }

  // ── Security: Validate incoming URL parameters (prevent XSS via URL) ──
  function _sanitizeUrlParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      params.forEach(function(value, key) {
        if (/[<>'"]/.test(value) || /javascript:/i.test(value)) {
          console.warn('[Security] Malicious URL parameter blocked:', key);
          // Clean the URL
          var url = new URL(window.location);
          url.searchParams.delete(key);
          window.history.replaceState({}, '', url.toString());
        }
      });
    } catch (e) { /* ignore */ }
  }

  // Initialize on DOM ready
  function boot() {
    try {
      _sanitizeUrlParams();
      _validateStoredData();
      // Migration: removed destructive clear() that wiped all user accounts.
      // Data validation is handled by individual getter methods (getUsers, getGameStats, etc.)
      MediCard.Storage.set('_v2_migrated', true);
      MediCard.UI.init();
    } catch (e) {
      _showError();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.MediCard = MediCard;
})();
