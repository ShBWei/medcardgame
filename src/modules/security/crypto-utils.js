/**
 * MediCard 医杀 — Crypto & Security Utils
 * SHA-256 password hashing, input sanitization, validation
 * No external dependencies — uses Web Crypto API with fallback
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.Crypto = {
    /**
     * Hash a password using SHA-256 via SubtleCrypto.
     * Falls back to a simple iterative hash if SubtleCrypto unavailable.
     * Returns: hex string or null on failure.
     */
    hashPassword: function(password, callback) {
      if (!password || typeof password !== 'string') {
        if (callback) callback(null);
        return;
      }
      var encoder = new TextEncoder();
      var data = encoder.encode(password);

      // Try Web Crypto API
      if (window.crypto && window.crypto.subtle) {
        window.crypto.subtle.digest('SHA-256', data).then(function(hashBuffer) {
          var hashArray = Array.from(new Uint8Array(hashBuffer));
          var hex = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
          if (callback) callback(hex);
        }).catch(function() {
          // Fallback on error
          if (callback) callback(_fallbackHash(password));
        });
      } else {
        // Synchronous fallback
        var result = _fallbackHash(password);
        if (callback) callback(result);
      }
    },

    /** Synchronous hashPassword variant that returns a promise-like value */
    hashPasswordSync: function(password) {
      if (!password || typeof password !== 'string') return null;
      return _fallbackHash(password);
    },

    /**
     * Verify password against stored hash.
     * @param {string} password - Plaintext password
     * @param {string} storedHash - Previously computed hash
     * @param {Function} callback - (isMatch: boolean)
     */
    verifyPassword: function(password, storedHash, callback) {
      if (!password || !storedHash) {
        if (callback) callback(false);
        return;
      }
      this.hashPassword(password, function(computedHash) {
        if (!computedHash) {
          if (callback) callback(false);
          return;
        }
        // Constant-time comparison (mitigates timing attacks)
        var match = _constantTimeCompare(computedHash, storedHash);
        if (callback) callback(match);
      });
    },

    /**
     * Sanitize user input — strip HTML, limit length, trim.
     * @param {string} input - Raw input
     * @param {number} maxLen - Maximum allowed length
     * @returns {string} Sanitized string
     */
    sanitize: function(input, maxLen) {
      if (!input || typeof input !== 'string') return '';
      // Strip any HTML/XML tags
      var cleaned = input.replace(/<[^>]*>/g, '');
      // Strip script-related content
      cleaned = cleaned.replace(/javascript:/gi, '');
      cleaned = cleaned.replace(/on\w+\s*=/gi, '');
      // Trim and limit
      cleaned = cleaned.trim();
      if (maxLen && cleaned.length > maxLen) {
        cleaned = cleaned.substring(0, maxLen);
      }
      return cleaned;
    },

    /**
     * Validate username: 1-16 chars, alphanumeric + Chinese + underscore + hyphen
     */
    validateUsername: function(name) {
      if (!name || typeof name !== 'string') return false;
      var cleaned = name.trim();
      if (cleaned.length < 1 || cleaned.length > 16) return false;
      // Allow: letters, digits, Chinese chars, underscore, hyphen, spaces (single)
      if (!/^[\w一-鿿㐀-䶿\-\s]{1,16}$/.test(cleaned)) return false;
      // No leading/trailing spaces
      if (cleaned !== cleaned.replace(/^\s+|\s+$/, '')) return false;
      return true;
    },

    /**
     * Validate password: minimum 6 characters
     */
    validatePassword: function(pw) {
      if (!pw || typeof pw !== 'string') return false;
      return pw.length >= 6 && pw.length <= 128;
    },

    /**
     * Escape HTML entities for safe rendering
     */
    escapeHtml: function(str) {
      if (!str || typeof str !== 'string') return '';
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /**
     * Validate and sanitize any data read from localStorage before use.
     * Catches tampered/manipulated data.
     */
    safeGetFromStorage: function(key, validatorFn, defaultValue) {
      try {
        var raw = localStorage.getItem('medicard_' + key);
        if (!raw) return defaultValue;
        var parsed = JSON.parse(raw);
        if (validatorFn && !validatorFn(parsed)) {
          // Security: silently reset tampered data
          localStorage.removeItem('medicard_' + key);
          return defaultValue;
        }
        return parsed;
      } catch (e) {
        return defaultValue;
      }
    }
  };

  // ── Internal helpers ──

  /**
   * Fallback hash when SubtleCrypto is unavailable.
   * Uses iterative string hashing — NOT cryptographically secure but
   * sufficient for client-side game password storage.
   */
  function _fallbackHash(str) {
    var hash = 0;
    var salt = 'MediCard_SecureSalt_2024';
    var salted = str + salt;
    for (var round = 0; round < 10; round++) {
      hash = 5381;
      for (var i = 0; i < salted.length; i++) {
        hash = ((hash << 5) + hash) + salted.charCodeAt(i);
        hash = hash & 0xFFFFFFFF;
      }
      salted = salted.split('').reverse().join('') + hash.toString(16);
    }
    // Produce a 64-char hex string
    var result = '';
    for (var j = 0; j < 8; j++) {
      var chunk = ((hash * (j + 1) + j * 2654435761) >>> 0).toString(16);
      result += chunk.padStart(8, '0');
    }
    return result.substring(0, 64);
  }

  /** Constant-time string comparison */
  function _constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    var result = 0;
    var len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) {
      result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return result === 0 && a.length === b.length;
  }

  window.MediCard = MediCard;
})();
