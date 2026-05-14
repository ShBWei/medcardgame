/**
 * MediCard Community — Core Infrastructure (V1.0)
 * Shared namespace, reputation system, localStorage helpers
 * All self-contained — zero modification to existing game code
 */
(function() {
  var MC = window.MedicalKillCommunity = window.MedicalKillCommunity || {};

  /* ============ Storage keys (all prefixed 'mkc_') ============ */
  var K = {
    REPUTATION: 'mkc_reputation',
    SUBMITTED_QS: 'mkc_submitted_questions',
    REVIEWS: 'mkc_reviews',
    PROPOSALS: 'mkc_proposals',
    FLAGS: 'mkc_flags',
    DAILY_LIMITS: 'mkc_daily_limits',
    ACHIEVEMENTS: 'mkc_achievements',
    CONTRIBUTIONS: 'mkc_contributions',
    LEADERBOARD: 'mkc_leaderboard',
    WEEKLY_RESET: 'mkc_weekly_reset'
  };

  /* ============ Reputation ============ */
  MC.getReputation = function() {
    var data = _read(K.REPUTATION);
    if (!data || typeof data !== 'object') data = {};
    return {
      score: data.score || 0,
      tier: data.tier || 'newcomer',
      weight: data.weight || 1.0,
      totalApproved: data.totalApproved || 0,
      totalProposals: data.totalProposals || 0,
      totalReviews: data.totalReviews || 0,
      totalVotes: data.totalVotes || 0
    };
  };

  MC.updateReputation = function(delta, reason) {
    var rep = MC.getReputation();
    rep.score = Math.max(0, rep.score + delta);
    if (rep.score >= 100) { rep.tier = 'expert'; rep.weight = 2.0; }
    else if (rep.score >= 30) { rep.tier = 'senior'; rep.weight = 1.5; }
    else { rep.tier = 'newcomer'; rep.weight = 1.0; }
    _write(K.REPUTATION, rep);
    _addContribution(reason || 'reputation_change', delta);
    return rep;
  };

  MC.recalcTier = function() {
    var rep = MC.getReputation();
    var oldTier = rep.tier;
    if (rep.score >= 100) { rep.tier = 'expert'; rep.weight = 2.0; }
    else if (rep.score >= 30) { rep.tier = 'senior'; rep.weight = 1.5; }
    else { rep.tier = 'newcomer'; rep.weight = 1.0; }
    _write(K.REPUTATION, rep);
    if (rep.tier !== oldTier) {
      MC.triggerLevelUp(rep.tier);
    }
    return rep;
  };

  /* ============ Community Questions ============ */
  MC.getSubmittedQuestions = function() {
    return _read(K.SUBMITTED_QS) || [];
  };

  MC.addSubmittedQuestion = function(q) {
    var qs = MC.getSubmittedQuestions();
    q.id = 'cq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    q.status = 'pending'; // pending | approved | rejected
    q.submittedAt = new Date().toISOString();
    q.submitterId = _currentUserId();
    q.submitterName = _currentUserName();
    q.reviewVotes = []; // {reviewerId, vote: 'approve'|'reject', reason: string}
    q.weightedScore = 0;
    qs.push(q);
    _write(K.SUBMITTED_QS, qs);
    return q;
  };

  MC.updateQuestionStatus = function(qId, status) {
    var qs = MC.getSubmittedQuestions();
    for (var i = 0; i < qs.length; i++) {
      if (qs[i].id === qId) { qs[i].status = status; break; }
    }
    _write(K.SUBMITTED_QS, qs);
  };

  MC.getQuestionById = function(qId) {
    var qs = MC.getSubmittedQuestions();
    for (var i = 0; i < qs.length; i++) {
      if (qs[i].id === qId) return qs[i];
    }
    return null;
  };

  MC.getApprovedQuestions = function() {
    return MC.getSubmittedQuestions().filter(function(q) { return q.status === 'approved'; });
  };

  MC.getPendingQuestions = function() {
    return MC.getSubmittedQuestions().filter(function(q) { return q.status === 'pending'; });
  };

  /* ============ Flagging / Objections ============ */
  MC.getFlags = function() {
    return _read(K.FLAGS) || {};
  };

  MC.toggleFlag = function(questionId, reason) {
    var flags = MC.getFlags();
    var userId = _currentUserId();
    if (!flags[questionId]) flags[questionId] = { voters: {}, reasons: [] };
    var entry = flags[questionId];
    if (entry.voters[userId]) {
      delete entry.voters[userId];
      entry.reasons = entry.reasons.filter(function(r) { return r.userId !== userId; });
    } else {
      entry.voters[userId] = MC.getReputation().weight;
      entry.reasons.push({ userId: userId, reason: reason || 'other' });
    }
    entry.weightedScore = 0;
    for (var uid in entry.voters) { entry.weightedScore += entry.voters[uid]; }
    _write(K.FLAGS, flags);
    return entry;
  };

  MC.getFlagScore = function(questionId) {
    var flags = MC.getFlags();
    var entry = flags[questionId];
    return entry ? entry.weightedScore || 0 : 0;
  };

  /** Check if a question has reached the auto-escalate threshold (>= 3 weighted flags) */
  MC.checkFlagThreshold = function(questionId) {
    return MC.getFlagScore(questionId) >= 3;
  };

  /** Escalate a flagged game question into the proposals system for public review */
  MC.autoEscalateFlaggedQuestion = function(questionId, questionText, originalAnswer, explanation) {
    // Only escalate if threshold met and no existing active proposal
    var existing = MC.getProposals().filter(function(p) {
      return p.questionId === questionId && p.status === 'active';
    });
    if (existing.length > 0) return existing[0];

    var flags = MC.getFlags();
    var entry = flags[questionId];
    if (!entry || (entry.weightedScore || 0) < 3) return null;

    var reasons = (entry.reasons || []).map(function(r) { return r.reason; }).join('、');
    var proposal = MC.addProposal(
      questionId,
      originalAnswer || '',
      (explanation || '多位玩家质疑此题答案') + '（质疑理由: ' + (reasons || '答案可能有误') + '）',
      questionText || ''
    );
    return proposal;
  };

  /* ============ Proposals ============ */
  MC.getProposals = function() {
    return _read(K.PROPOSALS) || [];
  };

  MC.addProposal = function(questionId, correctedAnswer, explanation, questionText) {
    var proposals = MC.getProposals();
    var p = {
      id: 'prop_' + Date.now(),
      questionId: questionId,
      correctedAnswer: correctedAnswer,
      explanation: explanation,
      questionText: questionText || '',
      authorId: _currentUserId(),
      authorName: _currentUserName(),
      votes: {}, // {userId: {vote: 'support'|'oppose', weight: number}}
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'active' // active | passed | failed
    };
    proposals.push(p);
    _write(K.PROPOSALS, proposals);
    return p;
  };

  MC.voteProposal = function(propId, vote) {
    var proposals = MC.getProposals();
    for (var i = 0; i < proposals.length; i++) {
      if (proposals[i].id === propId) {
        proposals[i].votes[_currentUserId()] = {
          vote: vote,
          weight: MC.getReputation().weight
        };
        break;
      }
    }
    _write(K.PROPOSALS, proposals);
  };

  /* ============ Daily Limits ============ */
  MC.getDailyLimits = function() {
    var limits = _read(K.DAILY_LIMITS);
    var today = new Date().toDateString();
    if (!limits || limits.date !== today) {
      limits = { date: today, submits: 0, reviews: 0, rejectStreak: 0, lastRejectDate: '' };
      _write(K.DAILY_LIMITS, limits);
    }
    return limits;
  };

  MC.canSubmitToday = function() {
    return MC.getDailyLimits().submits < 5;
  };

  MC.canReviewToday = function() {
    return MC.getDailyLimits().reviews < 20;
  };

  MC.recordSubmit = function() {
    var limits = MC.getDailyLimits();
    limits.submits++;
    _write(K.DAILY_LIMITS, limits);
  };

  MC.recordReview = function() {
    var limits = MC.getDailyLimits();
    limits.reviews++;
    _write(K.DAILY_LIMITS, limits);
  };

  MC.recordReject = function() {
    var limits = MC.getDailyLimits();
    limits.rejectStreak++;
    limits.lastRejectDate = new Date().toISOString();
    _write(K.DAILY_LIMITS, limits);
    if (limits.rejectStreak >= 3) return true; // Trigger cooldown
    return false;
  };

  MC.clearRejectStreak = function() {
    var limits = MC.getDailyLimits();
    limits.rejectStreak = 0;
    _write(K.DAILY_LIMITS, limits);
  };

  /* ============ Achievements ============ */
  MC.getAchievements = function() {
    return _read(K.ACHIEVEMENTS) || {};
  };

  MC.unlockAchievement = function(key) {
    var achs = MC.getAchievements();
    if (achs[key]) return false; // Already unlocked
    achs[key] = new Date().toISOString();
    _write(K.ACHIEVEMENTS, achs);
    return true;
  };

  /* ============ Contributions Log ============ */
  MC.getContributions = function() {
    return _read(K.CONTRIBUTIONS) || [];
  };

  function _addContribution(reason, value) {
    var contribs = MC.getContributions();
    contribs.push({ reason: reason, value: value, date: new Date().toISOString() });
    if (contribs.length > 200) contribs = contribs.slice(-200);
    _write(K.CONTRIBUTIONS, contribs);
  }

  /* ============ Leaderboard Data ============ */
  MC.updateLeaderboard = function(type, entry) {
    var lb = _read(K.LEADERBOARD) || { battle: [], contribution: [], weeklyBattle: [], weeklyContribution: [] };
    var userId = _currentUserId();
    var list = type === 'battle' ? lb.battle : lb.contribution;
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].userId === userId) {
        list[i] = Object.assign(list[i], entry);
        found = true;
        break;
      }
    }
    if (!found) { entry.userId = userId; list.push(entry); }
    if (type === 'battle') {
      list.sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return (b.maxStreak || 0) - (a.maxStreak || 0);
      });
    } else {
      list.sort(function(a, b) {
        var repA = a.reputation || 0, repB = b.reputation || 0;
        if (repB !== repA) return repB - repA;
        if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
        return (b.approved || 0) - (a.approved || 0);
      });
    }
    if (list.length > 50) list.length = 50;
    _write(K.LEADERBOARD, lb);
  };

  MC.getLeaderboard = function(type, period) {
    var lb = _read(K.LEADERBOARD) || { battle: [], contribution: [], weeklyBattle: [], weeklyContribution: [] };
    var key = (period === 'weekly' ? 'weekly' : '') + (type === 'battle' ? 'Battle' : 'Contribution');
    var mappedKey = type === 'battle'
      ? (period === 'weekly' ? 'weeklyBattle' : 'battle')
      : (period === 'weekly' ? 'weeklyContribution' : 'contribution');
    return lb[mappedKey] || [];
  };

  /* ============ Weekly Reset ============ */
  MC.checkWeeklyReset = function() {
    var reset = _read(K.WEEKLY_RESET);
    var now = new Date();
    var monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    if (!reset || new Date(reset.lastReset) < monday) {
      var lb = _read(K.LEADERBOARD) || {};
      // Move weekly to archive, start fresh
      lb.weeklyBattle = [];
      lb.weeklyContribution = [];
      _write(K.LEADERBOARD, lb);
      _write(K.WEEKLY_RESET, { lastReset: now.toISOString() });
      return true;
    }
    return false;
  };

  /* ============ Level-Up Notification ============ */
  MC.triggerLevelUp = function(newTier) {
    var names = { expert: '题库专家', senior: '资深贡献者', newcomer: '新手' };
    var colors = { expert: '#fbbf24', senior: '#a855f7', newcomer: '#06b6d4' };
    _showToast(
      '🎉 信誉升级！',
      '你已成为 <b style="color:' + (colors[newTier] || '#fff') + ';">' + (names[newTier] || newTier) + '</b>（权重' + (newTier === 'expert' ? '2.0' : newTier === 'senior' ? '1.5' : '1.0') + '倍）',
      4000
    );
  };

  MC.triggerAchievement = function(title, desc) {
    _showToast('🏆 ' + title, desc, 3500);
  };

  /* ============ Internal helpers ============ */
  function _currentUserId() {
    try {
      var raw = localStorage.getItem('medicard_current_user_id');
      if (raw) { var parsed = JSON.parse(raw); if (parsed && typeof parsed === 'string') return parsed; }
    } catch(e) {}
    return 'anonymous';
  }

  function _currentUserName() {
    try {
      var raw = localStorage.getItem('medicard_current_user_id');
      if (raw) {
        var uid = JSON.parse(raw);
        var usersRaw = localStorage.getItem('medicard_users');
        if (usersRaw) {
          var users = JSON.parse(usersRaw);
          for (var i = 0; i < users.length; i++) {
            if (users[i].id === uid) return users[i].username;
          }
        }
      }
    } catch(e) {}
    return '医学战士';
  }

  function _read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
  }

  function _write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
  }

  /* ============ Toast notification (shared) ============ */
  function _showToast(title, msg, duration) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:16px;right:16px;background:rgba(15,23,42,0.97);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:14px 18px;z-index:50000;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease;font-size:13px;color:var(--text-primary);line-height:1.5;';
    toast.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">' + title + '</div><div style="color:var(--text-muted);font-size:12px;">' + msg + '</div>';
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, duration || 3000);
  }

  // Inject keyframe animations
  if (!document.getElementById('mkc-animations')) {
    var style = document.createElement('style');
    style.id = 'mkc-animations';
    style.textContent =
      '@keyframes slideInRight { from { transform:translateX(120%);opacity:0; } to { transform:translateX(0);opacity:1; } }' +
      '@keyframes slideOutRight { from { transform:translateX(0);opacity:1; } to { transform:translateX(120%);opacity:0; } }' +
      '@keyframes mkcPulse { 0%,100%{box-shadow:0 0 8px rgba(168,85,247,0.3);} 50%{box-shadow:0 0 20px rgba(168,85,247,0.6);} }';
    document.head.appendChild(style);
  }

  // Weekly reset check on load
  MC.checkWeeklyReset();

  console.log('[MKC] Community core initialized');
})();
