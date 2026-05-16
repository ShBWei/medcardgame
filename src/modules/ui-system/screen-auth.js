/**
 * MediCard 医杀 — Auth Screen (Secure V3)
 * Separate Register/Login modes, registration rate limiting, XSS hardening
 */
(function() {
  var MediCard = window.MediCard || {};

  var COLORS = ['#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
  var ICONS = ['👨‍⚕️','👩‍⚕️','🧑‍🔬','👨‍🔬','👩‍🔬','🧑‍💻','🧬','💊','🔬','🩺'];
  var MAX_LOGIN_ATTEMPTS = 5;
  var LOCKOUT_DURATION = 30000; // 30 seconds
  var MAX_REGISTRATIONS = 5;    // Max 5 new registrations per session
  var _failedAttempts = {};     // { userId_or_username: { count, lockedUntil } }
  var _registrationCount = 0;

  MediCard.ScreenAuth = {
    _mode: 'login',           // 'login' | 'register'
    _randColor: 0,
    _randIcon: 0,
    _pendingLoginUserId: null,

    render() {
      var screen = document.getElementById('screen-auth');
      if (!screen) return;

      var users = MediCard.Storage.getUsers();
      var currentUserId = MediCard.Storage.getCurrentUserId();

      this._mode = 'login';
      this._randColor = Math.floor(Math.random() * COLORS.length);
      this._randIcon = Math.floor(Math.random() * ICONS.length);
      this._pendingLoginUserId = null;

      var html = '<div class="auth-container"><div class="auth-card">' +
        '<div class="auth-logo">' +
          '<div class="auth-logo-icon">⚕️</div>' +
          '<h2>MediCard 医杀</h2>' +
          '<p>医学知识 · 策略对战</p>' +
        '</div>' +
        '<div class="auth-body">';

      // Mode tabs
      html += '<div class="auth-tabs">' +
        '<button class="auth-tab active" id="auth-tab-login">🔐 登录</button>' +
        '<button class="auth-tab" id="auth-tab-register">📝 注册</button>' +
      '</div>';

      // ── LOGIN MODE PANEL ──
      html += '<div class="auth-panel" id="auth-panel-login">';

      // Existing user list for quick login
      if (users.length > 0) {
        html += '<div class="auth-section">' +
          '<h3 class="auth-section-title">选择账号</h3>' +
          '<div class="auth-user-list" id="auth-user-list">';
        for (var i = 0; i < users.length; i++) {
          var user = users[i];
          var isCurrent = user.id === currentUserId;
          var locked = _isLocked(user.id);
          html += '<div class="auth-user-item' + (isCurrent ? ' current' : '') + (locked ? ' locked' : '') + '" data-user-id="' + _escAttr(user.id) + '">' +
            '<span class="auth-avatar" style="background:' + _escAttr(user.avatarColor || COLORS[0]) + ';">' + _escHtml(user.avatarIcon || ICONS[0]) + '</span>' +
            '<span class="auth-username">' + _escHtml(user.username) + '</span>' +
            (locked ? '<span class="auth-lock-badge">🔒 已锁定</span>' : '') +
            (isCurrent && !locked ? '<span class="auth-badge">上次登录</span>' : '') +
            '<span class="auth-user-date">' + _fmtDate(user.createdAt) + '</span>' +
            '</div>';
        }
        html += '</div></div>';
      }

      // Direct login form
      html += '<div class="auth-section">' +
        '<h3 class="auth-section-title">' + (users.length > 0 ? '或输入账号密码' : '登录账号') + '</h3>' +
        '<form class="auth-form" id="auth-login-form" autocomplete="off">' +
          '<input type="text" class="auth-input" id="auth-login-username" placeholder="昵称" maxlength="16" autocomplete="off">' +
          '<div class="auth-password-row">' +
            '<input type="password" class="auth-input" id="auth-login-password" placeholder="密码" maxlength="128" autocomplete="current-password">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="btn-toggle-pw-login" title="显示密码">👁️</button>' +
          '</div>' +
          '<div class="auth-error" id="auth-login-error" style="display:none;"></div>' +
          '<button type="submit" class="btn btn-primary btn-lg auth-submit-btn">🔐 登录</button>' +
        '</form>' +
      '</div>';

      html += '</div>'; // end auth-panel-login

      // ── REGISTER MODE PANEL ──
      html += '<div class="auth-panel" id="auth-panel-register" style="display:none;">' +
        '<div class="auth-section">' +
          '<h3 class="auth-section-title">创建新账号' + (_registrationCount >= MAX_REGISTRATIONS ? ' (今日注册已达上限)' : '') + '</h3>' +
          '<form class="auth-form" id="auth-register-form" autocomplete="off">' +
            '<input type="text" class="auth-input" id="auth-reg-username" placeholder="昵称（1-16字符）" maxlength="16" autocomplete="off">' +
            '<div class="auth-password-row">' +
              '<input type="password" class="auth-input" id="auth-reg-password" placeholder="密码（至少6位）" maxlength="128" autocomplete="new-password">' +
              '<button type="button" class="btn btn-ghost btn-sm" id="btn-toggle-pw-reg" title="显示密码">👁️</button>' +
            '</div>' +
            '<input type="password" class="auth-input" id="auth-reg-password-confirm" placeholder="确认密码" maxlength="128" autocomplete="new-password">' +
            '<div class="auth-avatar-picker">' +
              '<span class="auth-avatar-preview" id="auth-avatar-preview" style="background:' + COLORS[this._randColor] + ';">' + ICONS[this._randIcon] + '</span>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="btn-random-avatar">🎲 换头像</button>' +
            '</div>' +
            '<div class="auth-error" id="auth-reg-error" style="display:none;"></div>' +
            '<button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="auth-reg-submit-btn"' + (_registrationCount >= MAX_REGISTRATIONS ? ' disabled' : '') + '>📝 注册</button>' +
          '</form>' +
        '</div>' +
      '</div>'; // end auth-panel-register

      // Password modal (for existing user click)
      html += '<div class="auth-password-modal" id="auth-password-modal" style="display:none;">' +
        '<div class="auth-password-modal-bg"></div>' +
        '<div class="auth-password-modal-content">' +
          '<h4 id="auth-pw-modal-title">输入密码</h4>' +
          '<p id="auth-pw-modal-user" style="font-size:14px;margin-bottom:12px;"></p>' +
          '<input type="password" class="auth-input" id="auth-pw-modal-input" placeholder="输入密码" maxlength="128" autocomplete="current-password">' +
          '<div class="auth-error" id="auth-pw-modal-error" style="display:none;"></div>' +
          '<div style="display:flex;gap:8px;margin-top:12px;">' +
            '<button class="btn btn-primary" id="btn-pw-modal-confirm" style="flex:1;">确认登录</button>' +
            '<button class="btn btn-ghost" id="btn-pw-modal-cancel">取消</button>' +
          '</div>' +
        '</div>' +
      '</div>';

      html += '</div></div></div>'; // auth-body / auth-card / auth-container

      screen.innerHTML = html;
    },

    attachEvents() {
      var self = this;

      // ── Mode tabs ──
      var tabLogin = document.getElementById('auth-tab-login');
      var tabRegister = document.getElementById('auth-tab-register');
      if (tabLogin) {
        tabLogin.addEventListener('click', function() { self._switchMode('login'); });
      }
      if (tabRegister) {
        tabRegister.addEventListener('click', function() { self._switchMode('register'); });
      }

      // ── Login form ──
      var loginForm = document.getElementById('auth-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self._handleLogin();
        });
      }

      // Login password visibility toggle
      var btnTogglePwLogin = document.getElementById('btn-toggle-pw-login');
      if (btnTogglePwLogin) {
        btnTogglePwLogin.addEventListener('click', function() {
          var pwEl = document.getElementById('auth-login-password');
          if (pwEl) {
            var isPass = pwEl.type === 'password';
            pwEl.type = isPass ? 'text' : 'password';
            btnTogglePwLogin.textContent = isPass ? '🙈' : '👁️';
          }
        });
      }

      // ── Register form ──
      var regForm = document.getElementById('auth-register-form');
      if (regForm) {
        regForm.addEventListener('submit', function(e) {
          e.preventDefault();
          self._handleRegister();
        });
      }

      // Register password visibility toggle
      var btnTogglePwReg = document.getElementById('btn-toggle-pw-reg');
      if (btnTogglePwReg) {
        btnTogglePwReg.addEventListener('click', function() {
          var pwEl = document.getElementById('auth-reg-password');
          var confirmEl = document.getElementById('auth-reg-password-confirm');
          if (pwEl) {
            var isPass = pwEl.type === 'password';
            pwEl.type = isPass ? 'text' : 'password';
            if (confirmEl) confirmEl.type = isPass ? 'text' : 'password';
            btnTogglePwReg.textContent = isPass ? '🙈' : '👁️';
          }
        });
      }

      // Random avatar
      var btnRandom = document.getElementById('btn-random-avatar');
      if (btnRandom) {
        btnRandom.addEventListener('click', function() {
          self._randColor = Math.floor(Math.random() * COLORS.length);
          self._randIcon = Math.floor(Math.random() * ICONS.length);
          var preview = document.getElementById('auth-avatar-preview');
          if (preview) {
            preview.style.background = COLORS[self._randColor];
            preview.textContent = ICONS[self._randIcon];
          }
        });
      }

      // ── Existing user click → password modal ──
      var userItems = document.querySelectorAll('.auth-user-item');
      for (var i = 0; i < userItems.length; i++) {
        userItems[i].addEventListener('click', function() {
          var userId = this.getAttribute('data-user-id');
          if (!userId) return;
          if (_isLocked(userId)) {
            _showError('auth-login-error', '此账号登录尝试过多，请30秒后再试');
            return;
          }
          self._showPasswordModal(userId);
        });
      }

      // ── Password modal events ──
      var btnConfirm = document.getElementById('btn-pw-modal-confirm');
      var btnCancel = document.getElementById('btn-pw-modal-cancel');
      var modalBg = document.querySelector('.auth-password-modal-bg');
      var modalInput = document.getElementById('auth-pw-modal-input');

      if (btnConfirm) {
        btnConfirm.addEventListener('click', function() { self._handleModalLogin(); });
      }
      if (btnCancel) {
        btnCancel.addEventListener('click', function() { self._hidePasswordModal(); });
      }
      if (modalBg) {
        modalBg.addEventListener('click', function() { self._hidePasswordModal(); });
      }
      if (modalInput) {
        modalInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') self._handleModalLogin();
        });
      }
    },

    /* ── Switch between login/register tabs ── */
    _switchMode: function(mode) {
      this._mode = mode;
      var tabLogin = document.getElementById('auth-tab-login');
      var tabRegister = document.getElementById('auth-tab-register');
      var panelLogin = document.getElementById('auth-panel-login');
      var panelRegister = document.getElementById('auth-panel-register');

      if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
      if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');
      if (panelLogin) panelLogin.style.display = mode === 'login' ? '' : 'none';
      if (panelRegister) panelRegister.style.display = mode === 'register' ? '' : 'none';

      // Clear errors
      _hideAllErrors();
    },

    /* ── Login form handler ── */
    _handleLogin: function() {
      var usernameEl = document.getElementById('auth-login-username');
      var passwordEl = document.getElementById('auth-login-password');
      if (!usernameEl || !passwordEl) return;

      var username = MediCard.Crypto.sanitize((usernameEl.value || '').trim(), 16);
      var password = passwordEl.value || '';

      if (!MediCard.Crypto.validateUsername(username)) {
        _showError('auth-login-error', '昵称格式无效（1-16字符，可用中英文/数字/下划线）');
        _shakeInput(usernameEl);
        return;
      }
      if (!MediCard.Crypto.validatePassword(password)) {
        _showError('auth-login-error', '密码至少需要6位');
        _shakeInput(passwordEl);
        return;
      }

      // Find user by username
      var users = MediCard.Storage.getUsers();
      var user = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].username === username) { user = users[i]; break; }
      }

      if (!user) {
        // Local lookup failed — try Cloudflare API
        var self = this;
        try {
          if (MediCard.CloudAPI) {
            MediCard.CloudAPI.init();
            MediCard.CloudAPI.login(username, password).then(function(data) {
              if (data.success) {
                // Cloud login succeeded — create local account
                MediCard.Crypto.hashPassword(password, function(hash) {
                  var restoredUser = {
                    id: 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    username: MediCard.Crypto.sanitize(username, 16),
                    avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
                    avatarIcon: ICONS[Math.floor(Math.random() * ICONS.length)],
                    passwordHash: hash,
                    createdAt: new Date().toISOString()
                  };
                  MediCard.Storage.saveUser(restoredUser);
                  MediCard.Storage.setCurrentUser(restoredUser.id);
                  MediCard.CloudAPI.init();
                  // Reload cloud progress
                  MediCard.CloudAPI.getProgress().then(function(pData) {
                    if (pData.progress) {
                      try {
                        localStorage.setItem('medicard_study_progress', JSON.stringify(pData.progress));
                      } catch(e) {}
                    }
                  }).catch(function(){});
                  try { MediCard.Audio.playButtonClick(); } catch(e) {}
                  MediCard.GameState.goToScreen('title');
                });
                return;
              }
              // Cloud login failed too — try server-side recovery
              self._fallbackServerRecovery(username, password, usernameEl);
            }).catch(function() {
              // Cloud unreachable — try server-side recovery
              self._fallbackServerRecovery(username, password, usernameEl);
            });
            return;
          }
        } catch(e) {}
        // No CloudAPI — try legacy server recovery
        this._fallbackServerRecovery(username, password, usernameEl);
        return;
      }

      if (_isLocked(user.id)) {
        _showError('auth-login-error', '此账号登录尝试过多，请30秒后再试');
        return;
      }

      if (!user.passwordHash) {
        // Legacy user without password — migrate to password
        this._doSetFirstPassword(user, password, usernameEl);
        return;
      }

      this._doLogin(user, password, usernameEl);
    },

    /* ── Register form handler ── */
    _handleRegister: function() {
      if (_registrationCount >= MAX_REGISTRATIONS) {
        _showError('auth-reg-error', '本会话注册次数已达上限，请使用已有账号登录');
        return;
      }

      var usernameEl = document.getElementById('auth-reg-username');
      var passwordEl = document.getElementById('auth-reg-password');
      var confirmEl = document.getElementById('auth-reg-password-confirm');
      if (!usernameEl || !passwordEl || !confirmEl) return;

      var username = MediCard.Crypto.sanitize((usernameEl.value || '').trim(), 16);
      var password = passwordEl.value || '';
      var confirmPw = confirmEl.value || '';

      if (!MediCard.Crypto.validateUsername(username)) {
        _showError('auth-reg-error', '昵称格式无效（1-16字符，可用中英文/数字/下划线）');
        _shakeInput(usernameEl);
        return;
      }
      if (!MediCard.Crypto.validatePassword(password)) {
        _showError('auth-reg-error', '密码至少需要6位');
        _shakeInput(passwordEl);
        return;
      }
      if (password !== confirmPw) {
        _showError('auth-reg-error', '两次密码不一致');
        _shakeInput(confirmEl);
        return;
      }

      // Check for duplicate username
      var users = MediCard.Storage.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].username === username) {
          _showError('auth-reg-error', '该昵称已被使用，请换一个或直接登录');
          _shakeInput(usernameEl);
          return;
        }
      }

      _registrationCount++;
      if (_registrationCount >= MAX_REGISTRATIONS) {
        var regBtn = document.getElementById('auth-reg-submit-btn');
        if (regBtn) { regBtn.disabled = true; regBtn.textContent = '📝 注册（已达上限）'; }
      }

      this._doRegister(username, password);
    },

    /* ── Legacy server recovery fallback ── */
    _fallbackServerRecovery: function(username, password, inputEl) {
      var self = this;
      MediCard.Storage.lookupAccountOnServer(username, function(found, serverAcct) {
        if (found && serverAcct) {
          MediCard.Storage.restoreAccountFromServer(serverAcct.userId, function(restored, restoredUser) {
            if (restored && restoredUser) {
              if (!restoredUser.passwordHash) {
                self._doSetFirstPassword(restoredUser, password, inputEl);
              } else {
                self._doLogin(restoredUser, password, inputEl);
              }
            } else {
              _showError('auth-login-error', '从服务器恢复账号失败，请检查网络');
            }
          });
        } else {
          _showError('auth-login-error', '账号不存在，请先注册');
        }
      });
    },

    /* ── Register new user ── */
    _doRegister: function(username, password) {
      var self = this;
      MediCard.Crypto.hashPassword(password, function(hash) {
        if (!hash) {
          _showError('auth-reg-error', '加密失败，请重试');
          return;
        }
        var newUser = {
          id: 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          username: MediCard.Crypto.sanitize(username, 16),
          avatarColor: COLORS[self._randColor] || COLORS[0],
          avatarIcon: ICONS[self._randIcon] || ICONS[0],
          passwordHash: hash,
          createdAt: new Date().toISOString()
        };
        if (!MediCard.Storage.saveUser(newUser)) {
          _showError('auth-reg-error', '注册失败，请重试');
          return;
        }
        MediCard.Storage.setCurrentUser(newUser.id);
        // Sync to Cloudflare Worker API
        try {
          if (MediCard.CloudAPI) {
            MediCard.CloudAPI.init();
            MediCard.CloudAPI.register(username, password).catch(function(){});
          }
        } catch(e) {}
        setTimeout(function() { MediCard.Storage.syncAccountToServer(); }, 500);
        try { MediCard.Audio.playButtonClick(); } catch(e) {}
        MediCard.GameState.goToScreen('title');
      });
    },

    /* ── Login existing user ── */
    _doLogin: function(user, password, inputEl) {
      var self = this;
      MediCard.Crypto.verifyPassword(password, user.passwordHash, function(match) {
        if (match) {
          _clearFailedAttempts(user.id);
          MediCard.Storage.setCurrentUser(user.id);
          // Sync to Cloudflare Worker API
          try {
            if (MediCard.CloudAPI) {
              MediCard.CloudAPI.init();
              MediCard.CloudAPI.login(username, password).catch(function(){});
            }
          } catch(e) {}
          setTimeout(function() { MediCard.Storage.syncAccountToServer(); }, 500);
          try { MediCard.Audio.playButtonClick(); } catch(e) {}
          MediCard.GameState.goToScreen('title');
        } else {
          _recordFailedAttempt(user.id);
          var remaining = _remainingAttempts(user.id);
          if (remaining > 0) {
            _showError('auth-login-error', '密码错误，还剩 ' + remaining + ' 次机会');
          } else {
            _showError('auth-login-error', '登录尝试过多，已临时锁定30秒');
          }
          _shakeInput(inputEl);
        }
      });
    },

    /* ── Set first password for legacy user ── */
    _doSetFirstPassword: function(user, password, inputEl) {
      var self = this;
      MediCard.Crypto.hashPassword(password, function(hash) {
        if (!hash) {
          _showError('auth-login-error', '加密失败，请重试');
          return;
        }
        user.passwordHash = hash;
        MediCard.Storage.saveUser(user);
        MediCard.Storage.setCurrentUser(user.id);
        setTimeout(function() { MediCard.Storage.syncAccountToServer(); }, 500);
        try { MediCard.Audio.playButtonClick(); } catch(e) {}
        MediCard.GameState.goToScreen('title');
      });
    },

    /* ── Password modal for existing user click ── */
    _showPasswordModal: function(userId) {
      var users = MediCard.Storage.getUsers();
      var user = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) { user = users[i]; break; }
      }
      if (!user) return;

      this._pendingLoginUserId = userId;
      var modal = document.getElementById('auth-password-modal');
      var title = document.getElementById('auth-pw-modal-title');
      var userEl = document.getElementById('auth-pw-modal-user');
      var input = document.getElementById('auth-pw-modal-input');

      if (modal) modal.style.display = 'flex';
      if (title) title.textContent = '🔐 输入密码';
      if (userEl) {
        userEl.innerHTML = '<span class="auth-avatar" style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:' +
          _escAttr(user.avatarColor || COLORS[0]) + ';font-size:14px;vertical-align:middle;margin-right:6px;">' +
          _escHtml(user.avatarIcon || ICONS[0]) + '</span>' +
          '<b>' + _escHtml(user.username) + '</b>';
      }
      if (input) { input.value = ''; input.focus(); }
      var errEl = document.getElementById('auth-pw-modal-error');
      if (errEl) errEl.style.display = 'none';
    },

    _hidePasswordModal: function() {
      var modal = document.getElementById('auth-password-modal');
      if (modal) modal.style.display = 'none';
      this._pendingLoginUserId = null;
    },

    _handleModalLogin: function() {
      var userId = this._pendingLoginUserId;
      if (!userId) return;

      var users = MediCard.Storage.getUsers();
      var user = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) { user = users[i]; break; }
      }
      if (!user) return;

      var input = document.getElementById('auth-pw-modal-input');
      var password = input ? input.value : '';

      if (_isLocked(userId)) {
        _showModalError('登录尝试过多，请30秒后再试');
        return;
      }

      if (!user.passwordHash) {
        // Legacy user — set first password
        if (!MediCard.Crypto.validatePassword(password)) {
          _showModalError('请设置密码（至少6位）');
          return;
        }
        var self2 = this;
        MediCard.Crypto.hashPassword(password, function(hash) {
          user.passwordHash = hash;
          MediCard.Storage.saveUser(user);
          MediCard.Storage.setCurrentUser(userId);
          setTimeout(function() { MediCard.Storage.syncAccountToServer(); }, 500);
          try { MediCard.Audio.playButtonClick(); } catch(e) {}
          self2._hidePasswordModal();
          MediCard.GameState.goToScreen('title');
        });
        return;
      }

      if (!MediCard.Crypto.validatePassword(password)) {
        _showModalError('密码至少需要6位');
        return;
      }

      var self = this;
      MediCard.Crypto.verifyPassword(password, user.passwordHash, function(match) {
        if (match) {
          _clearFailedAttempts(userId);
          MediCard.Storage.setCurrentUser(userId);
          setTimeout(function() { MediCard.Storage.syncAccountToServer(); }, 500);
          try { MediCard.Audio.playButtonClick(); } catch(e) {}
          self._hidePasswordModal();
          MediCard.GameState.goToScreen('title');
        } else {
          _recordFailedAttempt(userId);
          var remaining = _remainingAttempts(userId);
          if (remaining > 0) {
            _showModalError('密码错误，还剩 ' + remaining + ' 次机会');
          } else {
            _showModalError('登录尝试过多，已临时锁定30秒');
            setTimeout(function() { self._hidePasswordModal(); }, 1000);
          }
          if (input) { input.value = ''; input.focus(); }
        }
      });
    }
  };

  // ── Rate limiting ──

  function _isLocked(userId) {
    var entry = _failedAttempts[userId];
    if (!entry) return false;
    if (entry.count >= MAX_LOGIN_ATTEMPTS && entry.lockedUntil > Date.now()) return true;
    if (entry.lockedUntil <= Date.now()) { delete _failedAttempts[userId]; }
    return false;
  }

  function _remainingAttempts(userId) {
    var entry = _failedAttempts[userId] || { count: 0 };
    return Math.max(0, MAX_LOGIN_ATTEMPTS - entry.count);
  }

  function _recordFailedAttempt(userId) {
    var entry = _failedAttempts[userId];
    if (!entry) { _failedAttempts[userId] = { count: 0, lockedUntil: 0 }; entry = _failedAttempts[userId]; }
    entry.count++;
    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_DURATION;
    }
  }

  function _clearFailedAttempts(userId) {
    delete _failedAttempts[userId];
  }

  // ── UI helpers ──

  function _showError(containerId, msg) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(function() { el.style.display = 'none'; }, 4000);
  }

  function _showModalError(msg) {
    _showError('auth-pw-modal-error', msg);
  }

  function _hideAllErrors() {
    var ids = ['auth-login-error', 'auth-reg-error', 'auth-pw-modal-error'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.style.display = 'none';
    }
  }

  function _shakeInput(el) {
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    el.style.borderColor = '#ef4444';
    setTimeout(function() { el.style.borderColor = ''; }, 600);
  }

  function _escHtml(str) {
    return MediCard.Crypto ? MediCard.Crypto.escapeHtml(str) : String(str).replace(/</g,'&lt;');
  }

  function _escAttr(str) {
    return String(str).replace(/['"<>&]/g, '');
  }

  function _fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate();
  }

  window.MediCard = MediCard;
})();
