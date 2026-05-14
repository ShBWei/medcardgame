/**
 * MediCard Community — Feedback & Anti-Cheat (V1.0)
 * Achievement tracking, positive reinforcement, anti-cheat rules enforcement
 * Hooks into community-core events — zero modification to game code
 */
(function() {
  var MC = window.MedicalKillCommunity || {};

  MC.Feedback = {
    /** Achievement definitions */
    ACHIEVEMENTS: {
      first_submit: { title: '初次贡献', desc: '提交第一道题目', icon: '📝' },
      submit_5: { title: '题库新星', desc: '累计提交5道题目', icon: '⭐' },
      submit_20: { title: '题库达人', desc: '累计提交20道题目', icon: '🌟' },
      first_approved: { title: '质量认可', desc: '第一道题目通过审核', icon: '✅' },
      approved_10: { title: '优质贡献者', desc: '累计10道题目通过审核', icon: '🏅' },
      approved_50: { title: '题库大师', desc: '累计50道题目通过审核', icon: '👑' },
      review_10: { title: '热心审核员', desc: '累计审核10道题目', icon: '🔍' },
      review_50: { title: '资深审核员', desc: '累计审核50道题目', icon: '🔬' },
      review_200: { title: '审核专家', desc: '累计审核200道题目', icon: '⚖️' },
      senior_tier: { title: '资深贡献者', desc: '信誉等级达到资深', icon: '💜' },
      expert_tier: { title: '题库专家', desc: '信誉等级达到专家', icon: '👑' },
      perfect_streak: { title: '连续通过', desc: '连续5次审核通过', icon: '🔥' }
    },

    /** Track state for streak detection */
    _state: {
      lastApprovedCount: 0,
      lastReviewCount: 0,
      lastRepScore: 0,
      lastTier: 'newcomer',
      approveStreak: 0,
      checkedMilestones: false
    },

    /** Call this after any community action to check for achievements */
    checkAchievements: function() {
      var rep = MC.getReputation();
      var questions = MC.getSubmittedQuestions();
      var contribs = MC.getContributions();
      var achs = MC.getAchievements();
      var limits = MC.getDailyLimits();
      var newAchs = [];

      // First submit
      if (!achs.first_submit && questions.length >= 1) {
        if (MC.unlockAchievement('first_submit')) newAchs.push(this.ACHIEVEMENTS.first_submit);
      }

      // Submit milestones
      if (!achs.submit_5 && questions.length >= 5) {
        if (MC.unlockAchievement('submit_5')) newAchs.push(this.ACHIEVEMENTS.submit_5);
      }
      if (!achs.submit_20 && questions.length >= 20) {
        if (MC.unlockAchievement('submit_20')) newAchs.push(this.ACHIEVEMENTS.submit_20);
      }

      // Approved milestones
      var approved = questions.filter(function(q) { return q.status === 'approved'; }).length;
      if (!achs.first_approved && approved >= 1) {
        if (MC.unlockAchievement('first_approved')) newAchs.push(this.ACHIEVEMENTS.first_approved);
      }
      if (!achs.approved_10 && approved >= 10) {
        if (MC.unlockAchievement('approved_10')) newAchs.push(this.ACHIEVEMENTS.approved_10);
      }
      if (!achs.approved_50 && approved >= 50) {
        if (MC.unlockAchievement('approved_50')) newAchs.push(this.ACHIEVEMENTS.approved_50);
      }

      // Review milestones
      var reviews = contribs.filter(function(c) { return c.reason && c.reason.indexOf('review') >= 0; }).length;
      if (!achs.review_10 && reviews >= 10) {
        if (MC.unlockAchievement('review_10')) newAchs.push(this.ACHIEVEMENTS.review_10);
      }
      if (!achs.review_50 && reviews >= 50) {
        if (MC.unlockAchievement('review_50')) newAchs.push(this.ACHIEVEMENTS.review_50);
      }
      if (!achs.review_200 && reviews >= 200) {
        if (MC.unlockAchievement('review_200')) newAchs.push(this.ACHIEVEMENTS.review_200);
      }

      // Tier achievements
      if (!achs.senior_tier && rep.tier === 'senior') {
        if (MC.unlockAchievement('senior_tier')) newAchs.push(this.ACHIEVEMENTS.senior_tier);
      }
      if (!achs.expert_tier && rep.tier === 'expert') {
        if (MC.unlockAchievement('expert_tier')) newAchs.push(this.ACHIEVEMENTS.expert_tier);
      }

      // Show new achievement notifications
      for (var i = 0; i < newAchs.length; i++) {
        this._showAchievement(newAchs[i]);
      }

      return newAchs;
    },

    /** Check anti-cheat rules and return violations */
    checkAntiCheat: function(action, context) {
      var violations = [];

      switch (action) {
        case 'submit':
          // Rate limit: max 5 submissions per day
          if (!MC.canSubmitToday()) {
            violations.push({ rule: 'daily_submit_limit', msg: '每日提交限5题' });
          }
          // Check for spammy duplicates
          var recentQs = MC.getSubmittedQuestions();
          if (context && context.question) {
            var similar = recentQs.filter(function(q) {
              return q.submitterId === _currentUserId() &&
                     q.question === context.question &&
                     q.status === 'pending';
            });
            if (similar.length >= 1) {
              violations.push({ rule: 'duplicate_submit', msg: '该题目已存在待审版本' });
            }
          }
          // Check cooldown if previous reject
          var limits = MC.getDailyLimits();
          if (limits.rejectStreak >= 3) {
            var lastReject = limits.lastRejectDate ? new Date(limits.lastRejectDate) : null;
            if (lastReject && (Date.now() - lastReject.getTime()) < 3600000) {
              violations.push({ rule: 'reject_cooldown', msg: '连续驳回冷却中（1小时）' });
            }
          }
          break;

        case 'review':
          // Anti-self-review
          if (context && context.submitterId === _currentUserId()) {
            violations.push({ rule: 'self_review', msg: '不能审核自己的题目' });
          }
          // Daily review limit
          if (!MC.canReviewToday()) {
            violations.push({ rule: 'daily_review_limit', msg: '每日审核限20题' });
          }
          break;
      }

      return violations;
    },

    /** Show an achievement toast */
    _showAchievement: function(ach) {
      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(249,115,22,0.1));border:1px solid rgba(168,85,247,0.5);border-radius:16px;padding:20px 32px;z-index:50001;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.5);animation:mkcAchievePop 0.5s ease;';
      toast.innerHTML = '<div style="font-size:40px;margin-bottom:8px;">' + ach.icon + '</div>' +
        '<div style="font-weight:700;font-size:16px;color:#fbbf24;margin-bottom:4px;">' + ach.title + '</div>' +
        '<div style="color:var(--text-muted);font-size:13px;">' + ach.desc + '</div>';
      document.body.appendChild(toast);

      // Add achievement pop animation if not exists
      if (!document.getElementById('mkc-ach-anim')) {
        var style = document.createElement('style');
        style.id = 'mkc-ach-anim';
        style.textContent = '@keyframes mkcAchievePop { 0% { transform:translate(-50%,-50%) scale(0.5);opacity:0; } 50% { transform:translate(-50%,-50%) scale(1.1); } 100% { transform:translate(-50%,-50%) scale(1);opacity:1; } }';
        document.head.appendChild(style);
      }

      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 500);
      }, 3500);
    },

    /** Show daily limits summary toast */
    showLimitsSummary: function() {
      var limits = MC.getDailyLimits();
      var msg = '提交 ' + limits.submits + '/5 · 审核 ' + limits.reviews + '/20';
      this._showSmallToast('📊 今日进度', msg, 2500);
    },

    /** Show small info toast */
    _showSmallToast: function(title, msg, duration) {
      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:80px;right:16px;background:rgba(15,23,42,0.95);border:1px solid rgba(100,116,139,0.3);border-radius:10px;padding:10px 14px;z-index:50000;max-width:280px;box-shadow:0 4px 16px rgba(0,0,0,0.3);font-size:12px;color:var(--text-primary);';
      toast.innerHTML = '<b>' + title + '</b> <span style="color:var(--text-muted);">' + msg + '</span>';
      document.body.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
      }, duration || 2500);
    }
  };

  /* ============ Override core functions to inject feedback ============ */
  // Wrap MC.updateReputation to trigger achievement checks
  var _originalUpdateRep = MC.updateReputation;
  MC.updateReputation = function(delta, reason) {
    var result = _originalUpdateRep.call(MC, delta, reason);
    MC.Feedback.checkAchievements();
    return result;
  };

  // Wrap MC.recordSubmit to check anti-cheat and trigger achievements
  var _originalRecordSubmit = MC.recordSubmit;
  MC.recordSubmit = function() {
    var violations = MC.Feedback.checkAntiCheat('submit', null);
    if (violations.length > 0) {
      console.warn('[MKC] Anti-cheat: submit blocked', violations);
      return;
    }
    _originalRecordSubmit.call(MC);
    setTimeout(function() { MC.Feedback.checkAchievements(); }, 100);
  };

  // Wrap MC.recordReview to trigger achievements
  var _originalRecordReview = MC.recordReview;
  MC.recordReview = function() {
    _originalRecordReview.call(MC);
    setTimeout(function() { MC.Feedback.checkAchievements(); }, 100);
  };

  // Wrap MC.addSubmittedQuestion to check anti-cheat
  var _originalAddQ = MC.addSubmittedQuestion;
  MC.addSubmittedQuestion = function(q) {
    var violations = MC.Feedback.checkAntiCheat('submit', { question: q.question });
    if (violations.length > 0) {
      for (var i = 0; i < violations.length; i++) {
        console.warn('[MKC] Anti-cheat:', violations[i].msg);
      }
    }
    return _originalAddQ.call(MC, q);
  };

  /* ============ Helper ============ */
  function _currentUserId() {
    try {
      var raw = localStorage.getItem('medicard_current_user_id');
      if (raw) { var parsed = JSON.parse(raw); if (parsed && typeof parsed === 'string') return parsed; }
    } catch(e) {}
    return 'anonymous';
  }

  console.log('[MKC] Feedback & Anti-Cheat module loaded');
})();
