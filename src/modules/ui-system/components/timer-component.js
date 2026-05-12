/**
 * MediCard Duel — Timer Component
 * Countdown timer for turns and answer time
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.TimerComponent = {
    _interval: null,
    _timeLeft: 0,
    _onTick: null,
    _onTimeout: null,

    /**
     * Start a countdown timer
     * @param {Number} seconds - Total seconds
     * @param {Function} onTick - Called each second with remaining seconds
     * @param {Function} onTimeout - Called when timer hits 0
     * @param {String} displayElId - DOM element ID to display time
     */
    start(seconds, onTick, onTimeout, displayElId) {
      this.stop();
      this._timeLeft = seconds;
      this._onTick = onTick;
      this._onTimeout = onTimeout;

      if (displayElId) {
        var el = document.getElementById(displayElId);
        if (el) {
          el.textContent = this._formatTime(this._timeLeft);
          el.classList.remove('warning', 'danger');
        }
      }

      this._interval = setInterval(function() {
        this._timeLeft--;
        if (displayElId) {
          var displayEl = document.getElementById(displayElId);
          if (displayEl) {
            displayEl.textContent = this._formatTime(this._timeLeft);
            displayEl.classList.remove('warning', 'danger');
            if (this._timeLeft <= 10) displayEl.classList.add('danger');
            else if (this._timeLeft <= 20) displayEl.classList.add('warning');
          }
        }
        if (this._onTick) this._onTick(this._timeLeft);
        if (this._timeLeft <= 0) {
          this.stop();
          if (this._onTimeout) this._onTimeout();
        }
      }.bind(this), 1000);
    },

    stop() {
      if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
      }
    },

    getTimeLeft() {
      return this._timeLeft;
    },

    _formatTime(seconds) {
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    }
  };

  window.MediCard = MediCard;
})();
