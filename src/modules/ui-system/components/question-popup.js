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
    _currentTimeLimit: 30,  // remembered for extension calculation

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
      overlay.setAttribute('role', 'presentation');
      this._modalEl = overlay;

      var content = document.createElement('div');
      content.className = 'modal-content';
      content.setAttribute('role', 'dialog');
      content.setAttribute('aria-modal', 'true');
      content.setAttribute('aria-labelledby', 'question-popup-title');
      var isMobile = window.innerWidth <= 480;
      content.style.cssText = 'max-width:500px;width:' + (isMobile ? '100%' : '90%') + ';animation:modalEnter 250ms ease-out;';

      var timeLimit = MediCard.CardEffects.getAnswerTimeLimit(card);
      MediCard.QuestionPopup._currentTimeLimit = timeLimit;
      var label = answererLabel || '你';

      // Header with answerer indicator
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
      var qId = card.id || (card.subject + '_' + card.question);
      var isBookmarked = MediCard.WrongQuestionBook && MediCard.WrongQuestionBook.isBookmarked(qId);
      header.innerHTML =
        '<span style="font-size:12px;color:var(--accent-cyan);">' +
          (card.rarity === 'legendary' ? '⭐传说' : card.rarity === 'epic' ? '💎史诗' : card.rarity === 'rare' ? '🔷稀有' : '普通') +
          ' · ' + (card.subject || '') +
        '</span>' +
        '<span style="display:flex;align-items:center;gap:8px;">' +
          '<button class="btn btn-ghost btn-sm" id="btn-flag-header" style="font-size:13px;padding:2px 6px;color:var(--text-muted);" title="质疑此题答案有误">🚩</button>' +
          '<button class="btn btn-ghost btn-sm" id="btn-bookmark" style="font-size:14px;padding:2px 6px;' + (isBookmarked ? 'color:#fbbf24;' : '') + '" title="' + (isBookmarked ? '取消收藏' : '收藏此题') + '">' + (isBookmarked ? '⭐' : '☆') + '</button>' +
          '<span id="question-timer" style="font-family:var(--font-mono);font-weight:700;font-size:18px;">' + timeLimit + '</span>' +
        '</span>';

      // Answerer indicator
      var answererEl = document.createElement('div');
      answererEl.style.cssText = 'text-align:center;font-size:14px;color:var(--text-secondary);margin-bottom:8px;padding:4px 0;';
      var isSelf = label === '你' || label === '自己';
      answererEl.innerHTML = isSelf ?
        '🎯 <strong style="color:#10b981;">你</strong> 来答题' :
        '🎯 <strong style="color:#ef4444;">' + label + '</strong> 来答题';
      content.appendChild(answererEl);

      // Vote extension bar (collaborative time extension)
      var voteExtRow = document.createElement('div');
      voteExtRow.id = 'vote-extend-row';
      voteExtRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;padding:4px 8px;background:rgba(251,191,36,0.06);border-radius:6px;font-size:11px;';
      voteExtRow.innerHTML =
        '<span style="color:var(--text-muted);">⏳ 需要更多时间?</span>' +
        '<button class="btn btn-ghost btn-sm" id="btn-vote-extend" style="font-size:11px;padding:3px 10px;border-color:rgba(251,191,36,0.3);">🙋 建议加时</button>' +
        '<span id="vote-extend-status" style="color:var(--text-muted);min-width:60px;text-align:center;"></span>';
      content.appendChild(voteExtRow);

      // Init vote extension state for this question (qId defined above)
      if (MediCard.TimerCalculator && MediCard.TimerCalculator.VoteExtender) {
        MediCard.TimerCalculator.VoteExtender.reset(qId);
        _updateVoteExtendUI(qId);
      }

      var _extendVoted = false;
      var _extendAppliedCount = 0;

      // Question text
      var qText = document.createElement('div');
      qText.id = 'question-popup-title';
      qText.style.cssText = 'font-size:' + (isMobile ? '16px' : '18px') + ';font-weight:600;line-height:1.6;margin-bottom:16px;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;';
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
      var shuffled = MediCard.CardData.shuffle(parsedOptions.slice());

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
        btn.style.cssText = 'text-align:left;padding:' + (isMobile ? '12px 16px' : '10px 14px') + ';justify-content:flex-start;width:100%;min-height:' + (isMobile ? '48px' : 'auto') + ';font-size:' + (isMobile ? '15px' : '14px') + ';white-space:normal;word-break:break-word;overflow-wrap:break-word;height:auto;';
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

          // Bookmark button — also shown below
          var showBookmark = !answererLabel || answererLabel === '你' || answererLabel === '自己';
          if (showBookmark && card.id && MediCard.WrongQuestionBook) {
            var bmBtn = document.createElement('button');
            bmBtn.className = 'btn btn-ghost btn-sm';
            bmBtn.style.cssText = 'margin-top:8px;width:100%;font-size:11px;color:var(--text-muted);';
            var isBm = MediCard.WrongQuestionBook.isBookmarked(card.id);
            bmBtn.textContent = isBm ? '⭐ 已收藏' : '☆ 收藏此题';
            bmBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              var nowBm = MediCard.WrongQuestionBook.toggleBookmark(card.id);
              bmBtn.textContent = nowBm ? '⭐ 已收藏' : '☆ 收藏此题';
            });
            optionsEl.appendChild(bmBtn);
          }

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

            // Bookmark button for timeout case too
            var showBmT = !answererLabel || answererLabel === '你' || answererLabel === '自己';
            if (showBmT && card.id && MediCard.WrongQuestionBook) {
              var bmBtnT = document.createElement('button');
              bmBtnT.className = 'btn btn-ghost btn-sm';
              bmBtnT.style.cssText = 'margin-top:8px;width:100%;font-size:11px;color:var(--text-muted);';
              var isBmT2 = MediCard.WrongQuestionBook.isBookmarked(card.id);
              bmBtnT.textContent = isBmT2 ? '⭐ 已收藏' : '☆ 收藏此题';
              bmBtnT.addEventListener('click', function(e2) {
                e2.stopPropagation();
                var nowBmT2 = MediCard.WrongQuestionBook.toggleBookmark(card.id);
                bmBtnT.textContent = nowBmT2 ? '⭐ 已收藏' : '☆ 收藏此题';
              });
              optionsEl.appendChild(bmBtnT);
            }

            if (MediCard.Audio) MediCard.Audio.playWrong();
          }
        });
      };
      // Bookmark button — query from header (not yet appended to content)
      var btnBookmark = header.querySelector('#btn-bookmark');
      if (btnBookmark && MediCard.WrongQuestionBook) {
        btnBookmark.addEventListener('click', function(e) {
          e.stopPropagation();
          var nowBookmarked = MediCard.WrongQuestionBook.toggleBookmark(qId);
          btnBookmark.textContent = nowBookmarked ? '⭐' : '☆';
          btnBookmark.style.color = nowBookmarked ? '#fbbf24' : '';
          btnBookmark.title = nowBookmarked ? '取消收藏' : '收藏此题';
        });
      }

      // Flag question button — also in header next to bookmark/timer
      var btnFlagH = header.querySelector('#btn-flag-header');
      if (btnFlagH) {
        btnFlagH.addEventListener('click', function(e) {
          e.stopPropagation();
          _handleFlagQuestion(card);
          btnFlagH.textContent = '✅';
          btnFlagH.disabled = true;
          btnFlagH.style.opacity = '0.6';
          btnFlagH.title = '已标记质疑';
        });
      }

      var btnVoteExt = content.querySelector('#btn-vote-extend');
      if (btnVoteExt) {
        btnVoteExt.addEventListener('click', function() {
          if (_extendVoted) return;
          var VE = MediCard.TimerCalculator && MediCard.TimerCalculator.VoteExtender;
          if (!VE) return;
          var myId = _getMyPlayerId();
          var result = VE.vote(qId, myId);
          if (!result || result.alreadyVoted) return;
          _extendVoted = true;
          btnVoteExt.disabled = true;
          btnVoteExt.style.opacity = '0.5';

          if (result.reached) {
            // Threshold met — apply extension
            _extendAppliedCount++;
            MediCard.TimerComponent.addTime(_calcExtensionSeconds());
            _updateVoteExtendUI(qId);
            _showExtensionToast(_extendAppliedCount, result.bonus);
          } else {
            _updateVoteExtendUI(qId);
          }

          // In multiplayer: send vote to host
          _sendTimeExtendVote(qId, result);
        });
      }

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

  // Handle flagging a question from battle
  function _handleFlagQuestion(card) {
    var MC = window.MedicalKillCommunity;
    if (!MC) return;

    var qId = card.id;
    var entry = MC.toggleFlag(qId, '答案可能有误');
    var score = entry ? (entry.weightedScore || 0) : 0;

    // Show feedback toast
    _showFlagToast(score);

    // Auto-escalate if threshold met
    if (score >= 3) {
      var originalAnswer = (card.correctAnswers || []).join(', ');
      var proposal = MC.autoEscalateFlaggedQuestion(
        qId,
        card.question || '',
        originalAnswer,
        card.explanation || ''
      );
      if (proposal) {
        setTimeout(function() {
          _showFlagToast(-1); // -1 = escalated notification
        }, 1500);
      }
    }
  }

  function _showFlagToast(flagScore) {
    var toast = document.createElement('div');
    var msg;
    if (flagScore < 0) {
      msg = '📢 此题质疑已达3次，已进入社区纠错提案区';
    } else if (flagScore >= 3) {
      msg = '🚩 质疑已记录（累计' + flagScore.toFixed(1) + '票）· 已进入纠错提案';
    } else {
      msg = '🚩 质疑已记录（累计' + flagScore.toFixed(1) + '票）· 还需' + (3 - flagScore).toFixed(0) + '票进入纠错';
    }
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.95);border:1px solid rgba(249,115,22,0.4);border-radius:10px;padding:10px 18px;z-index:50000;font-size:12px;color:#fbbf24;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 2500);
  }

  /* ================================================================
   * Vote Extension Helpers
   * ================================================================ */

  function _getMyPlayerId() {
    try {
      var raw = localStorage.getItem('medicard_current_user_id');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return 'player_' + Math.random().toString(36).slice(2, 8);
  }

  /** Calculate how many additional seconds one extension grants (~10% of current time limit) */
  function _calcExtensionSeconds() {
    var sec = Math.round(MediCard.QuestionPopup._currentTimeLimit * 0.1);
    return sec < 3 ? 3 : sec;
  }

  /** Update the vote extension status row */
  function _updateVoteExtendUI(qId) {
    var VE = MediCard.TimerCalculator && MediCard.TimerCalculator.VoteExtender;
    var state = VE ? VE.getState(qId) : null;
    var statusEl = document.getElementById('vote-extend-status');
    var btnEl = document.getElementById('btn-vote-extend');
    if (!statusEl) return;

    if (!state) {
      statusEl.textContent = '';
      return;
    }

    if (state.extensionsGranted > 0) {
      statusEl.innerHTML = '<span style="color:#10b981;">+' + state.bonus.toFixed(1) + 'x 已加时</span>';
    } else if (state.voteCount > 0) {
      statusEl.textContent = state.voteCount + '/' + state.threshold + ' 票';
      statusEl.style.color = 'var(--accent-yellow)';
    } else {
      statusEl.textContent = '0/' + state.threshold + ' 票';
    }

    // Highlight row when close to threshold
    var row = document.getElementById('vote-extend-row');
    if (row && state.voteCount > 0 && state.voteCount < state.threshold) {
      var remaining = state.threshold - state.voteCount;
      row.style.background = remaining <= 1
        ? 'rgba(251,191,36,0.15)'
        : 'rgba(251,191,36,0.06)';
    }
    if (row && state.extensionsGranted > 0) {
      row.style.background = 'rgba(16,185,129,0.1)';
    }
  }

  /** Flash a toast when an extension is granted */
  function _showExtensionToast(count, bonus) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(16,185,129,0.95);border-radius:10px;padding:10px 20px;z-index:50001;font-size:13px;color:#fff;white-space:nowrap;box-shadow:0 4px 20px rgba(16,185,129,0.4);animation:modalEnter 200ms ease-out;';
    toast.textContent = '⏳ 已加时！（第' + count + '次，系数+' + bonus.toFixed(1) + '）';
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 2000);
  }

  /** Send vote to host in multiplayer (no-op in single player) */
  function _sendTimeExtendVote(qId, result) {
    if (!MediCard.GameState || MediCard.GameState.mode !== 'multiplayer') return;
    var battle = MediCard.ScreenBattle;
    if (!battle) return;

    var payload = {
      questionId: qId,
      playerId: _getMyPlayerId(),
      result: result
    };

    if (battle._isHost) {
      // Host processes directly (already handled locally by the button click)
      // Just broadcast the vote count to clients for UI sync
      if (battle._sendSync) {
        battle._sendSync({ type: 'time_extend_vote_sync', questionId: qId, state: MediCard.TimerCalculator.VoteExtender.getState(qId) });
      }
    } else {
      // Client sends to host via dedicated message type
      if (MediCard.NetworkClient && MediCard.NetworkClient.send && MediCard.SyncProtocol) {
        MediCard.NetworkClient.send(MediCard.SyncProtocol.pack(
          MediCard.SyncProtocol.MessageType.TIME_EXTEND_VOTE,
          payload
        ));
      }
    }
  }

  /**
   * Public API: apply an extension from an external source (multiplayer sync).
   * Called by screen-battle when host broadcasts TIME_EXTEND_GRANTED.
   */
  MediCard.QuestionPopup.applyTimeExtension = function(questionId, bonus) {
    if (!MediCard.TimerCalculator || !MediCard.TimerCalculator.VoteExtender) return;
    var VE = MediCard.TimerCalculator.VoteExtender;
    var state = VE.getState(questionId);
    if (!state) return;

    // Only apply if we haven't reached this bonus level yet
    if (state.bonus < bonus) {
      // Each 0.1 bonus ≈ 10% of original time limit
      var seconds = Math.round(MediCard.QuestionPopup._currentTimeLimit * 0.1);
      if (seconds < 3) seconds = 3;
      MediCard.TimerComponent.addTime(seconds);
      VE.setState(questionId, {
        voters: state.voters,
        voteCount: state.voteCount,
        extensionsGranted: Math.round(bonus / 0.1),
        threshold: state.threshold,
        bonus: bonus
      });
      _updateVoteExtendUI(questionId);
      _showExtensionToast(Math.round(bonus / 0.1), bonus);
    }
  };

  window.MediCard = MediCard;
})();
