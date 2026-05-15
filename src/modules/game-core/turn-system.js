/**
 * MediCard 医杀 — Turn System (V5.2 Full)
 * Phases: Judge → Draw → Main → Discard → End
 * Judgment phase processes delayed tactics before draw
 *
 * FIX-P1-001 - 启用回合超时兜底：实现 startTurnTimer/stopTurnTimer
 * 修改日期：2026-05-15
 */
(function() {
  const MediCard = window.MediCard || {};
  const D = MediCard.Config ? MediCard.Config.defaults : { turnTimeLimit: 60 };

  MediCard.TurnSystem = {
    currentPlayerIndex: 0,
    phase: 'idle', // idle | judge | draw | main | discard | end
    turnNumber: 0,
    turnTimer: null,
    timeLeft: D.turnTimeLimit,
    onPhaseChange: null,
    onTimerTick: null,
    onTimeout: null,
    _playerCount: 2,
    _timerCtx: null,

    init() {
      this.currentPlayerIndex = 0;
      this.phase = 'idle';
      this.turnNumber = 0;
      this.timeLeft = D.turnTimeLimit;
      this.onTimeout = null;
      this._timerCtx = null;
      this.clearTimer();
    },

    startGame(playerCount) {
      this._playerCount = playerCount || 2;
      this.currentPlayerIndex = 0;
      this.turnNumber = 1;
      this._startPhase('judge');
    },

    nextTurn() {
      this.clearTimer();
      this.turnNumber++;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this._playerCount;
      this._startPhase('judge');
    },

    _startPhase(phase) {
      this.phase = phase;
      if (this.onPhaseChange) this.onPhaseChange(phase);
    },

    advancePhase() {
      switch (this.phase) {
        case 'judge':
          this._startPhase('draw');
          break;
        case 'draw':
          this._startPhase('main');
          break;
        case 'main':
          this._startPhase('discard');
          break;
        case 'discard':
          this._endTurn();
          break;
      }
    },

    _endTurn() {
      this.stopTurnTimer();
      this.phase = 'idle';
      if (this.onPhaseChange) this.onPhaseChange('turnEnd');
    },

    // FIX-P1-001: 启动回合超时定时器，到期自动结束回合
    startTurnTimer(seconds, onTick, onExpire) {
      this.stopTurnTimer();
      var limit = seconds || D.turnTimeLimit;
      this.timeLeft = limit;
      this.onTimeout = onExpire || null;
      this._timerCtx = { onTick: onTick, onExpire: onExpire };
      var self = this;
      this.turnTimer = setInterval(function() {
        self.timeLeft--;
        if (self.onTimerTick) self.onTimerTick(self.timeLeft);
        if (self._timerCtx && self._timerCtx.onTick) self._timerCtx.onTick(self.timeLeft);
        if (self.timeLeft <= 0) {
          self.stopTurnTimer();
          var cb = self.onTimeout;
          self.onTimeout = null;
          if (cb) {
            try {
              if (MediCard.BattleLogger) MediCard.BattleLogger.log('SYSTEM', 'turn_timeout', 'Turn timer expired after ' + limit + 's');
              cb();
            } catch(e) {
              console.error('[TurnSystem] onTimeout callback crashed:', e);
            }
          }
        }
      }, 1000);
    },

    // FIX-P1-001: 停止回合超时定时器
    stopTurnTimer() {
      if (this.turnTimer) {
        clearInterval(this.turnTimer);
        this.turnTimer = null;
      }
      this._timerCtx = null;
      this.onTimeout = null;
      this.timeLeft = D.turnTimeLimit;
    },

    clearTimer() {
      this.stopTurnTimer();
    },

    setPlayerCount(count) {
      this._playerCount = count;
    },

    getCurrentPlayerIndex() {
      return this.currentPlayerIndex;
    },

    getPhase() {
      return this.phase;
    }
  };

  window.MediCard = MediCard;
})();
