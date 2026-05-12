/**
 * MediCard Duel — Audio Generator
 * Web Audio API sound effects, zero external files
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.Audio = {
    _ctx: null,

    init() {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        // Web Audio not available
      }
    },

    _ensureContext() {
      if (!this._ctx) this.init();
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume();
      }
      return this._ctx;
    },

    _playTone(freq, duration, type, volume, ramp) {
      var ctx = this._ensureContext();
      if (!ctx) return;

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume || 0.1;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.3));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (duration || 0.3));
    },

    _playChord(freqs, duration, type, volume) {
      var ctx = this._ensureContext();
      if (!ctx) return;
      freqs.forEach(function(f, i) {
        setTimeout(function() {
          this._playTone(f, duration, type, volume);
        }.bind(this), i * 80);
      }.bind(this));
    },

    playCardDraw() {
      this._playTone(800, 0.1, 'sine', 0.05);
    },

    playCardPlay(rarity) {
      var ctx = this._ensureContext();
      if (!ctx) return;
      switch (rarity) {
        case 'legendary':
          this._playChord([523, 659, 784, 1047], 0.6, 'triangle', 0.15);
          break;
        case 'epic':
          this._playChord([440, 554, 659], 0.4, 'triangle', 0.12);
          break;
        case 'rare':
          this._playChord([440, 554], 0.3, 'sine', 0.1);
          break;
        default:
          this._playTone(440, 0.2, 'sine', 0.08);
      }
    },

    playDamage(amount, isCrit) {
      if (isCrit) {
        this._playTone(80, 0.3, 'sawtooth', 0.2);
        this._playTone(60, 0.4, 'square', 0.15);
      } else {
        this._playTone(100, 0.15, 'triangle', 0.1);
      }
    },

    playCorrect() {
      this._playChord([523, 659, 784], 0.4, 'sine', 0.08);
    },

    playWrong() {
      this._playChord([400, 350], 0.5, 'sawtooth', 0.06);
    },

    playVictory() {
      this._playChord([523, 659, 784, 1047, 1319], 1.0, 'triangle', 0.12);
    },

    playDefeat() {
      this._playChord([440, 370, 330, 262], 0.8, 'sine', 0.08);
    },

    playButtonClick() {
      this._playTone(600, 0.05, 'sine', 0.03);
    }
  };

  window.MediCard = MediCard;
})();
