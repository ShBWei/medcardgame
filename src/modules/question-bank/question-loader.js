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

    /** Register a callback for when all selected subjects are loaded */
    onReady: function(cb) {
      if (this._allSelectedLoaded()) { cb(); return; }
      this._loadCallbacks.push(cb);
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

    /** Fetch a subject file dynamically via script injection. Returns cached data if already loaded. */
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

      var script = document.createElement('script');
      script.src = 'src/modules/question-bank/subjects/' + subjectId + '.js';
      script.onload = function() {
        // The IIFE in the subject file populates MediCard.QuestionBank[subjectId]
        var bank = MediCard.QuestionBank || {};
        if (bank[subjectId]) {
          self._cache[subjectId] = bank[subjectId];
          self._loadedSubjects.add(subjectId);
          // Persist to localStorage so next visit skips network
          self._persistToCache(subjectId);
        }
        // Fire queued callbacks
        var cbs = self._loadingSubjects[subjectId] || [];
        delete self._loadingSubjects[subjectId];
        for (var i = 0; i < cbs.length; i++) {
          if (cbs[i]) cbs[i]();
        }
      };
      script.onerror = function() {
        delete self._loadingSubjects[subjectId];
        if (callback) callback(); // proceed without data
      };
      document.head.appendChild(script);
    },

    loadSubject(subjectId) {
      if (this._cache[subjectId]) return this._cache[subjectId];
      var bank = MediCard.QuestionBank || {};
      if (bank[subjectId]) {
        this._cache[subjectId] = bank[subjectId];
        this._loadedSubjects.add(subjectId);
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

  };

  window.MediCard = MediCard;
})();
