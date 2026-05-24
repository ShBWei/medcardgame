/**
 * MediCard FastLearn Storage Adapter — 持久化层
 * Sharded localStorage + IndexedDB fallback + export/import
 * Transparent to callers — same save()/load() contract as before
 */
(function() {
  var MediCard = window.MediCard || {};

  var STORAGE_PREFIX = 'medicard_fl_memory_';
  var MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per localStorage key
  var IDB_NAME = 'medicard_fl';
  var IDB_STORE = 'memory';

  /* ========================================================================
   * KEY DERIVATION
   * ======================================================================== */

  function _getUserId() {
    try {
      var Storage = MediCard.Storage;
      if (Storage && Storage.getCurrentUserId) return Storage.getCurrentUserId() || 'default';
    } catch(e) {}
    return 'default';
  }

  function _getBaseKey() { return STORAGE_PREFIX + _getUserId(); }

  /* ========================================================================
   * SHARDED LOCALSTORAGE
   * ======================================================================== */

  function _lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch(e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) return false;
      throw e;
    }
  }

  function _lsGet(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  }

  function _lsRemove(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  }

  /** Save with automatic sharding */
  function _saveSharded(data) {
    // Clean old shards first
    _cleanShards();

    var json = JSON.stringify(data);
    var baseKey = _getBaseKey();

    if (json.length <= MAX_CHUNK_SIZE) {
      // Single-key mode
      return _lsSet(baseKey, json);
    }

    // Shard mode — split into chunks
    var partIdx = 0;
    for (var offset = 0; offset < json.length; offset += MAX_CHUNK_SIZE) {
      var chunk = json.substring(offset, offset + MAX_CHUNK_SIZE);
      var partKey = baseKey + '_part' + partIdx;
      if (!_lsSet(partKey, chunk)) return false;
      partIdx++;
    }
    // Store shard count marker
    _lsSet(baseKey + '_parts', String(partIdx));
    // Remove old single key if it exists
    _lsRemove(baseKey);
    return true;
  }

  function _loadSharded() {
    var baseKey = _getBaseKey();
    var partsMarker = _lsGet(baseKey + '_parts');

    if (partsMarker) {
      // Sharded mode — reassemble parts
      var numParts = parseInt(partsMarker, 10);
      var chunks = [];
      for (var i = 0; i < numParts; i++) {
        var chunk = _lsGet(baseKey + '_part' + i);
        if (chunk === null) return null; // Missing shard
        chunks.push(chunk);
      }
      return chunks.join('');
    }

    // Single-key mode
    return _lsGet(baseKey);
  }

  function _cleanShards() {
    var baseKey = _getBaseKey();
    var partsMarker = _lsGet(baseKey + '_parts');
    if (partsMarker) {
      var numParts = parseInt(partsMarker, 10);
      for (var i = 0; i < numParts; i++) {
        _lsRemove(baseKey + '_part' + i);
      }
    }
    _lsRemove(baseKey + '_parts');
    _lsRemove(baseKey);
  }

  /* ========================================================================
   * INDEXEDDB FALLBACK
   * ======================================================================== */

  function _idbOpen() {
    return new Promise(function(resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IDB not available')); return; }
      var req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function() { reject(req.error); };
    });
  }

  function _idbSave(data) {
    return _idbOpen().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        store.put({ key: _getBaseKey(), value: data, savedAt: Date.now() });
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
      });
    }).catch(function() { return false; });
  }

  function _idbLoad() {
    return _idbOpen().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var store = tx.objectStore(IDB_STORE);
        var req = store.get(_getBaseKey());
        req.onsuccess = function() {
          resolve(req.result ? req.result.value : null);
        };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function() { return null; });
  }

  /* ========================================================================
   * PUBLIC API
   * ======================================================================== */

  var StorageAdapter = {
    _usingIndexedDB: false,

    /**
     * Save memory data. Tries localStorage with sharding first,
     * falls back to IndexedDB on quota error.
     * @param {object} data — { memory, knowledgeErrors }
     */
    save: function(data) {
      var ok = _saveSharded(data);
      if (ok) {
        this._usingIndexedDB = false;
        return;
      }

      // localStorage failed — migrate to IndexedDB
      _idbSave(data).then(function(idbOk) {
        if (idbOk) {
          StorageAdapter._usingIndexedDB = true;
          // Remove any localStorage remnants
          _cleanShards();
        }
      });
    },

    /**
     * Load memory data. Tries localStorage first, then IndexedDB.
     * @returns {object|null} parsed data or null
     */
    load: function() {
      var raw = _loadSharded();
      if (raw) {
        try { return JSON.parse(raw); } catch(e) { return null; }
      }

      // Try IndexedDB (sync fallback pattern — returns null, async load comes later)
      return null;
    },

    /**
     * Async load from IndexedDB if localStorage has nothing.
     * @param {function} callback — receives parsed data or null
     */
    loadAsync: function(callback) {
      var self = this;
      // First try localStorage sync
      var data = this.load();
      if (data) { callback(data); return; }

      // Fall back to IndexedDB
      _idbLoad().then(function(raw) {
        if (raw) {
          try {
            var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            self._usingIndexedDB = true;
            callback(parsed);
          } catch(e) { callback(null); }
        } else {
          callback(null);
        }
      }).catch(function() { callback(null); });
    },

    /* ----------------------------------------------------------------------
     * EXPORT / IMPORT
     * ---------------------------------------------------------------------- */

    /**
     * Export all FastLearn data as downloadable .medicard file.
     */
    exportToFile: function() {
      var FL = MediCard.FastLearnCore;
      var exportData = {
        memory: FL && FL._memory ? FL._memory : {},
        knowledgeErrors: FL && FL._knowledgeErrors ? FL._knowledgeErrors : {},
        exportedAt: new Date().toISOString(),
        version: '6.5.0',
        userId: _getUserId()
      };

      var json = JSON.stringify(exportData, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);

      var now = new Date();
      var dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

      var a = document.createElement('a');
      a.href = url;
      a.download = 'medicard_backup_' + dateStr + '.medicard';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    },

    /**
     * Import from a .medicard file.
     * @param {File} file — file from input[type=file]
     * @param {function} callback — (success, mergedCount)
     */
    importFromFile: function(file, callback) {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (!data || (!data.memory && !data.knowledgeErrors)) {
            callback(false, 0);
            return;
          }

          var FL = MediCard.FastLearnCore;
          var mergedCount = 0;

          // Merge memory entries (newer timestamps take precedence)
          if (data.memory && FL && FL._memory) {
            for (var qid in data.memory) {
              var ie = data.memory[qid];
              var le = FL._memory[qid];
              if (!le || (ie.lastReviewed || 0) > (le.lastReviewed || 0)) {
                FL._memory[qid] = ie;
                mergedCount++;
              }
            }
          }

          // Merge knowledge errors
          if (data.knowledgeErrors && FL && FL._knowledgeErrors) {
            for (var k in data.knowledgeErrors) {
              FL._knowledgeErrors[k] = data.knowledgeErrors[k];
            }
          }

          // Persist immediately
          if (FL && FL.save) FL.save();

          callback(true, mergedCount);
        } catch(err) {
          callback(false, 0);
        }
      };
      reader.onerror = function() { callback(false, 0); };
      reader.readAsText(file);
    }
  };

  /* ========================================================================
   * EXPORT
   * ======================================================================== */

  MediCard.FastLearnStorage = StorageAdapter;
  window.MediCard = MediCard;

  console.log('[FastLearnStorage] Loaded — sharded LS + IndexedDB fallback + export/import');
})();
