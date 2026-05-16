/**
 * MediCard 医杀 — Stress Relief Capsule (期末解压舱) V1.0
 * Standalone full-screen overlay for stress relief during medical study sessions.
 * 100% independent module — zero modifications to existing code.
 * IIFE-wrapped, sr- CSS prefix, defensive global reads only.
 *
 * Ergonomic foundations: VICO visual comfort, WCAG 2.2 contrast, F-pattern layout,
 * 20-20-20 eye care, 4-7-8 breathing, color psychology for stress reduction.
 */
(function() {
  var MediCard = window.MediCard || {};

  /* ========================================================================
     MEDICAL QUOTES (30+ built-in, randomly selected)
     ======================================================================== */
  var MEDICAL_QUOTES = [
    { text: '有时去治愈，常常去帮助，总是去安慰。', author: '特鲁多医生' },
    { text: '医学是门不确定的科学，也是门可能性的艺术。', author: '威廉·奥斯勒' },
    { text: '不为良相，便为良医。', author: '范仲淹' },
    { text: '凡大医治病，必当安神定志，无欲无求。', author: '孙思邈《大医精诚》' },
    { text: '医生的工作不是延长生命，而是提高生活质量。', author: '希波克拉底' },
    { text: '你的每一次熬夜复习，都在为未来的患者负责。', author: '匿名前辈' },
    { text: '麻醉不是让病人睡着，而是让病人安全地醒来。', author: '麻醉科格言' },
    { text: '丙泊酚起效只需30秒，但你离麻醉医生还差3000道题。', author: '刷题工坊' },
    { text: '手术刀可以切开皮肤，但只有知识能切开疾病的真相。', author: '外科学总论' },
    { text: '心电图上的每一个波形，都是心肌细胞在跳舞。', author: '生理学笔记' },
    { text: '你已经很棒了，休息一下不会让知识跑掉的。', author: '期末解压舱' },
    { text: '深呼吸，你的前额叶皮质需要氧气才能高效工作。', author: '神经科学' },
    { text: '最好的学习状态是放松的专注，不是焦虑的勤奋。', author: '认知心理学' },
    { text: '医学生的字典里没有"放弃"，但有"休息"。', author: '前辈寄语' },
    { text: '你的海马体正在把今天刷的题转化为长期记忆。', author: '记忆科学' },
    { text: '坐在考场里的你，会感谢现在刷题到凌晨的你。', author: '匿名' },
    { text: '多巴胺不是快乐激素，是渴望激素——渴望考过的感觉吧。', author: '神经递质学' },
    { text: '乙酰胆碱正在你的突触间隙里拼命工作。', author: '生物化学' },
    { text: '白细胞在巡逻，红细胞在运氧，你在刷题——身体在为你战斗。', author: '免疫学' },
    { text: '压力激素皮质醇的半衰期是60分钟，休息一下就代谢掉了。', author: '内分泌学' },
    { text: '医生看遍生死，所以更懂生命的珍贵。', author: '临床感悟' },
    { text: '每一个主治医师都曾是熬夜刷题的医学生。', author: '成长轨迹' },
    { text: '你的心肌细胞一生要跳动25亿次——比你刷的题多多了。', author: '生理学趣闻' },
    { text: 'ATP是细胞通用的能量货币——你也需要给自己的ATP充值。', author: '生物化学' },
    { text: '窦房结起搏细胞60次/分钟，你刷题的心率呢？', author: '循环系统' },
    { text: '医生诊室里的淡定，是从无数个紧张的期末练出来的。', author: '临床经验' },
    { text: '你的端粒在替你续命，你的大脑在替你记忆——休息吧。', author: '分子生物学' },
    { text: '无影灯下你最耀眼，考场上你最闪亮。', author: '期末解压舱' },
    { text: '抗生素杀死细菌，考题杀死脑细胞——幸好脑细胞能再生。', author: '神经再生学' },
    { text: '这页考点，你已经拿捏了。', author: '刷题工坊' },
    { text: '加油！未来的主任医师——不，未来的你已经是学神了。', author: '期末解压舱' }
  ];

  /* ========================================================================
     MEDICAL COLD KNOWLEDGE (for cell 3 brain click)
     ======================================================================== */
  var COLD_KNOWLEDGE = [
    '人体血管总长度约10万公里，可以绕地球2.5圈。',
    '胃酸（pH 1.5-3.5）强到可以溶解刀片，但胃黏膜每3-4天更新一次保护自己。',
    '心脏每天泵出约7500升血液，相当于一辆消防车的载水量。',
    '人体最大的器官是皮肤，面积约1.5-2平方米。',
    '红细胞的寿命约120天，每秒约有200万个红细胞被替换。',
    '大脑消耗全身20%的氧气和能量，但只占体重的2%。',
    '咳嗽的速度可达80公里/小时，相当于城市道路最高限速。',
    '一个喷嚏的飞沫可以传播到8米以外。',
    '肝脏是唯一可以再生的内脏器官，切除75%后仍可长回原大小。',
    '人体骨骼每10年完全更新一次。',
    '耳屎其实是保护耳道的抗菌分泌物，不是脏东西。',
    '角膜是人体唯一没有血液供应的组织，通过泪液和房水获取氧气。',
    '一次深吻交换约8000万个细菌——但别担心，大部分是有益的。',
    '青霉菌产生青霉素是为了杀死竞争对手细菌，不是为了救人类。',
    '麻醉药丙泊酚是白色的，被称为"牛奶"就是因为外观像牛奶。',
    '阑尾不是无用的——它储存有益菌群，在腹泻后帮助肠道恢复。',
    '人的鼻子可以分辨约1万亿种气味。',
    'DNA如果完全展开，单个细胞的DNA长度约2米。',
    '肌肉的记忆是真实的——肌细胞核数量会因训练而增加，即使停训也不会减少。',
    '人在睡眠时大脑会"清洗"自己，脑脊液流量增加60%清除代谢废物。'
  ];

  /* ========================================================================
     ACHIEVEMENT SYSTEM
     ======================================================================== */
  var ACHIEVEMENTS = [
    { id: 'first_open', title: '见习麻醉师', desc: '首次打开解压舱', icon: '💊' },
    { id: 'breathe_done', title: '呼吸治疗师', desc: '完成一次4-7-8呼吸训练', icon: '🌬️' },
    { id: 'timer_5min', title: '住院总医师', desc: '摸鱼满5分钟', icon: '⏱️' },
    { id: 'timer_15min', title: '主任医师', desc: '摸鱼满15分钟', icon: '🩺' },
    { id: 'timer_30min', title: '麻醉之神', desc: '摸鱼满30分钟（你还考不考试了？）', icon: '👑' },
    { id: 'all_cells', title: '全科医生', desc: '点击了全部16个解压格子', icon: '🏥' },
    { id: 'egg_999', title: '急救先锋', desc: '发现999彩蛋', icon: '🚨' },
    { id: 'egg_bingbofu', title: '麻醉学徒', desc: '发现丙泊酚彩蛋', icon: '💉' },
    { id: 'egg_bisheng', title: '学神附体', desc: '发现麻醉必胜彩蛋', icon: '✨' },
    { id: 'sleepy_10', title: '温柔唤醒', desc: '点了睡着的医学生10次', icon: '😴' }
  ];

  /* ========================================================================
     MODULE STATE (private, not exposed on MediCard.ScreenSR)
     ======================================================================== */
  var _state = {
    overlay: null,
    container: null,
    topBar: null,
    theme: '08',            // default: starry night (dark mode friendly)
    mode: 'grid',           // 'grid' | 'breathe' | 'noise' | 'theme'
    opened: false,
    audioCtx: null,
    noiseNode: null,
    noiseGain: null,
    noiseActive: false,
    noiseType: null,        // 'white' | 'pink' | 'brown' | 'rain' | 'cafe'
    pollTimer: null,
    eyeTimer: null,
    eyeStartTime: 0,
    countdownTimer: null,
    countdownRemaining: 0,
    countdownTotal: 300,    // 5 min default
    breatheTimer: null,
    mouseTrailActive: false,
    mouseTrailParticles: [],
    comboCount: 0,
    comboChecked: 0,        // total answers checked since capsule opened
    easterEggsFound: {},
    clickedCells: {},
    sleepyClicks: 0,
    quotesUsed: [],
    pixelColors: ['#E8A87C', '#8B9DC3', '#81C784', '#FFCC80', '#5B4A3F'],
    currentPixelColor: 0,
    keyboardBuf: '',
    keyboardTimer: null
  };

  /* ========================================================================
     HELPERS
     ======================================================================== */
  function _esc(str) {
    if (MediCard.Crypto && MediCard.Crypto.escapeHtml) {
      return MediCard.Crypto.escapeHtml(str);
    }
    var s = String(str == null ? '' : str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Utility: shuffle array in place, return the array */
  function _shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /** Pad number to 2 digits */
  function _pad2(n) { return n < 10 ? '0' + n : String(n); }

  /** Safe function call — silently swallow errors for non-critical audio/visual calls */
  function _safePlay(fn) {
    try { if (typeof fn === 'function') fn(); } catch(e) {}
  }

  /* ========================================================================
     AUDIO SYSTEM (Web Audio API with silent fallback)
     ======================================================================== */
  function _ensureAudio() {
    if (_state.audioCtx) return true;
    try {
      _state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch(e) {
      _state.audioCtx = null;
      return false;
    }
  }

  function _playTone(freq, duration, type, vol) {
    if (!_ensureAudio()) return;
    var ctx = _state.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq || 440;
    gain.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.3));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (duration || 0.3) + 0.05);
  }

  function _playClick() { _playTone(800, 0.08, 'sine', 0.1); }
  function _playOpen() { _playTone(523, 0.1, 'sine', 0.12); setTimeout(function() { _playTone(659, 0.1, 'sine', 0.12); }, 80); setTimeout(function() { _playTone(784, 0.1, 'sine', 0.12); }, 160); }
  function _playClose() { _playTone(784, 0.1, 'sine', 0.1); setTimeout(function() { _playTone(659, 0.1, 'sine', 0.1); }, 80); setTimeout(function() { _playTone(523, 0.1, 'sine', 0.1); }, 160); }
  function _playCombo() { _playTone(660, 0.12, 'triangle', 0.12); setTimeout(function() { _playTone(880, 0.12, 'triangle', 0.12); }, 100); setTimeout(function() { _playTone(1100, 0.2, 'triangle', 0.12); }, 200); }
  function _playEgg() { _playTone(440, 0.1, 'square', 0.08); setTimeout(function() { _playTone(660, 0.1, 'square', 0.08); }, 100); setTimeout(function() { _playTone(880, 0.15, 'square', 0.08); }, 200); setTimeout(function() { _playTone(1320, 0.3, 'square', 0.1); }, 300); }
  function _playCorrect() { _playTone(523, 0.08, 'sine', 0.1); setTimeout(function() { _playTone(659, 0.08, 'sine', 0.1); }, 70); setTimeout(function() { _playTone(784, 0.15, 'sine', 0.12); }, 140); }
  function _playWrong() { _playTone(200, 0.2, 'sawtooth', 0.06); }
  function _playBubblePop() { _playTone(1200, 0.06, 'sine', 0.05); }
  function _playBreatheIn() { _playTone(220, 0.5, 'sine', 0.04); }
  function _playBreatheOut() { _playTone(330, 0.5, 'sine', 0.04); }
  function _playEyeReminder() { _playTone(880, 0.08, 'sine', 0.08); setTimeout(function() { _playTone(1100, 0.12, 'sine', 0.08); }, 150); }
  function _playAlarm() {
    for (var i = 0; i < 6; i++) {
      (function(d) { setTimeout(function() { _playTone(1000, 0.1, 'square', 0.15); }, d); })(i * 150);
    }
  }

  /** White/pink/brown noise generator */
  function _startNoise(type) {
    if (!_ensureAudio()) return;
    _stopNoise();
    var ctx = _state.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    var bufferSize = 2 * ctx.sampleRate;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);

    if (type === 'white') {
      for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var j = 0; j < bufferSize; j++) {
        var white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[j] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      var lastOut = 0;
      for (var k = 0; k < bufferSize; k++) {
        var w = Math.random() * 2 - 1;
        data[k] = (lastOut + (0.02 * w)) / 1.02;
        lastOut = data[k];
        data[k] *= 3.5;
      }
    } else {
      // 'rain' — sparse random clicks
      for (var m = 0; m < bufferSize; m++) {
        data[m] = Math.random() < 0.01 ? (Math.random() * 2 - 1) * 0.3 : 0;
      }
    }

    _state.noiseNode = ctx.createBufferSource();
    _state.noiseNode.buffer = buffer;
    _state.noiseNode.loop = true;
    _state.noiseGain = ctx.createGain();
    _state.noiseGain.gain.value = 0.12;
    _state.noiseNode.connect(_state.noiseGain);
    _state.noiseGain.connect(ctx.destination);
    _state.noiseNode.start();
    _state.noiseActive = true;
    _state.noiseType = type;
  }

  function _stopNoise() {
    if (_state.noiseNode) {
      try { _state.noiseNode.stop(); } catch(e) {}
      _state.noiseNode.disconnect();
      _state.noiseNode = null;
    }
    if (_state.noiseGain) {
      _state.noiseGain.disconnect();
      _state.noiseGain = null;
    }
    _state.noiseActive = false;
    _state.noiseType = null;
  }

  function _toggleMute() {
    if (!_state.audioCtx) return;
    if (_state.audioCtx.state === 'running') {
      _state.audioCtx.suspend();
      _stopNoise();
    } else {
      _state.audioCtx.resume();
    }
  }

  function _isMuted() {
    return _state.audioCtx && _state.audioCtx.state === 'suspended';
  }

  /* ========================================================================
     TOAST NOTIFICATION
     ======================================================================== */
  function _showToast(msg, duration) {
    if (!_state.container) return;
    var existing = _state.container.querySelector('.sr-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'sr-toast';
    toast.textContent = msg;
    _state.container.appendChild(toast);
    duration = duration || 2800;
    setTimeout(function() {
      if (toast.parentNode) toast.remove();
    }, duration);
  }

  /* ========================================================================
     ACHIEVEMENT SYSTEM
     ======================================================================== */
  function _unlockAchievement(id) {
    if (_state.easterEggsFound[id]) return;
    _state.easterEggsFound[id] = true;
    var ach = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) { ach = ACHIEVEMENTS[i]; break; }
    }
    if (!ach) return;
    var badge = document.createElement('div');
    badge.className = 'sr-achievement-badge';
    badge.textContent = ach.icon + ' ' + ach.title + ' 解锁！';
    if (_state.container) _state.container.appendChild(badge);
    _playCombo();
    setTimeout(function() {
      if (badge.parentNode) badge.remove();
    }, 4000);
  }

  /* ========================================================================
     DATA DASHBOARD POLLING
     ======================================================================== */
  function _gatherStats() {
    var stats = { answered: 0, correct: 0, wrongCount: 0, sessionQ: 0, sessionC: 0, currentSubject: '-' };

    var study = MediCard.ScreenStudy;
    if (study) {
      var prog = study._progress;
      if (prog) {
        var subjects = Object.keys(prog);
        for (var i = 0; i < subjects.length; i++) {
          var p = prog[subjects[i]];
          if (p) { stats.answered += (p.answered || 0); stats.correct += (p.correct || 0); }
        }
      }
      stats.sessionQ = study._sessionAnswered || 0;
      stats.sessionC = study._sessionCorrect || 0;
      stats.currentSubject = (MediCard.Config && MediCard.Config.subjectMeta && study._currentSubject)
        ? (MediCard.Config.subjectMeta[study._currentSubject] || {}).name || study._currentSubject || '-'
        : study._currentSubject || '-';
    }

    if (MediCard.WrongQuestionBook) {
      stats.wrongCount = MediCard.WrongQuestionBook.getCount('wrong') || 0;
    }

    return stats;
  }

  function _updateDashboard(stats) {
    if (!stats) stats = _gatherStats();
    var ids = ['sr-stat-answered', 'sr-stat-correct', 'sr-stat-wrong', 'sr-stat-subject'];
    var vals = [stats.sessionQ || stats.answered, stats.sessionC ? (stats.sessionQ ? Math.round(stats.sessionC / Math.max(stats.sessionQ, 1) * 100) + '%' : '-') : '-', stats.wrongCount, stats.currentSubject];

    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      var oldVal = el.textContent;
      var newVal = String(vals[i]);
      if (oldVal !== newVal) {
        el.textContent = newVal;
        el.classList.add('sr-bounce');
        setTimeout(function(e) { if (e) e.classList.remove('sr-bounce'); }, 350, el);
      }
    }

    // Combo detection: compare with last polled values
    if (stats.sessionQ > 0 && stats.sessionQ > _state.comboChecked) {
      var newlyAnswered = stats.sessionQ - _state.comboChecked;
      _state.comboCount += (stats.sessionC - (_state._lastSessionC || 0)) > 0 ? newlyAnswered : 0;
      if (_state.comboCount >= 10 && _state.comboCount - newlyAnswered < 10) {
        _showToast('🌟 学神附体！连续答对10题', 3500);
        _unlockAchievement('egg_bisheng');
      } else if (_state.comboCount >= 5 && _state.comboCount - newlyAnswered < 5) {
        _showToast('✨ 连对5题！太强了', 2500);
      }
      _state._lastSessionC = stats.sessionC;
      _state.comboChecked = stats.sessionQ;
    }
  }

  function _startPolling() {
    _stopPolling();
    // Initial update
    _updateDashboard();
    _state.pollTimer = setInterval(function() {
      if (document.hidden) return;
      _updateDashboard();
    }, 2000);
  }

  function _stopPolling() {
    if (_state.pollTimer) { clearInterval(_state.pollTimer); _state.pollTimer = null; }
  }

  /* ========================================================================
     COUNTDOWN TIMER
     ======================================================================== */
  function _setCountdown(minutes) {
    _state.countdownTotal = minutes * 60;
    _state.countdownRemaining = _state.countdownTotal;
    _updateTimerDisplay();
    var presets = document.querySelectorAll('.sr-timer-preset');
    for (var i = 0; i < presets.length; i++) {
      var pMin = parseInt(presets[i].getAttribute('data-min'), 10);
      if (pMin === minutes) presets[i].classList.add('sr-active');
      else presets[i].classList.remove('sr-active');
    }
  }

  function _updateTimerDisplay() {
    var display = document.getElementById('sr-timer-display');
    if (!display) return;
    var r = _state.countdownRemaining;
    var m = Math.floor(r / 60);
    var s = r % 60;
    display.textContent = _pad2(m) + ':' + _pad2(s);
    if (r <= 30 && r > 0) {
      display.classList.add('sr-timer-warning');
    } else {
      display.classList.remove('sr-timer-warning');
    }
  }

  function _startCountdown() {
    if (_state.countdownTimer) return;
    if (_state.countdownRemaining <= 0) _state.countdownRemaining = _state.countdownTotal;
    _state.countdownTimer = setInterval(function() {
      if (document.hidden) return;
      _state.countdownRemaining--;
      _updateTimerDisplay();
      if (_state.countdownRemaining <= 0) {
        _stopCountdown();
        _playAlarm();
        _showToast('⏰ 摸鱼结束！该回去背书啦📚', 5000);
        // Track total snooze time for achievements
        var totalSnoozed = _state.countdownTotal;
        if (totalSnoozed >= 1800) _unlockAchievement('timer_30min');
        else if (totalSnoozed >= 900) _unlockAchievement('timer_15min');
        else if (totalSnoozed >= 300) _unlockAchievement('timer_5min');
      }
    }, 1000);
  }

  function _stopCountdown() {
    if (_state.countdownTimer) { clearInterval(_state.countdownTimer); _state.countdownTimer = null; }
  }

  /* ========================================================================
     20-20-20 EYE CARE
     ======================================================================== */
  function _startEyeCare() {
    if (_state.eyeTimer) return;
    _state.eyeStartTime = Date.now();
    _state.eyeTimer = setInterval(function() {
      if (document.hidden) return;
      var elapsed = (Date.now() - _state.eyeStartTime) / 1000;
      if (elapsed >= 1200) { // 20 minutes = 1200 seconds
        _showEyeReminder();
        _state.eyeStartTime = Date.now(); // reset
      }
    }, 30000); // check every 30 seconds
  }

  function _stopEyeCare() {
    if (_state.eyeTimer) { clearInterval(_state.eyeTimer); _state.eyeTimer = null; }
  }

  function _showEyeReminder() {
    if (!_state.container) return;
    _playEyeReminder();
    var existing = _state.container.querySelector('.sr-eye-reminder');
    if (existing) existing.remove();

    var reminder = document.createElement('div');
    reminder.className = 'sr-eye-reminder';
    reminder.innerHTML = '<div class="sr-eye-reminder-text">👁️ 20-20-20 护眼时间</div>' +
      '<div class="sr-eye-reminder-sub">远眺6米外物体20秒，让睫状肌放松一下</div>' +
      '<button id="sr-eye-dismiss">知道了 ✅</button>';
    _state.container.appendChild(reminder);

    var dismissBtn = document.getElementById('sr-eye-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() {
        if (reminder.parentNode) reminder.remove();
      });
    }
    // Auto-dismiss after 25 seconds
    setTimeout(function() {
      if (reminder.parentNode) reminder.remove();
    }, 25000);
  }

  /* ========================================================================
     BREATHING GUIDE (4-7-8 method)
     ======================================================================== */
  function _showBreatheGuide() {
    if (!_state.container) return;
    _closeSubPanels();

    var overlay = document.createElement('div');
    overlay.className = 'sr-breathe-overlay';
    overlay.id = 'sr-breathe-overlay';
    overlay.innerHTML = '<div class="sr-breathe-circle" id="sr-breathe-circle"></div>' +
      '<div class="sr-breathe-text" id="sr-breathe-text">准备开始深呼吸...</div>' +
      '<button class="sr-breathe-close" id="sr-breathe-close">退出呼吸训练</button>';
    _state.container.appendChild(overlay);

    document.getElementById('sr-breathe-close').addEventListener('click', function() {
      _stopBreathe();
      if (overlay.parentNode) overlay.remove();
      _playClose();
    });

    _runBreatheCycle(0);
  }

  function _stopBreathe() {
    if (_state.breatheTimer) { clearTimeout(_state.breatheTimer); _state.breatheTimer = null; }
  }

  function _runBreatheCycle(step) {
    var circle = document.getElementById('sr-breathe-circle');
    var text = document.getElementById('sr-breathe-text');
    if (!circle || !text) return;

    // 3 cycles: inhale 4s, hold 7s, exhale 8s
    var totalCycles = 3;
    var cycleIndex = Math.floor(step / 3);
    var phaseInCycle = step % 3;

    if (cycleIndex >= totalCycles) {
      text.textContent = '✅ 完成！感觉好点了吗？';
      circle.className = 'sr-breathe-circle';
      _playCorrect();
      _unlockAchievement('breathe_done');
      _state.breatheTimer = null;
      return;
    }

    if (phaseInCycle === 0) {
      // Inhale 4s
      text.textContent = '吸气... 4秒 (' + (cycleIndex + 1) + '/' + totalCycles + ')';
      circle.className = 'sr-breathe-circle sr-inhale';
      _playBreatheIn();
      _state.breatheTimer = setTimeout(function() { _runBreatheCycle(step + 1); }, 4000);
    } else if (phaseInCycle === 1) {
      // Hold 7s
      text.textContent = '屏息... 7秒';
      circle.className = 'sr-breathe-circle sr-hold';
      _state.breatheTimer = setTimeout(function() { _runBreatheCycle(step + 1); }, 7000);
    } else {
      // Exhale 8s
      text.textContent = '呼气... 8秒';
      circle.className = 'sr-breathe-circle sr-exhale';
      _playBreatheOut();
      _state.breatheTimer = setTimeout(function() { _runBreatheCycle(step + 1); }, 8000);
    }
  }

  /* ========================================================================
     THEME SWITCHING
     ======================================================================== */
  function _setTheme(themeId) {
    _state.theme = themeId;
    if (_state.overlay) {
      _state.overlay.setAttribute('data-theme', themeId);
    }
    try { localStorage.setItem('medicard_sr_theme', themeId); } catch(e) {}
    _updateThemePickerUI();
  }

  function _loadTheme() {
    try {
      var saved = localStorage.getItem('medicard_sr_theme');
      if (saved && /^(0[7-9]|1[0-6])$/.test(saved)) return saved;
    } catch(e) {}
    // Default: dark mode = theme 08, light = theme 07
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return '08';
    return '08'; // default to starry night
  }

  function _updateThemePickerUI() {
    var opts = document.querySelectorAll('.sr-theme-opt');
    for (var i = 0; i < opts.length; i++) {
      var t = opts[i].getAttribute('data-theme-id');
      if (t === _state.theme) opts[i].classList.add('sr-active');
      else opts[i].classList.remove('sr-active');
    }
  }

  function _showThemePicker() {
    _closeSubPanels();
    var existing = document.getElementById('sr-theme-picker');
    if (existing) { existing.remove(); return; }

    var themes = [
      { id: '07', name: '手术清创', preview: '#EEF2F5', text: '#1C2D36' },
      { id: '08', name: '星空药典', preview: '#1A1D23', text: '#C8D6E5' },
      { id: '09', name: '诊所手记', preview: '#FDF8F5', text: '#5D3A2E' },
      { id: '10', name: '希波克拉底', preview: '#F5F0E8', text: '#2E241A' }
    ];

    var picker = document.createElement('div');
    picker.className = 'sr-theme-picker';
    picker.id = 'sr-theme-picker';

    for (var i = 0; i < themes.length; i++) {
      var t = themes[i];
      picker.innerHTML += '<div class="sr-theme-opt' + (t.id === _state.theme ? ' sr-active' : '') + '" data-theme-id="' + t.id + '">' +
        '<div class="sr-theme-opt-preview" style="background:' + _esc(t.preview) + ';border:1px solid ' + _esc(t.text) + ';"></div>' +
        _esc(t.name) + '</div>';
    }

    // Insert after action bar
    var actionBar = _state.container.querySelector('.sr-action-bar');
    if (actionBar && actionBar.nextSibling) {
      _state.container.insertBefore(picker, actionBar.nextSibling);
    } else if (actionBar) {
      actionBar.parentNode.insertBefore(picker, actionBar.nextSibling);
    } else {
      _state.container.appendChild(picker);
    }

    // Attach click handlers
    picker.querySelectorAll('.sr-theme-opt').forEach(function(opt) {
      opt.addEventListener('click', function() {
        _setTheme(this.getAttribute('data-theme-id'));
        _playClick();
      });
    });
  }

  /* ========================================================================
     QUOTE POPUP
     ======================================================================== */
  function _showRandomQuote() {
    if (!_state.container) return;
    var existing = _state.container.querySelector('.sr-quote-popup');
    if (existing) { existing.remove(); return; }

    // Prefer unused quotes, reset when all used
    if (_state.quotesUsed.length >= MEDICAL_QUOTES.length) _state.quotesUsed = [];
    var available = [];
    for (var i = 0; i < MEDICAL_QUOTES.length; i++) {
      if (_state.quotesUsed.indexOf(i) < 0) available.push(i);
    }
    var idx = available[Math.floor(Math.random() * available.length)];
    _state.quotesUsed.push(idx);
    var q = MEDICAL_QUOTES[idx];

    var popup = document.createElement('div');
    popup.className = 'sr-quote-popup';
    popup.innerHTML = '<div class="sr-quote-text">"' + _esc(q.text) + '"</div>' +
      '<div class="sr-quote-author">— ' + _esc(q.author) + '</div>';
    _state.container.appendChild(popup);

    setTimeout(function() {
      if (popup.parentNode) popup.remove();
    }, 6000);
  }

  /* ========================================================================
     WHITE NOISE PANEL
     ======================================================================== */
  function _showNoisePanel() {
    _closeSubPanels();
    var existing = document.getElementById('sr-noise-panel');
    if (existing) { existing.remove(); _stopNoise(); return; }

    var noises = [
      { id: 'white', label: '⬜ 白噪音', desc: '均匀全频段' },
      { id: 'pink', label: '🩷 粉红噪音', desc: '自然柔和' },
      { id: 'brown', label: '🟤 布朗噪音', desc: '低沉深海' },
      { id: 'rain', label: '🌧️ 雨声', desc: '稀疏雨滴' }
    ];

    var panel = document.createElement('div');
    panel.className = 'sr-noise-panel';
    panel.id = 'sr-noise-panel';

    for (var i = 0; i < noises.length; i++) {
      var n = noises[i];
      panel.innerHTML += '<button class="sr-noise-btn' + (_state.noiseType === n.id ? ' sr-active' : '') + '" data-noise="' + n.id + '">' +
        n.label + '</button>';
    }
    panel.innerHTML += '<button class="sr-noise-btn" id="sr-noise-stop" style="grid-column:1/-1;">🔇 停止</button>';

    // Insert after action bar
    var actionBar = _state.container.querySelector('.sr-action-bar');
    if (actionBar) {
      actionBar.parentNode.insertBefore(panel, actionBar.nextSibling);
    } else {
      _state.container.appendChild(panel);
    }

    panel.querySelectorAll('.sr-noise-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var noiseId = this.getAttribute('data-noise');
        if (noiseId) {
          _startNoise(noiseId);
          panel.querySelectorAll('.sr-noise-btn[data-noise]').forEach(function(b) { b.classList.remove('sr-active'); });
          this.classList.add('sr-active');
          _playClick();
        }
      });
    });

    var stopBtn = document.getElementById('sr-noise-stop');
    if (stopBtn) stopBtn.addEventListener('click', function() { _stopNoise(); panel.querySelectorAll('.sr-noise-btn').forEach(function(b) { b.classList.remove('sr-active'); }); _playClick(); });
  }

  /* ========================================================================
     CLOSE SUB-PANELS (breathe, noise, theme picker, quote)
     ======================================================================== */
  function _closeSubPanels() {
    _stopBreathe();
    var breathe = document.getElementById('sr-breathe-overlay');
    if (breathe) breathe.remove();

    // Keep noise running but remove panel
    var noisePanel = document.getElementById('sr-noise-panel');
    if (noisePanel) noisePanel.remove();

    var themePicker = document.getElementById('sr-theme-picker');
    if (themePicker) themePicker.remove();

    var quote = _state.container ? _state.container.querySelector('.sr-quote-popup') : null;
    if (quote) quote.remove();
  }

  /* ========================================================================
     16-GRID CELL CLICK HANDLERS
     ======================================================================== */
  function _handleCellClick(cellIndex) {
    _state.clickedCells[cellIndex] = true;

    switch(cellIndex) {
      case 1: // Heartbeat — speed up
        var cell1 = document.querySelector('.sr-cell-01');
        if (cell1) {
          cell1.classList.add('sr-cell-fast');
          _showToast('你的心肌细胞都在为你拼命 ❤️', 2000);
          setTimeout(function() { if (cell1) cell1.classList.remove('sr-cell-fast'); }, 1500);
        }
        break;

      case 2: // DNA — rainbow
        var cell2 = document.querySelector('.sr-cell-02');
        if (cell2) {
          cell2.classList.add('sr-cell-rainbow');
          _showToast('你的端粒正在为你续命 🧬', 2000);
          setTimeout(function() { if (cell2) cell2.classList.remove('sr-cell-rainbow'); }, 2000);
        }
        break;

      case 3: // Brain — cold knowledge
        var kn = COLD_KNOWLEDGE[Math.floor(Math.random() * COLD_KNOWLEDGE.length)];
        _showToast('🧠 ' + kn, 4000);
        break;

      case 4: // Syringe — fast push
        _showToast('💉 静脉推注：高分药水20ml 💯', 2500);
        break;

      case 5: // Stethoscope — heartbeat sound
        _playTone(60, 0.3, 'sine', 0.12);
        setTimeout(function() { _playTone(60, 0.3, 'sine', 0.12); }, 600);
        _showToast('🩺 听到了吗？那是未来的你在说谢谢', 2500);
        break;

      case 6: // Light — flash
        var cell6 = document.querySelector('.sr-cell-06');
        if (cell6) {
          for (var f = 0; f < 3; f++) {
            (function(d) {
              setTimeout(function() { if (cell6) cell6.style.opacity = '0.3'; }, d);
              setTimeout(function() { if (cell6) cell6.style.opacity = '1'; }, d + 100);
            })(f * 300);
          }
        }
        _playTone(1500, 0.08, 'sine', 0.1);
        _showToast('💡 无影灯下，你最耀眼', 2000);
        break;

      case 7: // Coffee — extra steam
        var cell7 = document.querySelector('.sr-cell-07');
        if (cell7) {
          for (var s = 0; s < 4; s++) {
            var p = document.createElement('div');
            p.className = 'sr-steam-particle';
            p.style.animationDelay = (s * 0.3) + 's';
            cell7.appendChild(p);
            setTimeout(function(el) { if (el.parentNode) el.remove(); }, 3000, p);
          }
        }
        _showToast('☕ 咖啡因正在占领你的突触', 2500);
        break;

      case 8: // Sleeping student — stretch
        var cell8 = document.querySelector('.sr-cell-08');
        if (cell8) {
          cell8.querySelector('.sr-cell-icon').style.transform = 'scaleY(1.2)';
          setTimeout(function() { if (cell8) cell8.querySelector('.sr-cell-icon').style.transform = ''; }, 400);
        }
        _state.sleepyClicks++;
        if (_state.sleepyClicks >= 10 && !_state.easterEggsFound.sleepy_10) {
          _showToast('😤 再点我考试就要挂了！', 3000);
          _unlockAchievement('sleepy_10');
          _state.sleepyClicks = 0;
        } else if (_state.sleepyClicks < 10) {
          _showToast('多巴胺充值成功，睡醒再战 😴', 2000);
        }
        break;

      case 9: // Stars — burst
        var cell9 = document.querySelector('.sr-cell-09');
        if (cell9) {
          for (var st = 0; st < 12; st++) {
            var star = document.createElement('div');
            star.className = 'sr-star-particle';
            star.style.left = Math.random() * 80 + '%';
            star.style.animationDelay = Math.random() * 0.5 + 's';
            cell9.appendChild(star);
            setTimeout(function(el) { if (el.parentNode) el.remove(); }, 2500, star);
          }
        }
        _showToast('✨ 许个愿吧，考试全会', 2500);
        break;

      case 10: // Bacteria — split
        _showToast('🦠 你的免疫系统正在为你加油', 2000);
        break;

      case 11: // Book — rapid page flip
        var cell11 = document.querySelector('.sr-cell-11');
        if (cell11) {
          cell11.querySelector('.sr-cell-icon').style.animation = 'sr-page-flip 0.3s ease-in-out 3';
          setTimeout(function() { if (cell11) cell11.querySelector('.sr-cell-icon').style.animation = ''; }, 1000);
        }
        _showToast('📖 这页考点，你已经拿捏', 2000);
        break;

      case 12: // Balloon — burst
        var cell12 = document.querySelector('.sr-cell-12');
        if (cell12) {
          cell12.querySelector('.sr-cell-icon').style.transform = 'scale(1.5)';
          cell12.querySelector('.sr-cell-icon').style.opacity = '0';
          setTimeout(function() {
            if (cell12) {
              cell12.querySelector('.sr-cell-icon').style.transform = '';
              cell12.querySelector('.sr-cell-icon').style.opacity = '';
            }
          }, 500);
        }
        _playBubblePop();
        _showToast('🎈 炸掉焦虑，轻装上阵', 2500);
        break;

      case 13: // Bubble wrap — create bubbles
        _renderBubbleWrap(document.querySelector('.sr-cell-13'));
        _playClick();
        break;

      case 14: // Pixel art — create drawing pad
        _renderPixelPad(document.querySelector('.sr-cell-14'));
        _playClick();
        break;

      case 15: // Ripple — concentric circles
        _playTone(432, 5, 'sine', 0.08);
        _showToast('🔔 前额叶已进入α波状态 (432Hz)', 3500);
        break;

      case 16: // Ice — crack
        var cell16 = document.querySelector('.sr-cell-16');
        if (cell16) {
          cell16.querySelector('.sr-cell-icon').style.transform = 'rotate(15deg)';
          cell16.querySelector('.sr-cell-icon').style.opacity = '0.4';
          setTimeout(function() {
            if (cell16) {
              cell16.querySelector('.sr-cell-icon').style.transform = '';
              cell16.querySelector('.sr-cell-icon').style.opacity = '';
            }
          }, 600);
        }
        _playTone(3000, 0.15, 'sawtooth', 0.06);
        _showToast('🧊 解压指数：██████████ 100%', 2500);
        break;
    }

    _playClick();
    _checkAllCellsClicked();
  }

  function _checkAllCellsClicked() {
    var allClicked = true;
    for (var i = 1; i <= 16; i++) {
      if (!_state.clickedCells[i]) { allClicked = false; break; }
    }
    if (allClicked && !_state.easterEggsFound.all_cells) {
      _unlockAchievement('all_cells');
    }
  }

  function _renderBubbleWrap(cellEl) {
    // Replace cell content with 4×4 bubble grid
    var existingGrid = cellEl.querySelector('.sr-bubble-grid');
    if (existingGrid) {
      existingGrid.remove();
      cellEl.querySelector('.sr-cell-icon').style.display = '';
      cellEl.querySelector('.sr-cell-label').style.display = '';
      return;
    }

    cellEl.querySelector('.sr-cell-icon').style.display = 'none';
    cellEl.querySelector('.sr-cell-label').style.display = 'none';

    var grid = document.createElement('div');
    grid.className = 'sr-bubble-grid';

    var totalBubbles = 16;
    var popped = 0;
    for (var i = 0; i < totalBubbles; i++) {
      var bubble = document.createElement('div');
      bubble.className = 'sr-bubble';
      bubble.addEventListener('click', function(e) {
        e.stopPropagation();
        if (this.classList.contains('sr-popped')) return;
        this.classList.add('sr-popped');
        _playBubblePop();
        popped++;
        if (popped >= totalBubbles) {
          _showToast('焦虑 -100% 🫧', 2000);
          setTimeout(function() {
            if (grid.parentNode) {
              grid.remove();
              cellEl.querySelector('.sr-cell-icon').style.display = '';
              cellEl.querySelector('.sr-cell-label').style.display = '';
            }
          }, 800);
        }
      });
      grid.appendChild(bubble);
    }
    cellEl.appendChild(grid);
  }

  function _renderPixelPad(cellEl) {
    var existingGrid = cellEl.querySelector('.sr-pixel-grid');
    if (existingGrid) {
      existingGrid.remove();
      cellEl.querySelector('.sr-cell-icon').style.display = '';
      cellEl.querySelector('.sr-cell-label').style.display = '';
      _state.currentPixelColor = (_state.currentPixelColor + 1) % _state.pixelColors.length;
      return;
    }

    cellEl.querySelector('.sr-cell-icon').style.display = 'none';
    cellEl.querySelector('.sr-cell-label').style.display = 'none';

    var grid = document.createElement('div');
    grid.className = 'sr-pixel-grid';

    for (var i = 0; i < 36; i++) {
      var pixel = document.createElement('div');
      pixel.className = 'sr-pixel';
      pixel.addEventListener('click', function(e) {
        e.stopPropagation();
        this.style.background = _state.pixelColors[_state.currentPixelColor];
      });
      // Double-click to clear
      pixel.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        var pixels = grid.querySelectorAll('.sr-pixel');
        for (var p = 0; p < pixels.length; p++) pixels[p].style.background = '';
      });
      grid.appendChild(pixel);
    }
    cellEl.appendChild(grid);
    _showToast('🎨 双击清空画板 · ' + _state.pixelColors.length + '色可选', 2500);
  }

  /* ========================================================================
     KEYBOARD EASTER EGGS
     ======================================================================== */
  function _initKeyboardEasterEggs() {
    document.addEventListener('keydown', function(e) {
      if (!_state.opened) return;
      // Only track printable characters + backspace
      if (e.key.length === 1) {
        _state.keyboardBuf += e.key;
      } else if (e.key === 'Backspace') {
        _state.keyboardBuf = _state.keyboardBuf.slice(0, -1);
        return;
      }
      // Keep buffer manageable
      if (_state.keyboardBuf.length > 30) _state.keyboardBuf = _state.keyboardBuf.slice(-20);

      // Check for easter egg codes
      if (_state.keyboardBuf.indexOf('麻醉必胜') >= 0) {
        _state.keyboardBuf = '';
        _triggerEggBisheng();
      } else if (_state.keyboardBuf.indexOf('丙泊酚') >= 0) {
        _state.keyboardBuf = '';
        _triggerEggBingbofu();
      } else if (_state.keyboardBuf.indexOf('999') >= 0) {
        _state.keyboardBuf = '';
        _triggerEgg999();
      }

      // Reset buffer timer
      if (_state.keyboardTimer) clearTimeout(_state.keyboardTimer);
      _state.keyboardTimer = setTimeout(function() { _state.keyboardBuf = ''; }, 3000);
    });
  }

  function _triggerEggBisheng() {
    _unlockAchievement('egg_bisheng');
    _playEgg();
    if (_state.container) {
      _state.container.style.filter = 'hue-rotate(0deg)';
      _state.container.style.transition = 'filter 5s linear';
      setTimeout(function() { _state.container.style.filter = 'hue-rotate(360deg)'; }, 50);
      setTimeout(function() { if (_state.container) { _state.container.style.filter = ''; _state.container.style.transition = ''; } }, 5500);
    }
    _showToast('🦄🌈 麻醉必胜！彩虹独角兽模式开启！', 5000);
  }

  function _triggerEggBingbofu() {
    _unlockAchievement('egg_bingbofu');
    _playEgg();
    if (_state.container) {
      var milk = document.createElement('div');
      milk.style.cssText = 'position:absolute;inset:0;z-index:50;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at center,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.5) 30%,transparent 70%);animation:sr-overlay-in 2s ease-out forwards;';
      _state.container.appendChild(milk);
      setTimeout(function() { if (milk.parentNode) milk.remove(); }, 3000);
    }
    _showToast('🥛 丙泊酚 — 牛奶状乳剂扩散中...', 3500);
  }

  function _triggerEgg999() {
    _unlockAchievement('egg_999');
    _playAlarm();
    if (_state.container) {
      _state.container.style.boxShadow = '0 0 60px rgba(239,68,68,0.6)';
      setTimeout(function() { if (_state.container) _state.container.style.boxShadow = ''; }, 3000);
    }
    _showToast('🚨 监护仪报警！滴滴滴——（按ESC关闭）', 4000);
  }

  /* ========================================================================
     MAIN RENDER
     ======================================================================== */
  function _renderHTML() {
    return '' +
      '<div class="sr-header">' +
        '<h3 class="sr-header-title">💉✨ 期末解压舱</h3>' +
        '<div class="sr-header-actions">' +
          '<button class="sr-close-btn" id="sr-close" title="关闭" type="button">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="sr-dashboard">' +
        '<div class="sr-stat-row">' +
          '<div class="sr-stat-chip"><div class="sr-stat-value" id="sr-stat-answered">-</div><div class="sr-stat-label">今日已刷</div></div>' +
          '<div class="sr-stat-chip"><div class="sr-stat-value" id="sr-stat-correct">-</div><div class="sr-stat-label">正确率</div></div>' +
          '<div class="sr-stat-chip"><div class="sr-stat-value" id="sr-stat-wrong">-</div><div class="sr-stat-label">错题数</div></div>' +
          '<div class="sr-stat-chip"><div class="sr-stat-value" id="sr-stat-subject">-</div><div class="sr-stat-label">当前科目</div></div>' +
        '</div>' +
        '<div class="sr-timer-row">' +
          '<span class="sr-timer-label">⏱️ 摸鱼倒计时</span>' +
          '<span class="sr-timer-display" id="sr-timer-display">05:00</span>' +
          '<input type="range" class="sr-timer-slider" id="sr-timer-slider" min="1" max="15" value="5" title="调整倒计时分钟数">' +
          '<button class="sr-timer-preset" data-min="5">5分</button>' +
          '<button class="sr-timer-preset" data-min="10">10分</button>' +
          '<button class="sr-timer-preset" data-min="15">15分</button>' +
        '</div>' +
      '</div>' +
      _renderGridHTML() +
      '<div class="sr-action-bar" id="sr-action-bar">' +
        '<button class="sr-action-btn" data-action="fireworks">🔥 全屏烟花</button>' +
        '<button class="sr-action-btn" data-action="breathe">🌬️ 呼吸训练</button>' +
        '<button class="sr-action-btn" data-action="noise">🎧 白噪音</button>' +
        '<button class="sr-action-btn" data-action="mute" id="sr-mute-btn">🔇 静音</button>' +
        '<button class="sr-action-btn" data-action="quote">💬 麻醉语录</button>' +
        '<button class="sr-action-btn" data-action="theme">🎨 主题换肤</button>' +
        '<button class="sr-action-btn" data-action="timer-start" id="sr-timer-btn">⏱️ 开始计时</button>' +
      '</div>';
  }

  function _renderGridHTML() {
    var cells = [
      { n: 1, icon: '🫀', label: '心跳' },
      { n: 2, icon: '🧬', label: 'DNA' },
      { n: 3, icon: '🧠', label: '冷知识' },
      { n: 4, icon: '💉', label: '推注' },
      { n: 5, icon: '🩺', label: '听诊' },
      { n: 6, icon: '💡', label: '无影灯' },
      { n: 7, icon: '☕', label: '咖啡' },
      { n: 8, icon: '😴', label: '补觉' },
      { n: 9, icon: '✨', label: '许愿' },
      { n: 10, icon: '🦠', label: '细菌' },
      { n: 11, icon: '📖', label: '翻书' },
      { n: 12, icon: '🎈', label: '气球' },
      { n: 13, icon: '🫧', label: '捏泡泡' },
      { n: 14, icon: '🎨', label: '涂鸦' },
      { n: 15, icon: '🔔', label: '432Hz' },
      { n: 16, icon: '🧊', label: '碎冰' }
    ];

    var html = '<div class="sr-grid" id="sr-grid">';
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      html += '<div class="sr-cell sr-cell-' + _pad2(c.n) + '" data-cell="' + c.n + '">' +
        '<span class="sr-cell-icon">' + c.icon + '</span>' +
        '<span class="sr-cell-label">' + c.label + '</span>' +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ========================================================================
     SWIPE-TO-CLOSE (mobile touch gesture)
     ======================================================================== */
  function _attachSwipeToClose(container) {
    var startY = 0;
    var moved = false;
    var threshold = 80; // px of downward swipe to close

    container.addEventListener('touchstart', function(e) {
      // Only track single-finger swipes from the top region
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      moved = false;
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
      if (e.touches.length !== 1) return;
      var deltaY = e.touches[0].clientY - startY;
      if (deltaY > 10) {
        moved = true;
        // Visual feedback: translate the container with the finger
        var resistance = Math.min(deltaY * 0.6, 120);
        container.style.transform = 'translateY(' + resistance + 'px)';
        container.style.transition = 'none';
      }
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      if (!moved) return;
      var deltaY = 0;
      if (e.changedTouches && e.changedTouches.length > 0) {
        deltaY = e.changedTouches[0].clientY - startY;
      }
      // Reset visual position
      container.style.transform = '';
      container.style.transition = 'transform 0.25s ease-out';
      if (deltaY > threshold) {
        MediCard.ScreenSR.close();
      }
    });
  }

  /* ========================================================================
     EVENT ATTACHMENT (delegation-based)
     ======================================================================== */
  function _attachEvents() {
    var container = _state.container;
    if (!container) return;

    // Close button — onclick property with DOM fallback
    var closeBtn = document.getElementById('sr-close');
    if (closeBtn) closeBtn.onclick = function() {
      if (MediCard.ScreenSR && MediCard.ScreenSR.close) { MediCard.ScreenSR.close(); }
      else { var ov = document.querySelector('.sr-overlay'); if (ov) ov.remove(); }
      return false;
    };

    // Grid cell clicks (delegation)
    var grid = document.getElementById('sr-grid');
    if (grid) {
      grid.addEventListener('click', function(e) {
        var cell = e.target.closest('.sr-cell');
        if (!cell) return;
        var cellNum = parseInt(cell.getAttribute('data-cell'), 10);
        if (cellNum) _handleCellClick(cellNum);
      });
    }

    // Action bar (delegation)
    var actionBar = document.getElementById('sr-action-bar');
    if (actionBar) {
      actionBar.addEventListener('click', function(e) {
        var btn = e.target.closest('.sr-action-btn');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        if (action) _handleAction(action, btn);
      });
    }

    // Timer preset buttons
    container.querySelectorAll('.sr-timer-preset').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var min = parseInt(this.getAttribute('data-min'), 10);
        if (min) _setCountdown(min);
        _playClick();
      });
    });

    // Timer slider
    var slider = document.getElementById('sr-timer-slider');
    if (slider) {
      slider.addEventListener('input', function() {
        _setCountdown(parseInt(this.value, 10));
      });
    }

    // ESC key to close
    document.addEventListener('keydown', _onKeyDown);
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape' && _state.opened) {
      // Close sub-panels first, then main overlay
      var breatheEl = document.getElementById('sr-breathe-overlay');
      var noisePanel = document.getElementById('sr-noise-panel');
      var themePicker = document.getElementById('sr-theme-picker');
      var quoteEl = _state.container ? _state.container.querySelector('.sr-quote-popup') : null;
      var eyeEl = _state.container ? _state.container.querySelector('.sr-eye-reminder') : null;

      if (eyeEl) { eyeEl.remove(); return; }
      if (breatheEl) { breatheEl.remove(); _stopBreathe(); return; }
      if (noisePanel) { noisePanel.remove(); return; }
      if (themePicker) { themePicker.remove(); return; }
      if (quoteEl) { quoteEl.remove(); return; }

      MediCard.ScreenSR.close();
    }
  }

  function _detachEvents() {
    document.removeEventListener('keydown', _onKeyDown);
  }

  function _handleAction(action, btn) {
    switch(action) {
      case 'fireworks':
        _showToast('🎆 烟花准备中... (此功能将在下一版本上线)', 2500);
        _playCombo();
        break;
      case 'breathe':
        _showBreatheGuide();
        break;
      case 'noise':
        _showNoisePanel();
        break;
      case 'mute':
        _toggleMute();
        var muteBtn = document.getElementById('sr-mute-btn');
        if (muteBtn) muteBtn.textContent = _isMuted() ? '🔊 取消静音' : '🔇 静音';
        _playClick();
        break;
      case 'quote':
        _showRandomQuote();
        _playClick();
        break;
      case 'theme':
        _showThemePicker();
        _playClick();
        break;
      case 'timer-start':
        if (_state.countdownTimer) {
          _stopCountdown();
          if (btn) btn.textContent = '⏱️ 开始计时';
        } else {
          _startCountdown();
          if (btn) btn.textContent = '⏸️ 暂停计时';
        }
        _playClick();
        break;
    }
  }

  /* ========================================================================
     CANVAS FIREWORKS (stub — full implementation in Phase 3)
     ======================================================================== */
  function _showFireworks() {
    if (!_state.container) return;
    _playCombo();
    _showToast('🎆 烟花秀！8秒', 8000);

    // Simple DOM-based "fireworks" — colored dots expanding from center
    var colors = ['#fbbf24', '#ef4444', '#06b6d4', '#a855f7', '#10b981', '#f97316'];
    for (var i = 0; i < 30; i++) {
      (function(delay, color) {
        setTimeout(function() {
          if (!_state.container) return;
          var dot = document.createElement('div');
          dot.style.cssText = 'position:absolute;z-index:20;pointer-events:none;width:8px;height:8px;border-radius:50%;background:' + color + ';' +
            'left:' + (20 + Math.random() * 60) + '%;top:' + (20 + Math.random() * 60) + '%;' +
            'transform:scale(0);animation:sr-firework-burst 1.2s ease-out forwards;';
          _state.container.appendChild(dot);
          setTimeout(function() { if (dot.parentNode) dot.remove(); }, 1300);
        }, delay);
      })(i * 80, colors[Math.floor(Math.random() * colors.length)]);
    }
  }

  /* ========================================================================
     PUBLIC API
     ======================================================================== */
  MediCard.ScreenSR = {
    show: function() {
      if (_state.opened) return;
      _state.opened = true;
      _safePlay(_playOpen);

      _state.theme = _loadTheme();

      var overlay = document.createElement('div');
      overlay.className = 'sr-overlay';
      overlay.setAttribute('data-theme', _state.theme);
      overlay.style.zIndex = '10000';
      _state.overlay = overlay;

      // Standalone close bar — fixed to viewport top, above everything
      var topBar = document.createElement('div');
      topBar.className = 'sr-topbar';
      topBar.id = 'sr-topbar';
      topBar.innerHTML = '<div class="sr-topbar-handle"></div>';
      topBar.onclick = function() {
        if (MediCard.ScreenSR && MediCard.ScreenSR.close) { MediCard.ScreenSR.close(); }
        else { var ov = document.querySelector('.sr-overlay'); if (ov) ov.remove(); }
        return false;
      };
      document.body.appendChild(topBar);
      _state.topBar = topBar;

      var container = document.createElement('div');
      container.className = 'sr-container';
      container.id = 'sr-container';
      container.innerHTML = _renderHTML();
      overlay.appendChild(container);
      _state.container = container;

      document.body.appendChild(overlay);

      _attachEvents();
      _startPolling();
      _startEyeCare();
      _setCountdown(5);

      _unlockAchievement('first_open');
    },

    close: function() {
      if (!_state.opened) return;

      _state.opened = false;

      try { _playClose(); } catch(e) {}
      try { _stopPolling(); } catch(e) {}
      try { _stopEyeCare(); } catch(e) {}
      try { _stopCountdown(); } catch(e) {}
      try { _stopBreathe(); } catch(e) {}
      try { _stopNoise(); } catch(e) {}
      try { _detachEvents(); } catch(e) {}

      // Remove top bar immediately
      var tb = _state.topBar;
      _state.topBar = null;
      if (tb && tb.parentNode) { try { tb.remove(); } catch(e) {} }

      // Remove overlay
      var ov = _state.overlay;
      _state.overlay = null;
      _state.container = null;

      if (ov && ov.parentNode) {
        try {
          ov.classList.add('sr-closing');
          setTimeout(function() {
            try { if (ov.parentNode) ov.remove(); } catch(e) {}
          }, 250);
        } catch(e) {
          try { ov.remove(); } catch(e2) {}
        }
      }
    },

    /** Open the capsule programmatically */
    open: function() { this.show(); }
  };

  /* ========================================================================
     FLOATING ENTRY BUTTON (created on module load)
     ======================================================================== */
  function _createFloatBtn() {
    var existing = document.querySelector('.sr-float-btn');
    if (existing) return;

    var btn = document.createElement('button');
    btn.className = 'sr-float-btn';
    btn.title = '期末解压舱';
    btn.setAttribute('aria-label', '打开期末解压舱');
    btn.innerHTML = '🫧<span class="sr-float-label">解压</span>';

    btn.addEventListener('click', function() {
      MediCard.ScreenSR.show();
    });

    document.body.appendChild(btn);

    // Auto-reminder after 30 minutes of being on the page
    var reminderTimer = null;
    function _scheduleReminder() {
      if (reminderTimer) clearTimeout(reminderTimer);
      reminderTimer = setTimeout(function() {
        if (_state.opened) return;
        var bubble = document.createElement('div');
        bubble.className = 'sr-float-reminder';
        bubble.textContent = '休息一下吧 🫧';
        btn.appendChild(bubble);
        setTimeout(function() {
          if (bubble.parentNode) bubble.remove();
          _scheduleReminder();
        }, 8000);
      }, 1800000); // 30 minutes
    }
    _scheduleReminder();

    // Reset reminder on page visibility change
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && reminderTimer) {
        clearTimeout(reminderTimer);
        _scheduleReminder();
      }
    });
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */
  function _init() {
    _createFloatBtn();
    _initKeyboardEasterEggs();
  }

  // Run on script load (defer ensures DOM is ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  console.log('[SR] Stress Relief Capsule module loaded (V1.0)');
})();
