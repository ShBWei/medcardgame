/**
 * MediCard Cloud API Client
 * Syncs user accounts + study progress to Cloudflare Worker + D1
 * Graceful fallback: if API unavailable, localStorage still works
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.CloudAPI = {
    _baseURL: 'https://medcard-api.3280039592.workers.dev',
    _token: null,
    _username: null,
    _userId: null,
    _ready: false,

    init: function(baseURL) {
      if (baseURL) this._baseURL = baseURL;
      this._token = localStorage.getItem('cloud_token') || null;
      this._username = localStorage.getItem('cloud_username') || null;
      this._userId = localStorage.getItem('cloud_user_id') || null;
      this._ready = true;
    },

    // ── Auth ──────────────────────────────────────────

    register: function(username, password) {
      var self = this;
      return fetch(this._baseURL + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      }).then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) self._saveAuth(data);
          return data;
        });
    },

    login: function(username, password) {
      var self = this;
      return fetch(this._baseURL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      }).then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) self._saveAuth(data);
          return data;
        });
    },

    logout: function() {
      var token = this._token;
      this._clearAuth();
      if (!token) return Promise.resolve({ success: true });
      return fetch(this._baseURL + '/api/logout', {
        method: 'POST',
        headers: this._headers()
      }).then(function(r) { return r.json(); });
    },

    isLoggedIn: function() {
      return !!this._token;
    },

    getUsername: function() {
      return this._username || '';
    },

    getUserId: function() {
      return this._userId || '';
    },

    // ── Progress ──────────────────────────────────────

    getProgress: function() {
      if (!this._token) return Promise.resolve({ progress: {} });
      return fetch(this._baseURL + '/api/progress', {
        headers: this._headers()
      }).then(function(r) { return r.json(); });
    },

    saveProgress: function(subject, answered, correct, streak, maxStreak) {
      if (!this._token) return Promise.resolve({ success: false, error: 'Not logged in' });
      return fetch(this._baseURL + '/api/progress', {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          subject: subject,
          answered: answered || 0,
          correct: correct || 0,
          streak: streak || 0,
          maxStreak: maxStreak || 0
        })
      }).then(function(r) { return r.json(); });
    },

    // ── Wrong questions ───────────────────────────────

    getWrongQuestions: function(subject) {
      if (!this._token) return Promise.resolve({ questions: [] });
      var url = this._baseURL + '/api/wrong-questions';
      if (subject) url += '?subject=' + encodeURIComponent(subject);
      return fetch(url, { headers: this._headers() })
        .then(function(r) { return r.json(); });
    },

    addWrongQuestion: function(subject, questionIndex, questionData) {
      if (!this._token) return Promise.resolve({ success: false });
      return fetch(this._baseURL + '/api/wrong-questions', {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          subject: subject,
          questionIndex: questionIndex,
          questionData: questionData
        })
      }).then(function(r) { return r.json(); });
    },

    deleteWrongQuestion: function(id) {
      if (!this._token) return Promise.resolve({ success: false });
      return fetch(this._baseURL + '/api/wrong-questions/' + id, {
        method: 'DELETE',
        headers: this._headers()
      }).then(function(r) { return r.json(); });
    },

    // ── Helpers ───────────────────────────────────────

    _saveAuth: function(data) {
      this._token = data.token;
      this._username = data.username;
      this._userId = data.userId;
      try {
        localStorage.setItem('cloud_token', data.token);
        localStorage.setItem('cloud_username', data.username);
        localStorage.setItem('cloud_user_id', String(data.userId));
      } catch(e) {}
    },

    _clearAuth: function() {
      this._token = null;
      this._username = null;
      this._userId = null;
      try {
        localStorage.removeItem('cloud_token');
        localStorage.removeItem('cloud_username');
        localStorage.removeItem('cloud_user_id');
      } catch(e) {}
    },

    _headers: function() {
      return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this._token
      };
    }
  };

  window.MediCard = MediCard;
})();
