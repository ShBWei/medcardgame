/**
 * MediCard Community — Questions & Review (V1.0)
 * Question submission, peer review, objection marking, proposal system
 * Injects "题库共建" button into title screen — zero modification
 */
(function() {
  var MC = window.MedicalKillCommunity || {};

  MC.Questions = {
    _overlay: null,
    _currentTab: 'submit',

    injectButton: function() {
      var self = this;
      var _checkInterval = setInterval(function() {
        var menu = document.querySelector('.title-menu');
        if (menu && !document.getElementById('btn-community-questions')) {
          var btn = document.createElement('button');
          btn.id = 'btn-community-questions';
          btn.className = 'btn btn-secondary btn-lg';
          btn.textContent = '📝 题库共建';
          btn.addEventListener('click', function() { self.show(); });
          menu.appendChild(btn);
        }
      }, 500);
    },

    show: function() {
      this._removeOverlay();
      var self = this;

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay mkc-overlay';
      overlay.style.zIndex = '4000';
      this._overlay = overlay;

      var content = document.createElement('div');
      content.className = 'mkc-modal';
      content.style.cssText = 'max-width:560px;width:95%;max-height:88vh;overflow-y:auto;animation:modalEnter 250ms ease-out;';

      content.innerHTML = this._renderHTML();
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) self.close(); });
      setTimeout(function() { self._attachEvents(content); }, 50);
    },

    close: function() {
      this._removeOverlay();
    },

    _removeOverlay: function() {
      if (this._overlay && this._overlay.parentNode) this._overlay.remove();
      this._overlay = null;
    },

    _renderHTML: function() {
      var tab = this._currentTab || 'submit';
      return '' +
        '<div class="mkc-lb-header">' +
          '<h3>📝 题库共建</h3>' +
          '<button class="btn btn-ghost btn-sm mkc-close-btn" id="mkc-q-close">✕</button>' +
        '</div>' +
        '<div class="mkc-tabs">' +
          '<button class="mkc-tab ' + (tab === 'submit' ? 'active' : '') + '" data-tab="submit">📤 提交题目</button>' +
          '<button class="mkc-tab ' + (tab === 'review' ? 'active' : '') + '" data-tab="review">🔍 审核大厅</button>' +
          '<button class="mkc-tab ' + (tab === 'my' ? 'active' : '') + '" data-tab="my">📋 我的题目</button>' +
          '<button class="mkc-tab ' + (tab === 'proposals' ? 'active' : '') + '" data-tab="proposals">📢 纠错提案</button>' +
        '</div>' +
        '<div class="mkc-q-content" id="mkc-q-content">' +
          (tab === 'submit' ? this._renderSubmitForm() :
           tab === 'review' ? this._renderReviewPanel() :
           tab === 'my' ? this._renderMyQuestions() :
           this._renderProposalsPanel()) +
        '</div>';
    },

    /* ============ Submit Form ============ */
    _renderSubmitForm: function() {
      var limits = MC.getDailyLimits();
      var remaining = Math.max(0, 5 - limits.submits);
      var subjects = [
        '细胞生物学', '生物化学', '生理学', '病理学',
        '组织胚胎学', '系统解剖学', '免疫学', '微生物学', '综合'
      ];

      var html = '<div class="mkc-form-section">' +
        '<div class="mkc-daily-info">今日剩余提交: <b>' + remaining + '</b>/5</div>';

      if (remaining <= 0) {
        html += '<div class="mkc-empty">今日提交次数已用完，明天再来吧！</div>';
        return html + '</div>';
      }

      html += '<div class="mkc-field">' +
        '<label>题目科目</label>' +
        '<select id="mkc-q-subject" class="mkc-select">';
      subjects.forEach(function(s) {
        html += '<option value="' + s + '">' + s + '</option>';
      });
      html += '</select></div>' +

        '<div class="mkc-field">' +
        '<label>题目内容</label>' +
        '<textarea id="mkc-q-text" class="mkc-textarea" rows="3" placeholder="请输入医学题目内容..."></textarea>' +
        '</div>' +

        '<div class="mkc-field">' +
        '<label>选项设置（至少2个选项，正确选项用字母标注）</label>' +
        '<div id="mkc-q-options">' +
          '<div class="mkc-opt-row"><span class="mkc-opt-letter">A</span><input type="text" class="mkc-opt-input" placeholder="选项A" maxlength="200"><label class="mkc-opt-correct-label"><input type="checkbox" class="mkc-opt-correct" value="A"> 正确</label></div>' +
          '<div class="mkc-opt-row"><span class="mkc-opt-letter">B</span><input type="text" class="mkc-opt-input" placeholder="选项B" maxlength="200"><label class="mkc-opt-correct-label"><input type="checkbox" class="mkc-opt-correct" value="B"> 正确</label></div>' +
          '<div class="mkc-opt-row"><span class="mkc-opt-letter">C</span><input type="text" class="mkc-opt-input" placeholder="选项C（可选）" maxlength="200"><label class="mkc-opt-correct-label"><input type="checkbox" class="mkc-opt-correct" value="C"> 正确</label></div>' +
          '<div class="mkc-opt-row"><span class="mkc-opt-letter">D</span><input type="text" class="mkc-opt-input" placeholder="选项D（可选）" maxlength="200"><label class="mkc-opt-correct-label"><input type="checkbox" class="mkc-opt-correct" value="D"> 正确</label></div>' +
        '</div></div>' +

        '<div class="mkc-field">' +
        '<label>答案解析（帮助玩家理解）</label>' +
        '<textarea id="mkc-q-explanation" class="mkc-textarea" rows="2" placeholder="简要解释正确答案..."></textarea>' +
        '</div>' +

        '<div class="mkc-field">' +
        '<label>难度等级</label>' +
        '<select id="mkc-q-difficulty" class="mkc-select">' +
          '<option value="1">简单</option>' +
          '<option value="2" selected>中等</option>' +
          '<option value="3">困难</option>' +
        '</select></div>' +

        '<button id="mkc-q-submit-btn" class="btn btn-primary" style="width:100%;margin-top:8px;">提交审核</button>' +
        '<div id="mkc-q-submit-feedback" style="margin-top:8px;"></div>' +
      '</div>';

      return html;
    },

    /* ============ Review Panel ============ */
    _renderReviewPanel: function() {
      var limits = MC.getDailyLimits();
      var remaining = Math.max(0, 20 - limits.reviews);
      var pending = MC.getPendingQuestions();
      var myId = _currentUserId();

      // Filter out self-submitted questions (anti-self-review)
      var reviewable = pending.filter(function(q) { return q.submitterId !== myId; });

      if (reviewable.length === 0) {
        return '<div class="mkc-daily-info">今日剩余审核: <b>' + remaining + '</b>/20</div>' +
          '<div class="mkc-empty">暂无待审核的题目<br><small>去提交题目或等待其他玩家贡献吧！</small></div>';
      }

      var q = reviewable[Math.floor(Math.random() * reviewable.length)];
      var rep = MC.getReputation();
      var html = '<div class="mkc-daily-info">今日剩余审核: <b>' + remaining + '</b>/20 · 待审: <b>' + reviewable.length + '</b>题 · 你的权重: <b>' + rep.weight.toFixed(1) + 'x</b></div>';

      html += '<div class="mkc-review-card" data-qid="' + q.id + '">' +
        '<div class="mkc-review-meta">' +
          '<span class="mkc-badge-subject">' + _esc(q.subject || '综合') + '</span>' +
          '<span>难度: ' + ('★'.repeat(q.difficulty || 2)) + '</span>' +
          '<span>出题: ' + _esc(q.submitterName || '匿名') + '</span>' +
        '</div>' +
        '<div class="mkc-review-question">' + _esc(q.question || '') + '</div>' +
        '<div class="mkc-review-options">';

      var rawOpts = q.options || [];
      for (var i = 0; i < rawOpts.length; i++) {
        html += '<div class="mkc-review-opt">' + _esc(rawOpts[i]) + '</div>';
      }

      html += '</div>' +
        '<div style="font-size:12px;color:var(--accent-cyan);margin-top:8px;">答案解析: ' + _esc(q.explanation || '无') + '</div>';

      // Objection info if flagged
      var flagScore = MC.getFlagScore(q.id);
      if (flagScore > 0) {
        html += '<div style="font-size:11px;color:#f97316;margin-top:4px;">⚠ 此题目已被标记异议（权重: ' + flagScore.toFixed(1) + '）</div>';
      }

      html += '</div>' +
        '<div class="mkc-review-actions">' +
          '<button class="btn btn-primary mkc-review-approve" data-qid="' + q.id + '" style="flex:1;">✅ 通过</button>' +
          '<button class="btn btn-ghost mkc-review-reject" data-qid="' + q.id + '" style="flex:1;border-color:rgba(239,68,68,0.4);">❌ 驳回</button>' +
          '<button class="btn btn-ghost btn-sm mkc-review-skip" style="flex:0;">跳过</button>' +
        '</div>' +
        '<div id="mkc-review-feedback" style="margin-top:8px;"></div>';

      return html;
    },

    /* ============ My Questions ============ */
    _renderMyQuestions: function() {
      var all = MC.getSubmittedQuestions();
      var myId = _currentUserId();
      var mine = all.filter(function(q) { return q.submitterId === myId; });

      if (mine.length === 0) {
        return '<div class="mkc-empty">你还没有提交过题目<br><small>切换到"提交题目"标签页开始贡献吧！</small></div>';
      }

      var statusLabels = { pending: '⏳ 待审核', approved: '✅ 已通过', rejected: '❌ 已驳回' };
      var html = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">共 ' + mine.length + ' 题</div>';

      mine.reverse().forEach(function(q) {
        var statusColor = q.status === 'approved' ? '#6ee7b7' : q.status === 'rejected' ? '#fca5a5' : '#fbbf24';
        html += '<div class="mkc-my-q-item" style="border-left:3px solid ' + statusColor + ';">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span class="mkc-badge-subject">' + _esc(q.subject || '综合') + '</span>' +
            '<span style="color:' + statusColor + ';font-size:12px;">' + (statusLabels[q.status] || q.status) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;margin:4px 0;">' + _esc(q.question || '') + '</div>';

        if (q.status === 'rejected' && q.rejectReason) {
          html += '<div style="font-size:11px;color:#fca5a5;">驳回原因: ' + _esc(q.rejectReason) + '</div>';
        }

        // Flag info
        var flagScore = MC.getFlagScore(q.id);
        if (flagScore > 0) {
          html += '<div style="font-size:11px;color:#f97316;">异议权重: ' + flagScore.toFixed(1) + '</div>';
        }

        html += '</div>';
      });

      return html;
    },

    /* ============ Proposals Panel ============ */
    _renderProposalsPanel: function() {
      var proposals = MC.getProposals();
      var active = proposals.filter(function(p) { return p.status === 'active'; });

      var html = '<div class="mkc-daily-info">纠错提案 · 7天有效期 · 通过需多数支持</div>';

      // Also show flagged game questions (from battles) that meet threshold
      var flags = MC.getFlags();
      var flaggedQIds = [];
      for (var fid in flags) {
        if (flags[fid].weightedScore >= 3) {
          // Check if there's already an active proposal for this question
          var hasActiveProp = active.some(function(p) { return p.questionId === fid; });
          if (!hasActiveProp) flaggedQIds.push({ id: fid, entry: flags[fid] });
        }
      }

      if (active.length === 0 && flaggedQIds.length === 0) {
        html += '<div class="mkc-empty">暂无活跃的纠错提案<br><small>在战斗中点击"质疑此题"标记有问题的题目，或去"我的题目"发起纠错吧！</small></div>';
        return html;
      }

      // Flagged game questions section (not yet escalated)
      if (flaggedQIds.length > 0) {
        html += '<div style="font-size:12px;color:#f97316;margin-bottom:8px;padding:8px;background:rgba(249,115,22,0.08);border-radius:8px;">' +
          '⚠️ <b>' + flaggedQIds.length + '</b> 道游戏题目被多名玩家质疑，等待处理</div>';
        flaggedQIds.forEach(function(fq) {
          var fentry = fq.entry;
          var reasons = (fentry.reasons || []).map(function(r) { return r.reason; }).join('、') || '答案可能有误';
          html += '<div class="mkc-proposal-card" style="border-left:3px solid #f97316;">' +
            '<div style="font-size:11px;color:var(--text-muted);">题目ID: ' + _esc(fq.id) + '</div>' +
            '<div style="font-size:11px;color:#f97316;margin-top:2px;">质疑: ' + _esc(reasons) + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);">异议权重: ' + (fentry.weightedScore || 0).toFixed(1) + '</div>' +
            '<button class="btn btn-sm btn-primary mkc-flag-escalate" data-qid="' + fq.id + '" style="margin-top:6px;">📢 发起纠错提案</button>' +
          '</div>';
        });
      }

      active.forEach(function(p) {
        var supportCount = 0, opposeCount = 0;
        for (var uid in p.votes) {
          if (p.votes[uid].vote === 'support') supportCount += p.votes[uid].weight;
          else opposeCount += p.votes[uid].weight;
        }

        var q = MC.getQuestionById(p.questionId);
        var qText = p.questionText || (q ? q.question : '') || '(题目信息已删除)';

        html += '<div class="mkc-proposal-card">' +
          '<div style="font-size:11px;color:var(--text-muted);">原题: ' + _esc(qText) + '</div>' +
          '<div style="font-size:12px;margin:4px 0;">修正答案: <b style="color:#fbbf24;">' + _esc(p.correctedAnswer) + '</b></div>' +
          '<div style="font-size:11px;color:var(--text-muted);">说明: ' + _esc(p.explanation || '无') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">提案人: ' + _esc(p.authorName || '匿名') + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:6px;">' +
            '<span style="color:#6ee7b7;">支持 ' + supportCount.toFixed(1) + '</span>' +
            '<span style="color:#fca5a5;">反对 ' + opposeCount.toFixed(1) + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-top:6px;">' +
            '<button class="btn btn-sm btn-primary mkc-prop-support" data-propid="' + p.id + '">👍 支持</button>' +
            '<button class="btn btn-sm btn-ghost mkc-prop-oppose" data-propid="' + p.id + '">👎 反对</button>' +
          '</div>' +
        '</div>';
      });

      return html;
    },

    /* ============ Events ============ */
    _attachEvents: function(content) {
      var self = this;

      // Tab switching
      content.querySelectorAll('.mkc-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
          self._currentTab = this.getAttribute('data-tab');
          self._refresh(content);
        });
      });

      // Close
      var closeBtn = content.querySelector('#mkc-q-close');
      if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

      // Submit question
      var submitBtn = content.querySelector('#mkc-q-submit-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', function() { self._handleSubmit(content); });
      }

      // Review approve
      content.querySelectorAll('.mkc-review-approve').forEach(function(btn) {
        btn.addEventListener('click', function() { self._handleReview(this.getAttribute('data-qid'), 'approve', content); });
      });

      // Review reject
      content.querySelectorAll('.mkc-review-reject').forEach(function(btn) {
        btn.addEventListener('click', function() { self._handleReview(this.getAttribute('data-qid'), 'reject', content); });
      });

      // Review skip
      content.querySelectorAll('.mkc-review-skip').forEach(function(btn) {
        btn.addEventListener('click', function() { self._refresh(content); });
      });

      // Proposal vote
      content.querySelectorAll('.mkc-prop-support').forEach(function(btn) {
        btn.addEventListener('click', function() { self._handleProposalVote(this.getAttribute('data-propid'), 'support', content); });
      });
      content.querySelectorAll('.mkc-prop-oppose').forEach(function(btn) {
        btn.addEventListener('click', function() { self._handleProposalVote(this.getAttribute('data-propid'), 'oppose', content); });
      });

      // Escalate flagged game question to proposal
      content.querySelectorAll('.mkc-flag-escalate').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var qid = this.getAttribute('data-qid');
          var flags = MC.getFlags();
          var entry = flags[qid];
          var reasons = entry && entry.reasons ? entry.reasons.map(function(r){return r.reason;}).join('、') : '答案可能有误';
          MC.autoEscalateFlaggedQuestion(qid, '', '', '玩家质疑: ' + reasons);
          _showToast('📢 已发起纠错', '该题目已进入提案投票流程', 2000);
          self._refresh(content);
        });
      });
    },

    _handleSubmit: function(content) {
      var subject = document.getElementById('mkc-q-subject');
      var text = document.getElementById('mkc-q-text');
      var explanation = document.getElementById('mkc-q-explanation');
      var difficulty = document.getElementById('mkc-q-difficulty');

      if (!text || !text.value.trim()) {
        _showFeedback(content, 'mkc-q-submit-feedback', 'error', '请输入题目内容');
        return;
      }

      // Gather options
      var optInputs = content.querySelectorAll('.mkc-opt-input');
      var optChecks = content.querySelectorAll('.mkc-opt-correct');
      var options = [];
      var correctAnswers = [];

      for (var i = 0; i < optInputs.length; i++) {
        var val = optInputs[i].value.trim();
        var letter = optChecks[i].value;
        if (val) {
          options.push(letter + '. ' + val);
          if (optChecks[i].checked) correctAnswers.push(letter);
        }
      }

      if (options.length < 2) {
        _showFeedback(content, 'mkc-q-submit-feedback', 'error', '请至少填写2个选项');
        return;
      }
      if (correctAnswers.length === 0) {
        _showFeedback(content, 'mkc-q-submit-feedback', 'error', '请至少勾选一个正确答案');
        return;
      }

      if (!MC.canSubmitToday()) {
        _showFeedback(content, 'mkc-q-submit-feedback', 'error', '今日提交次数已用完（每日5次）');
        return;
      }

      var q = MC.addSubmittedQuestion({
        subject: subject ? subject.value : '综合',
        question: text.value.trim(),
        options: options,
        correctAnswers: correctAnswers,
        explanation: explanation ? explanation.value.trim() : '',
        difficulty: difficulty ? parseInt(difficulty.value) : 2
      });

      MC.recordSubmit();
      _showFeedback(content, 'mkc-q-submit-feedback', 'success', '题目已提交，等待社区审核！');

      // Clear form
      text.value = '';
      if (explanation) explanation.value = '';
      optInputs.forEach(function(inp) { inp.value = ''; });
      optChecks.forEach(function(chk) { chk.checked = false; });

      // Update daily counter
      var dailyInfo = content.querySelector('.mkc-daily-info');
      if (dailyInfo) {
        var limits = MC.getDailyLimits();
        dailyInfo.innerHTML = '今日剩余提交: <b>' + Math.max(0, 5 - limits.submits) + '</b>/5';
      }
    },

    _handleReview: function(qId, vote, content) {
      if (!MC.canReviewToday()) {
        _showFeedback(content, 'mkc-review-feedback', 'error', '今日审核次数已用完（每日20次）');
        return;
      }

      var q = MC.getQuestionById(qId);
      if (!q || q.status !== 'pending') {
        _showFeedback(content, 'mkc-review-feedback', 'error', '该题目已被处理');
        setTimeout(function() { self._refresh(content); }, 800);
        return;
      }

      // Anti-self-review check
      if (q.submitterId === _currentUserId()) {
        _showFeedback(content, 'mkc-review-feedback', 'error', '不能审核自己提交的题目');
        return;
      }

      MC.recordReview();

      if (vote === 'approve') {
        MC.updateQuestionStatus(qId, 'approved');
        MC.clearRejectStreak();
        // Reputation reward for submitter
        var submitterRep = MC.getReputation();
        MC.updateReputation(2, 'question_approved');
        _showFeedback(content, 'mkc-review-feedback', 'success', '已通过！出题者信誉+2');
      } else {
        var triggered = MC.recordReject();
        q.rejectReason = '社区审核驳回';
        MC.updateQuestionStatus(qId, 'rejected');

        var msg = '已驳回';
        if (triggered) msg += ' · 连续驳回已达3次，注意审核标准';

        // If flagged heavily, auto-reject with prejudice
        var flagScore = MC.getFlagScore(qId);
        if (flagScore >= 3) {
          msg += ' · 该题异议权重较高，已标记';
        }

        _showFeedback(content, 'mkc-review-feedback', triggerRejectCooldown(triggered) ? 'warn' : 'info', msg);
      }

      // Refresh after short delay
      var self = this;
      setTimeout(function() { self._refresh(content); }, 1000);
    },

    _handleProposalVote: function(propId, vote, content) {
      MC.voteProposal(propId, vote);
      var weight = MC.getReputation().weight;
      _showToast(
        vote === 'support' ? '👍 已支持' : '👎 已反对',
        '你的权重为 ' + weight.toFixed(1) + 'x',
        1500
      );
      this._refresh(content);
    },

    _refresh: function(content) {
      content.innerHTML = this._renderHTML();
      this._attachEvents(content);
    }
  };

  /* ============ Helpers ============ */
  function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function _currentUserId() {
    try {
      var raw = localStorage.getItem('medicard_current_user_id');
      if (raw) { var parsed = JSON.parse(raw); if (parsed && typeof parsed === 'string') return parsed; }
    } catch(e) {}
    return 'anonymous';
  }

  function _showFeedback(content, containerId, type, msg) {
    var fb = content.querySelector('#' + containerId);
    if (!fb) {
      fb = document.getElementById(containerId);
    }
    if (!fb) return;
    var colors = { success: '#6ee7b7', error: '#fca5a5', info: '#a5b4fc', warn: '#fbbf24' };
    fb.innerHTML = '<div style="padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;color:' + (colors[type] || '#fff') + ';font-size:12px;">' + msg + '</div>';
  }

  function _showToast(title, msg, duration) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:16px;right:16px;background:rgba(15,23,42,0.97);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:12px 16px;z-index:50000;max-width:300px;box-shadow:0 8px 24px rgba(0,0,0,0.4);font-size:13px;color:var(--text-primary);line-height:1.5;';
    toast.innerHTML = '<div style="font-weight:700;margin-bottom:2px;">' + title + '</div><div style="color:var(--text-muted);font-size:12px;">' + msg + '</div>';
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, duration || 2000);
  }

  function triggerRejectCooldown(triggered) {
    return triggered;
  }

  // Auto-inject
  function _tryInject() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { MC.Questions.injectButton(); });
    } else {
      MC.Questions.injectButton();
    }
  }
  _tryInject();

  console.log('[MKC] Questions module loaded');
})();
