/**
 * MediCard 医杀 — Wrong Question Book (错题本)
 * ID-only storage for wrong/bookmarked questions to minimize storage.
 * Persists per-user to localStorage + server via accounts API.
 * Organizes by subject, supports view mode and self-test mode.
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.WrongQuestionBook = {
    _maxEntries: 500,
    _syncTimer: null,
    _subjCodeMap: null,   // subject → code (built lazily)
    _codeSubjMap: null,   // code → subject

    /** Build subject↔code mappings from config (lazy, cached) */
    _buildMaps: function() {
      if (this._subjCodeMap) return;
      this._subjCodeMap = {};
      this._codeSubjMap = {};
      var cfg = MediCard.Config;
      if (cfg && cfg.subjectCategories) {
        var code = 0;
        cfg.subjectCategories.forEach(function(cat) {
          (cat.subjects || []).forEach(function(subj) {
            this._subjCodeMap[subj] = code;
            this._codeSubjMap[code] = subj;
            code++;
          }.bind(this));
        }.bind(this));
      }
    },

    /** Encode "microbiology_042" → "7:42" (position encoding, ~60% smaller) */
    _encodeId: function(qid) {
      if (!qid) return qid;
      this._buildMaps();
      var idx = qid.lastIndexOf('_');
      if (idx < 0) return qid;
      var subj = qid.substring(0, idx);
      var num = qid.substring(idx + 1);
      var code = this._subjCodeMap[subj];
      if (typeof code === 'number') return code + ':' + num;
      return qid; // fallback: keep original
    },

    /** Decode "7:42" → "microbiology_042" */
    _decodeId: function(encoded) {
      if (!encoded || typeof encoded !== 'string') return encoded;
      var colonIdx = encoded.indexOf(':');
      if (colonIdx < 0) return encoded; // already in original format or unknown
      this._buildMaps();
      var code = parseInt(encoded.substring(0, colonIdx), 10);
      var num = encoded.substring(colonIdx + 1);
      var subj = this._codeSubjMap[code];
      if (subj) return subj + '_' + num;
      return encoded; // fallback
    },

    /** Get user-specific localStorage key */
    _getKey: function(type) {
      var uid = MediCard.Storage ? MediCard.Storage.getCurrentUserId() : 'anon';
      return 'medicard_' + type + '_' + (uid || 'anon');
    },

    /** Get subject from question ID (handles multiple formats) */
    _subjectFromId: function(qid) {
      if (!qid) return 'unknown';
      // Encoded format: "7:42"
      var colonIdx = qid.indexOf(':');
      if (colonIdx >= 0) {
        this._buildMaps();
        var code = parseInt(qid.substring(0, colonIdx), 10);
        if (!isNaN(code) && this._codeSubjMap[code]) return this._codeSubjMap[code];
      }
      // Strip card-type prefix: "atk_0_physiology-comm-001" → "physiology-comm-001"
      var clean = qid.replace(/^(tac|equ|dly|atk|def|heal|jsh|jdo)_\d+_/, '');
      // Known subject IDs to try matching as prefix of the ID
      var knownSubjects = [
        'cell-biology', 'biochemistry', 'physiology', 'pathology',
        'histology-embryology', 'systematic-anatomy', 'immunology', 'microbiology'
      ];
      for (var i = 0; i < knownSubjects.length; i++) {
        var s = knownSubjects[i];
        // Check if clean ID starts with subject or matches subject-related prefix
        if (clean.indexOf(s) === 0) return s;
        // Check micro→microbiology mapping
        if (s === 'microbiology' && clean.indexOf('micro') === 0) return s;
        // Check sys-anat→systematic-anatomy mapping
        if (s === 'systematic-anatomy' && clean.indexOf('sys-anat') === 0) return s;
      }
      // Fallback: try underscore split (old format: "microbiology_042")
      var idx = qid.lastIndexOf('_');
      if (idx >= 0) {
        var subj = qid.substring(0, idx);
        if (!/^(tac|equ|dly|atk|def|heal|jsh|jdo)(_\d+)?$/.test(subj)) return subj;
      }
      return 'unknown';
    },

    /** Load ID array from localStorage — decode on read */
    _loadLocal: function(type) {
      try {
        var raw = localStorage.getItem(this._getKey(type));
        if (!raw) return [];
        var ids = JSON.parse(raw);
        var decoded = [];
        for (var i = 0; i < ids.length; i++) {
          decoded.push(this._decodeId(ids[i]));
        }
        return decoded;
      } catch(e) { return []; }
    },

    /** Save ID array to localStorage — encode on write */
    _saveLocal: function(type, ids) {
      try {
        if (ids.length > this._maxEntries) ids = ids.slice(-this._maxEntries);
        var encoded = [];
        for (var i = 0; i < ids.length; i++) {
          encoded.push(this._encodeId(ids[i]));
        }
        localStorage.setItem(this._getKey(type), JSON.stringify(encoded));
      } catch(e) { /* storage full */ }
    },

    /** Debounced server sync — sends wrong + bookmark IDs to server */
    _scheduleServerSync: function() {
      var self = this;
      if (this._syncTimer) clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(function() {
        self._syncToServer();
        self._syncTimer = null;
      }, 3000);
    },

    /** Push wrong + bookmark IDs to server via accounts sync */
    _syncToServer: function() {
      try {
        var wrongIds = this._loadLocal('wrong');
        var bookmarkIds = this._loadLocal('bookmark');
        var Storage = MediCard.Storage;
        if (!Storage) return;
        // Update the in-memory wrongQuestions that syncAccountToServer uses
        var user = Storage.getCurrentUser();
        if (user) {
          user.wrongQuestions = wrongIds;
          user.bookmarkedQuestions = bookmarkIds;
          Storage.saveCurrentUser(user);
        }
        // Trigger server sync
        if (Storage.syncAccountToServer) {
          Storage.syncAccountToServer();
        }
      } catch(e) { /* silent */ }
    },

    /** Restore wrong/bookmark IDs from server account backup */
    restoreFromServer: function(callback) {
      var self = this;
      // Try Cloudflare API first
      try {
        if (MediCard.CloudAPI && MediCard.CloudAPI.isLoggedIn()) {
          MediCard.CloudAPI.init();
          MediCard.CloudAPI.getWrongQuestions().then(function(data) {
            if (data && data.questions && data.questions.length > 0) {
              var localWrong = self._loadLocal('wrong');
              var merged = localWrong.slice();
              for (var i = 0; i < data.questions.length; i++) {
                var q = data.questions[i];
                if (q.questionData && q.questionData.qid) {
                  if (merged.indexOf(q.questionData.qid) < 0) {
                    merged.push(q.questionData.qid);
                  }
                }
              }
              if (merged.length > self._maxEntries) merged = merged.slice(-self._maxEntries);
              self._saveLocal('wrong', merged);
            }
            // Fall through to legacy server restore
            self._legacyRestoreFromServer(callback);
          }).catch(function() {
            self._legacyRestoreFromServer(callback);
          });
          return;
        }
      } catch(e) {}
      this._legacyRestoreFromServer(callback);
    },

    _legacyRestoreFromServer: function(callback) {
      var self = this;
      var Storage = MediCard.Storage;
      if (!Storage) { if (callback) callback(); return; }
      try {
        var http = new XMLHttpRequest();
        var userId = Storage.getCurrentUserId();
        if (!userId) { if (callback) callback(); return; }
        http.open('GET', '/api/accounts/backup?userId=' + encodeURIComponent(userId), true);
        http.timeout = 5000;
        http.onload = function() {
          if (http.status === 200) {
            try {
              var resp = JSON.parse(http.responseText);
              if (resp.ok && resp.account) {
                var svrWrong = resp.account.wrongQuestions || [];
                var svrBookmark = resp.account.bookmarkedQuestions || [];
                // Merge: server data takes precedence, union with local
                if (svrWrong.length > 0) {
                  var localWrong = self._loadLocal('wrong');
                  var merged = self._mergeIds(localWrong, svrWrong);
                  self._saveLocal('wrong', merged);
                }
                if (svrBookmark.length > 0) {
                  var localBookmark = self._loadLocal('bookmark');
                  var mergedB = self._mergeIds(localBookmark, svrBookmark);
                  self._saveLocal('bookmark', mergedB);
                }
              }
            } catch(e) {}
          }
          if (callback) callback();
        };
        http.onerror = function() { if (callback) callback(); };
        http.ontimeout = function() { if (callback) callback(); };
        http.send();
      } catch(e) { if (callback) callback(); }
    },

    /** Merge two ID arrays: union, up to maxEntries */
    _mergeIds: function(local, server) {
      var set = {};
      for (var i = 0; i < local.length; i++) set[local[i]] = true;
      for (var j = 0; j < server.length; j++) set[server[j]] = true;
      var merged = Object.keys(set);
      if (merged.length > this._maxEntries) merged = merged.slice(-this._maxEntries);
      return merged;
    },

    /** Parse question ID like "microbiology_042" → { subject, index } */
    _parseQid: function(qid) {
      var decoded = this._decodeId(qid);
      var idx = decoded.lastIndexOf('_');
      if (idx < 0) return null;
      var subject = decoded.substring(0, idx);
      var num = parseInt(decoded.substring(idx + 1), 10);
      if (isNaN(num)) return null;
      return { subject: subject, index: num };
    },

    /** Add a question ID to the list (wrong or bookmark) */
    add: function(type, questionId) {
      if (!questionId) return;
      var ids = this._loadLocal(type);
      var idx = ids.indexOf(questionId);
      if (idx >= 0) ids.splice(idx, 1);
      ids.push(questionId);
      this._saveLocal(type, ids);
      this._scheduleServerSync();
      // Sync to Cloudflare API (wrong questions only)
      if (type === 'wrong') {
        try {
          if (MediCard.CloudAPI && MediCard.CloudAPI.isLoggedIn()) {
            var parsed = this._parseQid(questionId);
            if (parsed) {
              MediCard.CloudAPI.addWrongQuestion(parsed.subject, parsed.index, {
                qid: questionId,
                subject: parsed.subject,
                index: parsed.index
              }).catch(function(){});
            }
          }
        } catch(e) {}
      }
    },

    /** Add a wrong answer question ID */
    addWrong: function(questionId) {
      this.add('wrong', questionId);
    },

    /** Add a bookmarked question ID */
    addBookmark: function(questionId) {
      this.add('bookmark', questionId);
    },

    /** Remove a question ID */
    remove: function(type, questionId) {
      var ids = this._loadLocal(type);
      var idx = ids.indexOf(questionId);
      if (idx >= 0) ids.splice(idx, 1);
      this._saveLocal(type, ids);
      this._scheduleServerSync();
    },

    /** Check if a question is bookmarked */
    isBookmarked: function(questionId) {
      var ids = this._loadLocal('bookmark');
      return ids.indexOf(questionId) >= 0;
    },

    /** Toggle bookmark (add if not present, remove if present) */
    toggleBookmark: function(questionId) {
      if (this.isBookmarked(questionId)) {
        this.remove('bookmark', questionId);
        return false;
      } else {
        this.addBookmark(questionId);
        return true;
      }
    },

    /** Get all IDs grouped by subject */
    getBySubject: function(type) {
      var ids = this._loadLocal(type);
      var groups = {};
      for (var i = 0; i < ids.length; i++) {
        var subj = this._subjectFromId(ids[i]);
        if (!groups[subj]) groups[subj] = [];
        groups[subj].push(ids[i]);
      }
      return groups;
    },

    /** Get all subjects that have entries */
    getSubjects: function(type) {
      var groups = this.getBySubject(type);
      return Object.keys(groups).sort();
    },

    /** Get count for a type */
    getCount: function(type) {
      return this._loadLocal(type).length;
    },

    /** Get all IDs (flat array) */
    getAll: function(type) {
      return this._loadLocal(type);
    },

    /** Clear all entries of a type */
    clear: function(type) {
      try { localStorage.removeItem(this._getKey(type)); } catch(e) {}
      this._scheduleServerSync();
    },

    /** Delete a single entry */
    deleteEntry: function(type, questionId) {
      this.remove(type, questionId);
    },

    /** Get full question data from ID (loads from QuestionLoader if available) */
    getQuestionData: function(questionId) {
      if (!questionId) return null;
      var loader = MediCard.QuestionLoader;
      if (!loader) return null;
      var subj = this._subjectFromId(questionId);
      var questions = loader.getSubject ? loader.getSubject(subj) : null;
      if (questions) {
        for (var i = 0; i < questions.length; i++) {
          if (questions[i].id === questionId) return questions[i];
        }
      }
      return null;
    }
  };

  window.MediCard = MediCard;
})();
