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

    /** In-memory cache for _loadLocal — avoids repeated localStorage reads within session */
    _memCache: {},

    /** Invalidate memory cache for a given type */
    _invalidateCache: function(type) {
      delete this._memCache['load_' + type];
    },

    /** Get subject from question ID (handles multiple formats including composite card IDs) */
    _subjectFromId: function(qid) {
      if (!qid) return 'unknown';
      var decoded = this._decodeId(qid);

      // 1. Encoded format check (decode may reveal subject prefix like "microbiology_042")
      if (decoded !== qid) {
        var subj = this._subjectFromPlainId(decoded);
        if (subj !== 'unknown') return subj;
      }

      // 2. Handle composite card IDs: tac_<subtype>_<qid>, equ_<subtype>_<qid>, etc.
      // Strip prefix patterns to extract the real question ID
      var prefixMatch = decoded.match(/^(tac|equ|dly|atk|def|heal|jsh|jdo)_[^_]+_(.+)$/);
      if (prefixMatch) {
        var innerQid = prefixMatch[2];
        var innerSubj = this._subjectFromPlainId(innerQid);
        if (innerSubj !== 'unknown') return innerSubj;
      }

      // 3. Try plain ID lookup
      return this._subjectFromPlainId(decoded);
    },

    /** Subject lookup for a plain (non-composite) question ID */
    _subjectFromPlainId: function(qid) {
      // Prefix → subject mapping (longest first to avoid partial matches)
      var prefixMap = {
        'histology-embryology': 'histology-embryology',
        'systematic-anatomy': 'systematic-anatomy',
        'cell-biology': 'cell-biology',
        'biochemistry': 'biochemistry',
        'physiology': 'physiology',
        'pathology': 'pathology',
        'immunology': 'immunology',
        'microbiology': 'microbiology',
        'histol': 'histology-embryology',
        'sys-anat': 'systematic-anatomy',
        'cell-bio': 'cell-biology',
        'bioche': 'biochemistry',
        'immuno': 'immunology',
        'micro': 'microbiology'
      };
      var prefixes = Object.keys(prefixMap).sort(function(a, b) { return b.length - a.length; });
      for (var i = 0; i < prefixes.length; i++) {
        if (qid.indexOf(prefixes[i]) === 0) return prefixMap[prefixes[i]];
      }
      return 'unknown';
    },

    /** Load ID array from localStorage — decode on read, with in-memory cache */
    _loadLocal: function(type) {
      var cacheKey = 'load_' + type;
      if (this._memCache[cacheKey]) return this._memCache[cacheKey];
      try {
        var raw = localStorage.getItem(this._getKey(type));
        if (!raw) { this._memCache[cacheKey] = []; return []; }
        var ids = JSON.parse(raw);
        var decoded = [];
        // Filter out known-broken IDs (card-type prefixes without question ID)
        for (var i = 0; i < ids.length; i++) {
          var d = this._decodeId(ids[i]);
          if (this._isValidQid(d)) decoded.push(d);
        }
        this._memCache[cacheKey] = decoded;
        return decoded;
      } catch(e) { return []; }
    },

    /** Check if a decoded ID belongs to a known subject (prefix match). */
    _isValidQid: function(qid) {
      if (!qid || typeof qid !== 'string') return false;
      var knownPrefixes = [
        'histology-embryology', 'systematic-anatomy', 'cell-biology', 'biochemistry',
        'physiology', 'pathology', 'immunology', 'microbiology',
        'histol', 'sys-anat', 'cell-bio', 'bioche', 'immuno', 'micro'
      ];
      for (var i = 0; i < knownPrefixes.length; i++) {
        if (qid.indexOf(knownPrefixes[i]) === 0) return true;
      }
      return false;
    },

    /** Save ID array to localStorage — encode on write, invalidate cache */
    _saveLocal: function(type, ids) {
      this._invalidateCache(type);
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

    /** Parse question ID like "micro-lege-001" or "cell-bio-common-001" → { subject, index } */
    _parseQid: function(qid) {
      var decoded = this._decodeId(qid);
      var subject = this._subjectFromPlainId(decoded);
      if (subject === 'unknown') return null;
      var match = decoded.match(/[-_](\d+)$/);
      if (!match) return null;
      return { subject: subject, index: parseInt(match[1], 10) };
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

    /** Get full question data from ID. O(1) indexed lookup — fast path for loaded subjects. */
    getQuestionData: function(questionId) {
      if (!questionId) return null;
      var loader = MediCard.QuestionLoader;
      if (!loader) return null;

      // O(1) reverse-index lookup (fast path)
      var entry = loader._questionIndex && loader._questionIndex[questionId];
      if (entry) {
        var cached = loader._cache && loader._cache[entry.subjectId];
        if (cached && entry.index < cached.length) {
          var q = cached[entry.index];
          if (q && (q.id === questionId || q.cardId === questionId)) return q;
        }
      }

      // Fallback: deduce subject and scan (only for subjects not yet indexed)
      var subj = this._subjectFromId(questionId);
      var questions = loader.getSubject ? loader.getSubject(subj) : null;
      if (questions) {
        for (var i = 0; i < questions.length; i++) {
          if (questions[i].id === questionId || questions[i].cardId === questionId) return questions[i];
        }
      }
      return null;
    },

    /**
     * Batch-load question data for multiple IDs.
     * Returns all found questions in a single pass, building a result map.
     * Much faster than calling getQuestionData() in a loop (one scan per subject).
     *
     * @param {Array} questionIds
     * @returns {object} { qid: questionData } map for all found questions
     */
    getQuestionDataBatch: function(questionIds) {
      var result = {};
      if (!questionIds || !questionIds.length) return result;
      var loader = MediCard.QuestionLoader;
      if (!loader) return result;

      // Group IDs by subject
      var bySubject = {};
      for (var i = 0; i < questionIds.length; i++) {
        var qid = questionIds[i];
        // Try index first
        var entry = loader._questionIndex && loader._questionIndex[qid];
        if (entry) {
          if (!bySubject[entry.subjectId]) bySubject[entry.subjectId] = [];
          bySubject[entry.subjectId].push({ qid: qid, index: entry.index });
        } else {
          var subj = this._subjectFromId(qid);
          if (!bySubject[subj]) bySubject[subj] = [];
          bySubject[subj].push({ qid: qid, index: -1 });
        }
      }

      // One scan per subject
      for (var subj in bySubject) {
        var questions = loader.getSubject ? loader.getSubject(subj) : null;
        if (!questions) continue;

        var indexedSet = {};
        for (var j = 0; j < bySubject[subj].length; j++) {
          var item = bySubject[subj][j];
          if (item.index >= 0 && item.index < questions.length) {
            var q = questions[item.index];
            if (q && (q.id === item.qid || q.cardId === item.qid)) {
              result[item.qid] = q;
            } else {
              indexedSet[item.qid] = true;
            }
          } else {
            indexedSet[item.qid] = true; // needs linear scan
          }
        }

        // Single linear scan for remaining unmatched IDs in this subject
        if (Object.keys(indexedSet).length > 0) {
          for (var k = 0; k < questions.length; k++) {
            var qk = questions[k];
            var matchId = qk.id || qk.cardId;
            if (matchId && indexedSet[matchId]) {
              result[matchId] = qk;
              delete indexedSet[matchId];
              if (Object.keys(indexedSet).length === 0) break;
            }
          }
        }
      }
      return result;
    }
  };

  window.MediCard = MediCard;
})();
