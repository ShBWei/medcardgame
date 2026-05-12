/**
 * MediCard 医杀 — Question Popup Component (V5.2)
 * Shows question, options, timer, feedback. No KP system.
 * Supports showing WHO is answering (self vs opponent).
 */
(function() {
  var MediCard = window.MediCard || {};

  MediCard.QuestionPopup = {
    _resolveCallback: null,
    _modalEl: null,

    /**
     * Show a question popup
     * @param {Object} card - The card being played (contains question data)
     * @param {Function} onAnswer - Called with {correct, answer} when answered
     * @param {String} answererLabel - Who is answering: "你" or "对手" or "AI"
     */
    show(card, onAnswer, answererLabel) {
      this._resolveCallback = onAnswer;
      this._removeExisting();

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      this._modalEl = overlay;

      var content = document.createElement('div');
      content.className = 'modal-content';
      var isMobile = window.innerWidth <= 480;
      content.style.cssText = 'max-width:500px;width:' + (isMobile ? '100%' : '90%') + ';animation:modalEnter 250ms ease-out;';

      var timeLimit = MediCard.CardEffects.getAnswerTimeLimit(card.rarity);
      var label = answererLabel || '你';

      // Header with answerer indicator
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
      header.innerHTML =
        '<span style="font-size:12px;color:var(--accent-cyan);">' +
          (card.rarity === 'legendary' ? '⭐传说' : card.rarity === 'epic' ? '💎史诗' : card.rarity === 'rare' ? '🔷稀有' : '普通') +
          ' · ' + (card.subject || '') +
        '</span>' +
        '<span id="question-timer" style="font-family:var(--font-mono);font-weight:700;font-size:18px;">' + timeLimit + '</span>';

      // Answerer indicator
      var answererEl = document.createElement('div');
      answererEl.style.cssText = 'text-align:center;font-size:14px;color:var(--text-secondary);margin-bottom:8px;padding:4px 0;';
      var isSelf = label === '你' || label === '自己';
      answererEl.innerHTML = isSelf ?
        '🎯 <strong style="color:#10b981;">你</strong> 来答题' :
        '🎯 <strong style="color:#ef4444;">' + label + '</strong> 来答题';
      content.appendChild(answererEl);

      // Question text
      var qText = document.createElement('div');
      qText.style.cssText = 'font-size:' + (isMobile ? '15px' : '16px') + ';font-weight:600;line-height:1.6;margin-bottom:16px;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;';
      qText.textContent = card.question;

      // Card type indicator
      var typeInfo = MediCard.CardData ? MediCard.CardData.getTypeInfo(card.cardType) : null;
      var typeEl = document.createElement('div');
      typeEl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:8px;';
      typeEl.textContent = (typeInfo ? typeInfo.icon + ' ' + typeInfo.name : '') + ' · ' + (card.cardName || '');
      content.appendChild(typeEl);

      // Options — shuffle to randomize answer order
      var optionsEl = document.createElement('div');
      optionsEl.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

      var rawOptions = card.options || [];
      var originalCorrect = card.correctAnswers || [];
      // Parse options into {letter, text, isCorrect} objects
      var parsedOptions = [];
      for (var oi = 0; oi < rawOptions.length; oi++) {
        var optStr = rawOptions[oi];
        var letter = optStr.charAt(0);
        var text = optStr.substring(2); // skip "A. " prefix
        parsedOptions.push({ letter: letter, text: text, isCorrect: originalCorrect.indexOf(letter) >= 0 });
      }
      // Shuffle option order so correct answer isn't always first
      var shuffled = _shuffleArray(parsedOptions.slice());

      // Reassign sequential letters (A,B,C,D...) in shuffled order
      // so the correct answer letter changes each time
      var newLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var newCorrectAnswers = [];
      var options = shuffled.map(function(opt, idx) {
        var newLetter = newLetters.charAt(idx);
        var display = newLetter + '. ' + opt.text;
        if (opt.isCorrect) newCorrectAnswers.push(newLetter);
        return { letter: newLetter, text: opt.text, display: display };
      });
      var answered = false;

      options.forEach(function(opt, idx) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'text-align:left;padding:' + (isMobile ? '12px 16px' : '10px 14px') + ';justify-content:flex-start;width:100%;min-height:' + (isMobile ? '48px' : 'auto') + ';font-size:' + (isMobile ? '14px' : '13px') + ';';
        btn.textContent = opt.display;
        btn.setAttribute('data-answer-letter', opt.letter);

        btn.addEventListener('click', function() {
          if (answered) return;
          answered = true;
          MediCard.TimerComponent.stop();

          var choice = opt.letter;
          var isCorrect = newCorrectAnswers.indexOf(choice) >= 0;

          // Visual feedback
          if (isCorrect) {
            btn.classList.remove('btn-secondary');
            btn.style.background = 'rgba(16,185,129,0.3)';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#6ee7b7';
          } else {
            btn.classList.remove('btn-secondary');
            btn.style.background = 'rgba(239,68,68,0.3)';
            btn.style.borderColor = '#ef4444';
            btn.style.color = '#fca5a5';
            // Highlight correct answer
            optionsEl.querySelectorAll('button').forEach(function(b) {
              var dataLetter = b.getAttribute('data-answer-letter');
              if (dataLetter && newCorrectAnswers.indexOf(dataLetter) >= 0) {
                b.style.background = 'rgba(16,185,129,0.2)';
                b.style.borderColor = '#10b981';
              }
            });
          }

          // Explanation
          var exp = document.createElement('div');
          exp.style.cssText = 'margin-top:12px;padding:10px;background:rgba(0,0,0,0.2);border-radius:6px;font-size:12px;color:var(--text-secondary);line-height:1.5;';
          exp.innerHTML = '<strong>' + (isCorrect ? '✅ 回答正确！' : '❌ 回答错误') + '</strong><br>' +
            (card.explanation || '') +
            (card.textbookReference ? '<br><span style="color:var(--text-muted);font-size:10px;">📖 ' + card.textbookReference + '</span>' : '');
          optionsEl.appendChild(exp);

          // Continue button
          var contBtn = document.createElement('button');
          contBtn.className = 'btn btn-primary';
          contBtn.style.cssText = 'margin-top:12px;width:100%;';
          contBtn.textContent = '继续';
          contBtn.addEventListener('click', function() {
            overlay.remove();
            if (onAnswer) onAnswer({ correct: isCorrect, choice: choice, card: card });
          });
          optionsEl.appendChild(contBtn);

          // Play feedback sound
          if (MediCard.Audio) {
            isCorrect ? MediCard.Audio.playCorrect() : MediCard.Audio.playWrong();
          }
        });

        optionsEl.appendChild(btn);
      });

      // Timer
      var timerStarted = false;
      var startTimer = function() {
        if (timerStarted) return;
        timerStarted = true;
        MediCard.TimerComponent.start(timeLimit, function(remaining) {
          var timerEl = document.getElementById('question-timer');
          if (timerEl) {
            timerEl.textContent = remaining;
            timerEl.style.color = remaining <= 5 ? 'var(--accent-red)' : remaining <= 10 ? 'var(--accent-yellow)' : '';
          }
        }, function() {
          if (!answered) {
            answered = true;
            var exp = document.createElement('div');
            exp.style.cssText = 'margin-top:12px;padding:10px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;color:var(--accent-red);';
            exp.innerHTML = '⏰ 时间到！正确答案：<strong>' + card.correctAnswers.join('、') + '</strong><br>' + (card.explanation || '');
            optionsEl.appendChild(exp);

            var contBtn = document.createElement('button');
            contBtn.className = 'btn btn-primary';
            contBtn.style.cssText = 'margin-top:12px;width:100%;';
            contBtn.textContent = '继续';
            contBtn.addEventListener('click', function() {
              overlay.remove();
              if (onAnswer) onAnswer({ correct: false, choice: null, card: card, timeout: true });
            });
            optionsEl.appendChild(contBtn);

            if (MediCard.Audio) MediCard.Audio.playWrong();
          }
        });
      };
      setTimeout(startTimer, 200);

      content.appendChild(header);
      content.appendChild(qText);
      content.appendChild(optionsEl);
      overlay.appendChild(content);
      document.body.appendChild(overlay);
    },

    _removeExisting() {
      if (this._modalEl && this._modalEl.parentNode) {
        this._modalEl.remove();
      }
      MediCard.TimerComponent.stop();
      document.querySelectorAll('.modal-overlay').forEach(function(el) { el.remove(); });
    }
  };

  // Fisher-Yates shuffle for option arrays
  function _shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  window.MediCard = MediCard;
})();
