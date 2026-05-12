/**
 * MediCard 医杀 — Turn System (V5.2 Full)
 * Phases: Judge → Draw → Main → Discard → End
 * Judgment phase processes delayed tactics before draw
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
    _playerCount: 2,

    init() {
      this.currentPlayerIndex = 0;
      this.phase = 'idle';
      this.turnNumber = 0;
      this.timeLeft = D.turnTimeLimit;
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
      this.phase = 'idle';
      if (this.onPhaseChange) this.onPhaseChange('turnEnd');
    },

    clearTimer() {
      if (this.turnTimer) {
        clearInterval(this.turnTimer);
        this.turnTimer = null;
      }
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
