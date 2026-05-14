/**
 * MediCard 医杀 — BattleLogger (V1.0)
 * Structured logging, anomaly detection, log export for debugging
 * Non-invasive: uses wrap() to hook existing functions without modification
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.BattleLogger = {
    _enabled: true,
    _buffer: [],
    _maxBuffer: 500,
    _seq: 0,
    _playerId: '',
    _screenBattle: null,

    // Pending message tracking for MESSAGE_LOST detection
    _pendingMessages: {},
    _pendingTimeout: 10000,

    // Anomaly state trackers
    _turnMismatchCount: 0,
    _attackStartTime: 0,
    _lastTurnChangeTime: 0,

    /**
     * Initialize the logger with player context
     * @param {boolean} isMultiplayer
     * @param {number} myPlayerIndex
     * @param {boolean} isHost
     */
    init: function(isMultiplayer, myPlayerIndex, isHost) {
      this._playerId = (isMultiplayer ? (isHost ? 'host' : 'client_' + myPlayerIndex) : 'p1');
      this._screenBattle = MediCard.ScreenBattle;
      this._enabled = true;
      this._turnMismatchCount = 0;
      this._attackStartTime = 0;
      this._lastTurnChangeTime = 0;
    },

    /** Enable logging */
    enable: function() { this._enabled = true; },

    /** Disable logging */
    disable: function() { this._enabled = false; },

    /**
     * Main log entry point. Automatically runs anomaly checks.
     * @param {string} logType - STATE_CHANGE | USER_ACTION | NETWORK | SYSTEM | ANOMALY
     * @param {string} action - descriptive action name
     * @param {string} detail - extra human-readable detail
     * @param {object} extraState - additional state fields to merge
     */
    log: function(logType, action, detail, extraState) {
      if (!this._enabled) return;

      var state = this._captureState();
      if (extraState) {
        for (var k in extraState) { if (extraState.hasOwnProperty(k)) state[k] = extraState[k]; }
      }

      var entry = {
        seq: ++this._seq,
        ts: new Date().toISOString(),
        playerId: this._playerId,
        logType: logType,
        action: action,
        state: state,
        anomaly: false,
        anomalyReason: '',
        detail: detail || ''
      };

      // Run anomaly checks
      this._runAnomalyChecks(entry);

      // Ring buffer
      this._buffer.push(entry);
      if (this._buffer.length > this._maxBuffer) {
        this._buffer.shift();
      }

      // Also output to console for in-game debug overlay
      if (entry.anomaly) {
        console.warn('[BattleLogger ANOMALY] ' + entry.anomalyReason + ' | ' + JSON.stringify(entry).substring(0, 200));
      }
    },

    /**
     * Log a peer network message
     * @param {string} direction - 'send' | 'recv'
     * @param {*} rawData - the message payload
     * @param {string} connId - connection/peer identifier
     */
    logPeerMessage: function(direction, rawData, connId) {
      if (!this._enabled) return;

      var dataStr;
      try {
        if (typeof rawData === 'string') {
          dataStr = rawData.length > 500 ? rawData.substring(0, 500) + '...' : rawData;
        } else {
          dataStr = JSON.stringify(rawData);
          if (dataStr.length > 500) dataStr = dataStr.substring(0, 500) + '...';
        }
      } catch (e) {
        dataStr = '[unserializable]';
      }

      var msgId = connId + '_' + Date.now();
      if (direction === 'send') {
        this._pendingMessages[msgId] = { ts: Date.now(), connId: connId, preview: dataStr.substring(0, 100) };
      }

      this.log('NETWORK', 'peer_' + direction, connId, { dataPreview: dataStr, msgId: direction === 'send' ? msgId : undefined });
    },

    /**
     * Acknowledge a sent message was responded to (prevents MESSAGE_LOST false positive)
     */
    ackMessage: function(msgId) {
      if (msgId && this._pendingMessages[msgId]) {
        delete this._pendingMessages[msgId];
      }
    },

    /**
     * Wrap a method on an object with before/after hooks.
     * Non-invasive: stores original, calls beforeFn before, afterFn after.
     * @param {object} obj - the object holding the method
     * @param {string} methodName - name of the method to wrap
     * @param {Function} beforeFn - called with (args) before original; return false to skip original
     * @param {Function} afterFn - called with (result, args) after original
     */
    wrap: function(obj, methodName, beforeFn, afterFn) {
      if (!obj || !obj[methodName]) return;
      var original = obj[methodName];
      var self = this;
      obj[methodName] = function() {
        var skip = false;
        if (beforeFn) {
          try { skip = beforeFn.apply(self, arguments) === false; } catch (e) {}
        }
        var result;
        if (!skip) {
          result = original.apply(this, arguments);
        }
        if (afterFn) {
          try { afterFn.call(self, result, arguments); } catch (e) {}
        }
        return result;
      };
    },

    /**
     * Export the log buffer as a downloadable text file.
     * Each line is one JSON entry — easy to grep/jq.
     */
    export: function() {
      var lines = [];
      for (var i = 0; i < this._buffer.length; i++) {
        lines.push(JSON.stringify(this._buffer[i]));
      }
      var content = lines.join('\n');

      var now = new Date();
      var ts = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
      var filename = 'medicard-log-' + ts + '.txt';

      var blob = new Blob([content], { type: 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { entries: this._buffer.length, filename: filename };
    },

    /**
     * Get the full buffer (for debug overlay)
     */
    getBuffer: function() {
      return this._buffer.slice();
    },

    /**
     * Get anomaly count since last reset
     */
    getAnomalyCount: function() {
      var count = 0;
      for (var i = 0; i < this._buffer.length; i++) {
        if (this._buffer[i].anomaly) count++;
      }
      return count;
    },

    // ── Internal ──

    /**
     * Capture current game state snapshot
     */
    _captureState: function() {
      var gs = MediCard.GameState;
      var sb = this._screenBattle;
      var state = {
        currentPlayerIndex: gs.currentPlayerIndex,
        myPlayerIndex: (sb && sb._myPlayerIndex !== undefined) ? sb._myPlayerIndex : 0,
        turnActive: sb ? !!sb._turnActive : false,
        isMultiplayer: sb ? !!sb._isMultiplayer : false,
        isHost: sb ? !!sb._isHost : false,
        playerCount: gs.players ? gs.players.length : 0,
        handSize: (sb && sb._player && sb._player.hand) ? sb._player.hand.length : 0,
        deckCount: gs.deck ? gs.deck.length : 0,
        attackInProgress: sb ? !!sb._attackInProgress : false,
        duelInProgress: sb ? !!sb._duelInProgress : false,
        jueshaPlayedThisTurn: sb ? !!sb._jueshaPlayedThisTurn : false,
        discardPhase: sb ? !!sb._isDiscardPhase : false
      };
      // Include alive status for each player
      if (gs.players) {
        state.playersAlive = gs.players.map(function(p) { return p ? !!p.alive : false; });
      }
      return state;
    },

    /**
     * Run all anomaly detection rules against a log entry
     */
    _runAnomalyChecks: function(entry) {
      var checks = this._anomalyRules;
      for (var ruleId in checks) {
        if (checks.hasOwnProperty(ruleId) && checks[ruleId]) {
          try { checks[ruleId].call(this, entry); } catch (e) {}
        }
      }
    },

    /**
     * Anomaly detection rules (keyed by rule ID).
     * Each function receives the log entry; sets entry.anomaly=true + entry.anomalyReason if triggered.
     */
    _anomalyRules: {
      // 1: On my turn but turnActive=false and not in attack
      BUTTON_DISABLED_ON_MY_TURN: function(entry) {
        var s = entry.state;
        if (s.currentPlayerIndex === s.myPlayerIndex && !s.turnActive && !s.attackInProgress && !s.duelInProgress) {
          entry.anomaly = true;
          entry.anomalyReason = 'BUTTON_DISABLED_ON_MY_TURN: player turn but turnActive=false';
        }
      },

      // 2: CLICK_WHEN_DISABLED — detected by the caller passing clickInfo
      CLICK_WHEN_DISABLED: function(entry) {
        if (entry.action === 'button_click' && entry.detail && entry.detail.indexOf('disabled') >= 0) {
          entry.anomaly = true;
          entry.anomalyReason = 'CLICK_WHEN_DISABLED: button click while disabled';
        }
      },

      // 3: TURN_MISMATCH — turn_change with mismatched index
      TURN_MISMATCH: function(entry) {
        if (entry.action === 'turn_change_recv' && entry.state._hostCurrentIdx !== undefined) {
          if (entry.state._hostCurrentIdx !== entry.state.currentPlayerIndex) {
            this._turnMismatchCount++;
            if (this._turnMismatchCount > 2) {
              entry.anomaly = true;
              entry.anomalyReason = 'TURN_MISMATCH: host idx=' + entry.state._hostCurrentIdx +
                ' vs local idx=' + entry.state.currentPlayerIndex + ' (count=' + this._turnMismatchCount + ')';
            }
          } else {
            this._turnMismatchCount = 0;
          }
        }
      },

      // 4: ATTACK_STUCK — _attackInProgress stays non-null > 15s
      ATTACK_STUCK: function(entry) {
        var sb = this._screenBattle;
        if (sb && sb._attackInProgress) {
          if (!this._attackStartTime) {
            this._attackStartTime = Date.now();
          } else if (Date.now() - this._attackStartTime > 15000) {
            entry.anomaly = true;
            entry.anomalyReason = 'ATTACK_STUCK: attackInProgress for ' +
              Math.round((Date.now() - this._attackStartTime) / 1000) + 's';
            this._attackStartTime = 0; // reset to avoid spam
          }
        } else {
          this._attackStartTime = 0;
        }
      },

      // 5: MESSAGE_LOST — pending messages > 10s without ack
      MESSAGE_LOST: function(entry) {
        var now = Date.now();
        var lostIds = [];
        for (var msgId in this._pendingMessages) {
          if (this._pendingMessages.hasOwnProperty(msgId)) {
            if (now - this._pendingMessages[msgId].ts > this._pendingTimeout) {
              lostIds.push(msgId);
            }
          }
        }
        if (lostIds.length > 0) {
          entry.anomaly = true;
          entry.anomalyReason = 'MESSAGE_LOST: ' + lostIds.length + ' pending message(s) without response';
          for (var i = 0; i < lostIds.length; i++) {
            delete this._pendingMessages[lostIds[i]];
          }
        }
      },

      // 6: DOUBLE_TURN_CHANGE — two turn_change within 1 second
      DOUBLE_TURN_CHANGE: function(entry) {
        if (entry.action === 'turn_change_recv' || entry.action === 'turn_change_send') {
          var now = Date.now();
          if (this._lastTurnChangeTime && (now - this._lastTurnChangeTime < 1000)) {
            entry.anomaly = true;
            entry.anomalyReason = 'DOUBLE_TURN_CHANGE: two turn changes within ' +
              (now - this._lastTurnChangeTime) + 'ms';
          }
          this._lastTurnChangeTime = now;
        }
      },

      // 7: PERMISSION_STATE_ERROR — turnActive but buttons disabled in DOM
      PERMISSION_STATE_ERROR: function(entry) {
        if (entry.action === 'update_play_button') {
          var s = entry.state;
          if (s.currentPlayerIndex === s.myPlayerIndex && s.turnActive && !s.attackInProgress && !s.duelInProgress) {
            // Check actual DOM button state (if available)
            try {
              var btn = document.getElementById('play-selected-btn');
              if (btn && btn.disabled) {
                entry.anomaly = true;
                entry.anomalyReason = 'PERMISSION_STATE_ERROR: turnActive=true but play button disabled in DOM';
              }
            } catch (e) {}
          }
        }
      },

      // 8: HOST_CLIENT_INDEX_MISMATCH — host thinks clientIdx != message playerIdx
      HOST_CLIENT_INDEX_MISMATCH: function(entry) {
        if (entry.action === 'remote_play_card' && entry.state._hostExpectedIdx !== undefined &&
            entry.state._msgPlayerIdx !== undefined) {
          if (entry.state._hostExpectedIdx !== entry.state._msgPlayerIdx) {
            entry.anomaly = true;
            entry.anomalyReason = 'HOST_CLIENT_INDEX_MISMATCH: expected=' + entry.state._hostExpectedIdx +
              ' actual=' + entry.state._msgPlayerIdx;
          }
        }
      },

      // 9: END_TURN_IGNORED — remote end turn ignored due to index mismatch
      END_TURN_IGNORED: function(entry) {
        if (entry.action === 'remote_end_turn_ignored') {
          entry.anomaly = true;
          entry.anomalyReason = 'END_TURN_IGNORED: ' + (entry.detail || 'currentPlayerIndex mismatch');
        }
      }
    },

    // ── Global error capture ──

    _setupGlobalErrorCapture: function() {
      var self = this;
      window.addEventListener('error', function(e) {
        self.log('ANOMALY', 'global_error', e.message || 'Unknown error', {
          filename: e.filename || '',
          lineno: e.lineno || 0,
          colno: e.colno || 0,
          stack: (e.error && e.error.stack) ? e.error.stack.substring(0, 500) : ''
        });
      });
      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', function(e) {
        self.log('ANOMALY', 'unhandled_rejection', (e.reason && e.reason.message) || 'Promise rejection', {
          stack: (e.reason && e.reason.stack) ? e.reason.stack.substring(0, 500) : ''
        });
      });
    }
  };

  // Auto-register global error capture on load
  MediCard.BattleLogger._setupGlobalErrorCapture();

  window.MediCard = MediCard;
})();
