/**
 * MediCard Duel — LocalStorage Wrapper
 * Provides safe get/set with JSON serialization and fallback
 */
(function() {
  const MediCard = window.MediCard || {};
  const PREFIX = 'medicard_';

  MediCard.Storage = {
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        // Storage write failed
        return false;
      }
    },

    get(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return defaultValue;
        return JSON.parse(raw);
      } catch (e) {
        // Storage read failed
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(PREFIX + key);
        return true;
      } catch (e) {
        return false;
      }
    },

    has(key) {
      return localStorage.getItem(PREFIX + key) !== null;
    },

    clear() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    },

    // Specific helpers
    saveSelectedSubjects(subjectIds) {
      return this.set('selected_subjects', subjectIds);
    },

    getSelectedSubjects() {
      return this.get('selected_subjects', []);
    },

    savePlayerName(name) {
      return this.set('player_name', name);
    },

    getPlayerName() {
      return this.get('player_name', '医学战士');
    },

    // ── User management (with validation) ──

    getUsers() {
      var users = this.get('users', []);
      // Validate structure — reject tampered data
      if (!Array.isArray(users)) return [];
      return users.filter(function(u) {
        return u && typeof u === 'object' && typeof u.id === 'string' && u.id.length > 0 &&
               typeof u.username === 'string' && u.username.length > 0;
      });
    },

    saveUser(user) {
      if (!user || !user.id || !user.username) return false;
      // Sanitize before save
      var clean = {
        id: String(user.id).substring(0, 64),
        username: String(user.username).substring(0, 16),
        avatarColor: String(user.avatarColor || '#06b6d4').substring(0, 20),
        avatarIcon: String(user.avatarIcon || '👨‍⚕️').substring(0, 8),
        passwordHash: String(user.passwordHash || '').substring(0, 128),
        createdAt: user.createdAt || new Date().toISOString()
      };
      var users = this.getUsers();
      var idx = -1;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === clean.id) { idx = i; break; }
      }
      if (idx >= 0) {
        users[idx] = clean;
      } else {
        users.push(clean);
      }
      return this.set('users', users);
    },

    deleteUser(userId) {
      if (!userId || typeof userId !== 'string') return false;
      var users = this.getUsers().filter(function(u) { return u.id !== userId; });
      return this.set('users', users);
    },

    getCurrentUserId() {
      var id = this.get('current_user_id', null);
      if (id && typeof id === 'string' && id.length <= 64) return id;
      return null;
    },

    setCurrentUser(userId) {
      if (!userId || typeof userId !== 'string') return false;
      return this.set('current_user_id', String(userId).substring(0, 64));
    },

    getCurrentUser() {
      var userId = this.getCurrentUserId();
      if (!userId) return null;
      var users = this.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === userId) return users[i];
      }
      return null;
    },

    // ── Per-user prefixed storage ──

    _userPrefix() {
      var uid = this.getCurrentUserId();
      return uid ? 'u_' + uid + '_' : '';
    },

    saveGameStats(stats) {
      var key = this._userPrefix() + 'game_stats';
      var existing = this.get(key, []);
      existing.push({ ...stats, date: new Date().toISOString() });
      if (existing.length > 50) existing.splice(0, existing.length - 50);
      return this.set(key, existing);
    },

    getGameStats() {
      var key = this._userPrefix() + 'game_stats';
      return this.get(key, []);
    },

    saveWrongQuestions(wrongIds) {
      var key = this._userPrefix() + 'wrong_questions';
      var existing = this.get(key, []);
      var merged = [...new Set([...existing, ...wrongIds])];
      return this.set(key, merged);
    },

    getWrongQuestions() {
      var key = this._userPrefix() + 'wrong_questions';
      return this.get(key, []);
    }
  };

  window.MediCard = MediCard;
})();
