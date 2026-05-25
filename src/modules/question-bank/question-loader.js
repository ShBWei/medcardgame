/**
 * MediCard 医杀 — Question Loader (V5.3)
 * Dynamic lazy loading with chunked preload buffer.
 * Subject files fetched on-demand instead of upfront script tags.
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.QuestionLoader = {
    _cache: {},
    _loadedSubjects: new Set(),
    _selectedSubjects: new Set(),
    _loadingSubjects: {},
    _loadCallbacks: [],
    _cacheVersion: null,  // set on init from MediCard.Config.version
    _questionIndex: {},   // qid → { subjectId, index } — built lazily on load

    init(selectedSubjectIds) {
      this._selectedSubjects = new Set(selectedSubjectIds);
      // Load all selected subjects in parallel, then notify
      this._preloadAll(selectedSubjectIds);
    },

    /** Preload all selected subjects, fire callbacks when done */
    _preloadAll: function(subjectIds) {
      var self = this;
      var ids = Array.isArray(subjectIds) ? subjectIds : Array.from(subjectIds);
      var pending = ids.length;
      if (pending === 0) { self._notifyReady(); return; }
      ids.forEach(function(id) {
        self._fetchSubject(id, function() {
          pending--;
          if (pending === 0) self._notifyReady();
        });
      });
    },

    /** Notify all waiting callbacks that subjects are ready */
    _notifyReady: function() {
      var cbs = this._loadCallbacks;
      this._loadCallbacks = [];
      for (var i = 0; i < cbs.length; i++) cbs[i]();
    },

    /** Register a callback for when subjects are ready.
     *  If _selectedSubjects is set (via init()), waits for all selected.
     *  Otherwise waits for any in-flight _fetchSubject loads to complete. */
    onReady: function(cb) {
      // If loads are in flight, always queue — the load-complete path fires them
      if (Object.keys(this._loadingSubjects).length > 0) {
        this._loadCallbacks.push(cb);
        return;
      }
      if (this._allSelectedLoaded()) { cb(); return; }
      this._loadCallbacks.push(cb);
    },

    /**
     * Register a callback for when a SINGLE subject finishes loading.
     * Fires immediately if already loaded — no waiting for other subjects.
     * Critical for fast study mode start: user clicks a subject and only
     * waits for that one, not all 8.
     *
     * @param {string} subjectId
     * @param {function} callback
     */
    onSubjectReady: function(subjectId, callback) {
      // Already loaded — fire immediately
      if (this._loadedSubjects.has(subjectId) && this._cache[subjectId]) {
        callback();
        return;
      }
      // Currently loading — queue on that subject's callback list
      if (this._loadingSubjects[subjectId]) {
        this._loadingSubjects[subjectId].push(callback);
        return;
      }
      // Not loaded and not loading — trigger fetch and queue
      this._loadingSubjects[subjectId] = [callback];
      this._fetchSubject(subjectId);
    },

    _allSelectedLoaded: function() {
      var self = this;
      var ids = Array.from(this._selectedSubjects);
      for (var i = 0; i < ids.length; i++) {
        if (!self._loadedSubjects.has(ids[i])) return false;
      }
      return true;
    },

    /** Get cache version string from config (lazy). Cleans stale version entries on first call. */
    _getCacheVersion: function() {
      if (this._cacheVersion) return this._cacheVersion;
      var cfg = MediCard.Config;
      this._cacheVersion = (cfg && cfg.version) ? cfg.version : '1.0';
      // Purge old-version cache entries (avoid localStorage bloat)
      try {
        var prefix = 'medicard_subj_';
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var key = localStorage.key(i);
          if (key && key.indexOf(prefix) === 0 && key.indexOf('_' + this._cacheVersion + '_') < 0) {
            localStorage.removeItem(key);
          }
        }
      } catch(e) {}
      return this._cacheVersion;
    },

    /** localStorage key for a subject's cached question data */
    _getCacheKey: function(subjectId) {
      return 'medicard_subj_' + this._getCacheVersion() + '_' + subjectId;
    },

    /** Try to load subject data from localStorage cache. Returns true if cache hit. */
    _tryCacheLoad: function(subjectId) {
      try {
        var raw = localStorage.getItem(this._getCacheKey(subjectId));
        if (!raw) return false;
        // Decompress if stored compressed, fallback to raw JSON for old entries
        var data;
        // Decompress if stored compressed, fallback to raw JSON for old entries
        if (raw.charAt(0) !== '[') {
          try {
            data = JSON.parse(LZString.decompressFromUTF16(raw));
          } catch(e) {
            try { data = JSON.parse(raw); } catch(e2) { return false; }
          }
        } else {
          data = JSON.parse(raw);
          // Migrate old uncompressed entries to compressed
        }
        if (!data || !Array.isArray(data) || data.length === 0) return false;
        // Inject into global QuestionBank and local cache
        if (!MediCard.QuestionBank) MediCard.QuestionBank = {};
        MediCard.QuestionBank[subjectId] = data;
        this._cache[subjectId] = data;
        this._loadedSubjects.add(subjectId);
        this._indexSubject(subjectId);
        return true;
      } catch(e) { return false; }
    },

    /** Persist subject data to localStorage after loading (compressed via LZ-String) */
    _persistToCache: function(subjectId) {
      try {
        var data = this._cache[subjectId];
        if (!data || !Array.isArray(data)) return;
        var value = (typeof LZString !== 'undefined')
          ? LZString.compressToUTF16(JSON.stringify(data))
          : JSON.stringify(data);
        localStorage.setItem(this._getCacheKey(subjectId), value);
      } catch(e) { /* storage full or unavailable */ }
    },

    /** Fetch a subject file dynamically. Prefers fetch+JSON.parse (fast native parser),
     *  falls back to script injection. Returns cached data if already loaded. */
    _fetchSubject: function(subjectId, callback) {
      var self = this;
      // Already loaded
      if (this._loadedSubjects.has(subjectId)) {
        if (callback) callback();
        return;
      }
      // Already loading — queue callback
      if (this._loadingSubjects[subjectId]) {
        this._loadingSubjects[subjectId].push(callback);
        return;
      }

      // Try localStorage cache first (avoids network for repeat visits)
      if (this._tryCacheLoad(subjectId)) {
        if (callback) callback();
        return;
      }

      this._loadingSubjects[subjectId] = [callback];

      // Fast path: fetch as text + JSON.parse (avoids V8 JS parser, ~5-10x faster parse)
      if (typeof fetch === 'function') {
        this._fetchSubjectFast(subjectId);
        return;
      }

      // Fallback: script injection
      this._fetchSubjectScript(subjectId);
    },

    /**
     * Fast loading via fetch() + JSON.parse. Fetches the .js file as plain text,
     * extracts the JSON array from the IIFE wrapper, and parses it with native JSON.parse.
     * Avoids the V8 JS parser entirely — parse time drops from 100-300ms to 10-30ms.
     */
    _fetchSubjectFast: function(subjectId) {
      var self = this;
      var url = 'src/modules/question-bank/subjects/' + subjectId + '.js';

      fetch(url, { cache: 'default' })
        .then(function(response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.text();
        })
        .then(function(text) {
          // Extract JSON array from IIFE wrapper:
          // MediCard.QuestionBank['subject'] = [...];
          // We find the opening [ after the assignment and the closing ];
          var pattern = "MediCard.QuestionBank['" + subjectId + "']";
          var startMarker = pattern + ' = ';
          var startIdx = text.indexOf(startMarker);
          if (startIdx < 0) {
            // Try alternative format: MediCard.QuestionBank.subjectId = [
            startMarker = 'MediCard.QuestionBank.' + subjectId + ' = ';
            startIdx = text.indexOf(startMarker);
          }
          if (startIdx < 0) {
            // Try quoted key format
            startMarker = 'MediCard.QuestionBank["' + subjectId + '"]';
            startIdx = text.indexOf(startMarker);
            if (startIdx >= 0) {
              var eqIdx = text.indexOf('=', startIdx);
              startMarker = text.substring(startIdx, eqIdx + 1);
              startIdx = eqIdx + 1;
            }
          }
          if (startIdx < 0) {
            // Fall back to script injection
            self._fetchSubjectScript(subjectId);
            return;
          }

          var arrayStart = text.indexOf('[', startIdx);
          if (arrayStart < 0) { self._fetchSubjectScript(subjectId); return; }

          // Find matching ]; — count brackets
          var depth = 0;
          var arrayEnd = -1;
          for (var i = arrayStart; i < text.length; i++) {
            if (text[i] === '[') depth++;
            else if (text[i] === ']') { depth--; if (depth === 0) { arrayEnd = i + 1; break; } }
          }
          if (arrayEnd < 0) { self._fetchSubjectScript(subjectId); return; }

          var jsonStr = text.substring(arrayStart, arrayEnd);
          var data = JSON.parse(jsonStr);

          if (!data || !Array.isArray(data)) { self._fetchSubjectScript(subjectId); return; }

          // Success — populate caches
          if (!MediCard.QuestionBank) MediCard.QuestionBank = {};
          MediCard.QuestionBank[subjectId] = data;
          self._cache[subjectId] = data;
          self._loadedSubjects.add(subjectId);
          self._indexSubject(subjectId);
          self._persistToCache(subjectId);

          // Fire callbacks
          var cbs = self._loadingSubjects[subjectId] || [];
          delete self._loadingSubjects[subjectId];
          for (var j = 0; j < cbs.length; j++) { if (cbs[j]) cbs[j](); }
          if (Object.keys(self._loadingSubjects).length === 0 && self._loadCallbacks.length > 0) {
            self._notifyReady();
          }
        })
        .catch(function() {
          // Fetch failed — fall back to script injection
          self._fetchSubjectScript(subjectId);
        });
    },

    /**
     * Traditional script-injection loading (fallback when fetch is unavailable
     * or fetch-based text extraction fails).
     */
    _fetchSubjectScript: function(subjectId) {
      var self = this;
      var script = document.createElement('script');
      script.src = 'src/modules/question-bank/subjects/' + subjectId + '.js';
      script.onload = function() {
        var bank = MediCard.QuestionBank || {};
        if (bank[subjectId]) {
          self._cache[subjectId] = bank[subjectId];
          self._loadedSubjects.add(subjectId);
          self._indexSubject(subjectId);
          self._persistToCache(subjectId);
        }
        var cbs = self._loadingSubjects[subjectId] || [];
        delete self._loadingSubjects[subjectId];
        for (var i = 0; i < cbs.length; i++) { if (cbs[i]) cbs[i](); }
        if (Object.keys(self._loadingSubjects).length === 0 && self._loadCallbacks.length > 0) {
          self._notifyReady();
        }
      };
      script.onerror = function() {
        var cbs = self._loadingSubjects[subjectId] || [];
        delete self._loadingSubjects[subjectId];
        for (var i = 0; i < cbs.length; i++) { if (cbs[i]) cbs[i](); }
      };
      document.head.appendChild(script);
    },

    loadSubject(subjectId) {
      if (this._cache[subjectId]) return this._cache[subjectId];
      var bank = MediCard.QuestionBank || {};
      if (bank[subjectId]) {
        this._cache[subjectId] = bank[subjectId];
        this._loadedSubjects.add(subjectId);
        this._indexSubject(subjectId);
        return bank[subjectId];
      }
      // Trigger async fetch: kick off script-injection load if not already in flight.
      // loadSubject() returns synchronously (empty array for not-yet-loaded subjects),
      // but the fetch runs in background. Callers that need the data should poll via
      // getSubject() or use onReady() with a _fetchSubject callback.
      if (!this._loadedSubjects.has(subjectId) && !this._loadingSubjects[subjectId]) {
        this._fetchSubject(subjectId);
      }
      return [];
    },

    getSubject(subjectId) {
      return this._cache[subjectId] || this.loadSubject(subjectId);
    },

    getQuestionsByDifficulty(subjectId, difficulty) {
      var questions = this.getSubject(subjectId);
      if (!questions || !questions.length) return [];
      if (!difficulty) return questions;
      return questions.filter(function(q) { return q.difficulty === difficulty; });
    },

    /**
     * Generate a 72-card basic deck from selected subjects.
     * Uses CardData.generateBasicDeck() for the actual composition logic.
     */
    generateDeck(cardCount) {
      var selectedIds = Array.from(this._selectedSubjects);
      if (selectedIds.length === 0) return [];
      return MediCard.CardData.generateBasicDeck(selectedIds, this);
    },

    getSelectionStats() {
      var stats = {
        total: 0,
        byDifficulty: { common: 0, rare: 0, epic: 0, legendary: 0 },
        bySubject: {}
      };

      var ids = Array.from(this._selectedSubjects);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var questions = this.getSubject(id);
        if (!questions || !questions.length) {
          // Use metadata counts if questions not loaded yet
          var meta = (MediCard.Config && MediCard.Config.subjectMeta) ? MediCard.Config.subjectMeta[id] : null;
          stats.total += meta ? (meta.questionCount || 0) : 0;
          stats.bySubject[id] = meta ? (meta.questionCount || 0) : 0;
          continue;
        }
        stats.total += questions.length;
        stats.bySubject[id] = questions.length;
        for (var j = 0; j < questions.length; j++) {
          var d = questions[j].difficulty || 'common';
          stats.byDifficulty[d] = (stats.byDifficulty[d] || 0) + 1;
        }
      }

      return stats;
    },

    /** Get question count for a subject without loading the full data */
    getSubjectCount: function(subjectId) {
      if (this._cache[subjectId]) return this._cache[subjectId].length;
      var meta = (MediCard.Config && MediCard.Config.subjectMeta) ? MediCard.Config.subjectMeta[subjectId] : null;
      return meta ? (meta.questionCount || 0) : 0;
    },

    /** Build reverse index for a subject's questions: qid → { subjectId, index } */
    _indexSubject: function(subjectId) {
      var questions = this._cache[subjectId];
      if (!questions || !questions.length) return;
      for (var i = 0; i < questions.length; i++) {
        var q = questions[i];
        var qid = q.id;
        if (qid) this._questionIndex[qid] = { subjectId: subjectId, index: i };
        // Also index card-style IDs (e.g., atk_0_physiology-comm-001)
        if (q.cardId) this._questionIndex[q.cardId] = { subjectId: subjectId, index: i };
      }
    },

    /**
     * Find a question by ID across all loaded subjects (O(1) indexed lookup).
     * If the subject isn't loaded yet, triggers a fetch + onReady callback.
     * @param {string} questionId
     * @param {function} callback receives (questionData || null)
     */
    findQuestionById: function(questionId, callback) {
      var self = this;
      if (!questionId) { if (callback) callback(null); return; }

      // Fast path: index hit
      var entry = this._questionIndex[questionId];
      if (entry && this._cache[entry.subjectId]) {
        var q = this._cache[entry.subjectId][entry.index];
        if (q && (q.id === questionId || q.cardId === questionId)) {
          if (callback) callback(q);
          return q;
        }
      }

      // Slow path: determine subject and ensure it's loaded
      var subj = MediCard.WrongQuestionBook
        ? MediCard.WrongQuestionBook._subjectFromId(questionId)
        : null;
      if (!subj || subj === 'unknown') { if (callback) callback(null); return null; }

      // Already loaded — linear scan (shouldn't happen if index is built, but safety net)
      if (this._loadedSubjects.has(subj) && this._cache[subj]) {
        var qs = this._cache[subj];
        for (var i = 0; i < qs.length; i++) {
          if (qs[i].id === questionId || qs[i].cardId === questionId) {
            if (callback) callback(qs[i]);
            return qs[i];
          }
        }
        if (callback) callback(null);
        return null;
      }

      // Not loaded — trigger fetch and wait
      this.loadSubject(subj);
      this.onReady(function() {
        var retry = self._questionIndex[questionId];
        if (retry && self._cache[retry.subjectId]) {
          var q2 = self._cache[retry.subjectId][retry.index];
          if (callback) callback(q2 || null);
          return;
        }
        // Last-resort scan
        var qs2 = self._cache[subj];
        if (qs2) {
          for (var j = 0; j < qs2.length; j++) {
            if (qs2[j].id === questionId || qs2[j].cardId === questionId) {
              if (callback) callback(qs2[j]);
              return;
            }
          }
        }
        if (callback) callback(null);
      });
      return null; // async — returns null, caller must use callback
    },

  };

  window.MediCard = MediCard;
})();
