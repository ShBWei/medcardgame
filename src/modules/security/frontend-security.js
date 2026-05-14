/**
 * MediCard 医杀 — Frontend Runtime Security
 * Anti-tamper, input guard, DOM integrity, data validation
 */
(function() {
  var M = window.MediCard || {};

  M.Security = {
    // ── DOM mutation monitoring ────────────────────────────────
    _observer: null,

    init: function() {
      // Monitor for unexpected script injection
      if (window.MutationObserver) {
        this._observer = new MutationObserver(function(mutations) {
          // Only block injections after initial page load — during parsing
          // all <script> tags come from the HTML source and are legitimate.
          if (document.readyState !== 'complete') return;
          for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
              var node = added[j];
              if (node.nodeType === 1) {
                if (node.tagName === 'SCRIPT' && !node.hasAttribute('data-authorized')) {
                  console.warn('[Security] Blocked unauthorized script injection');
                  node.parentNode && node.parentNode.removeChild(node);
                }
                if (node.tagName === 'IFRAME') {
                  console.warn('[Security] Blocked iframe injection');
                  node.parentNode && node.parentNode.removeChild(node);
                }
              }
            }
          }
        });
        this._observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    },

    // ── Validate game data integrity ────────────────────────────
    validateGameState: function(state) {
      if (!state || typeof state !== 'object') return false;
      // HP bounds check
      if (state.hp !== undefined && (state.hp < 0 || state.hp > 99)) return false;
      if (state.maxHp !== undefined && (state.maxHp < 0 || state.maxHp > 99)) return false;
      // Card count bounds
      if (state.hand !== undefined && (!Array.isArray(state.hand) || state.hand.length > 200)) return false;
      // Turn bounds
      if (state.turn !== undefined && (state.turn < 0 || state.turn > 9999)) return false;
      return true;
    },

    // ── Validate incoming network message ───────────────────────
    validateMessage: function(data) {
      if (!data || typeof data !== 'object') return false;
      var str = JSON.stringify(data);
      // Size limit
      if (str.length > 16384) return false;
      // Block code injection in JSON strings
      if (/<script|javascript:|on\w+\s*=/i.test(str)) return false;
      // Block SQL-like injection patterns
      if (/(SELECT|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC)\s/i.test(str)) return false;
      // Block prototype pollution keys
      if (str.indexOf('__proto__') !== -1) return false;
      if (str.indexOf('constructor') !== -1 && str.indexOf('prototype') !== -1) return false;
      return true;
    },

    // ── Safe JSON parse ─────────────────────────────────────────
    safeJSONParse: function(raw) {
      if (!raw || typeof raw !== 'string') return null;
      if (raw.length > 65536) return null;
      try { return JSON.parse(raw); }
      catch (e) { return null; }
    },

    // ── localStorage integrity check ────────────────────────────
    checkStorageIntegrity: function() {
      try { if (!localStorage) return true; } catch(e) { return true; }
      var keys = Object.keys(localStorage);
      var problematic = [];
      for (var i = 0; i < keys.length; i++) {
        try {
          var val = localStorage.getItem(keys[i]);
          if (val && val.length > 500000) problematic.push(keys[i] + ': oversize');
          if (val && /<script|__proto__|constructor\[/i.test(val)) problematic.push(keys[i] + ': injection pattern');
        } catch(e) {
          problematic.push(keys[i] + ': read error');
        }
      }
      if (problematic.length > 0) {
        console.warn('[Security] Storage integrity issues:', problematic);
        // Auto-clean malicious data
        for (var j = 0; j < problematic.length; j++) {
          var key = problematic[j].split(':')[0];
          localStorage.removeItem(key);
        }
      }
      return problematic.length === 0;
    },

    // ── Deep freeze prototype ───────────────────────────────────
    lockPrototypes: function() {
      try {
        Object.freeze(Object.prototype);
        Object.freeze(Array.prototype);
        // Object.freeze(Function.prototype) removed — freezes apply/call,
        // causing "Maximum call stack size exceeded" in setInterval callbacks
        // and other legitimate Function.prototype usage.
        Object.freeze(String.prototype);
      } catch(e) {
        // Silently ignore in restricted environments
      }
    }
  };

  // Auto-init (safe: won't break if localStorage unavailable)
  try { M.Security.init(); } catch(e) {}
  try { M.Security.checkStorageIntegrity(); } catch(e) {}

  // Global error guard
  window.addEventListener('error', function(e) {
    if (e.filename && e.filename.indexOf(window.location.origin) === 0) {
      console.error('[Security] JS error:', e.message, '@', e.filename + ':' + e.lineno);
    }
    // Suppress errors from external scripts
    return true;
  });

  window.MediCard = M;
})();
