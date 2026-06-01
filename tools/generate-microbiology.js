/**
 * Parse 微生物学题库.txt → microbiology.js (ALL questions, inline object format like physiology.js)
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', '微生物学题库.txt');
const TARGET = path.join(__dirname, '..', 'src/modules/question-bank/subjects/microbiology.js');

// ── Parse source ──────────────────────────────────────────────
const raw = fs.readFileSync(SOURCE, 'utf-8');
const lines = raw.split(/\r?\n/);

let currentChapter = '';
const chapters = {};

for (const line of lines) {
  const chMatch = line.match(/^#{1,4}\s+(第[一二三四五六七八九十百]+章\s+.+)/);
  if (chMatch) {
    currentChapter = chMatch[1].trim();
    if (!chapters[currentChapter]) chapters[currentChapter] = [];
    continue;
  }
  if (line === '---' || line.trim() === '') continue;
  const parts = line.split('||');
  if (parts.length >= 3) {
    const answer = parts[parts.length - 1].trim();
    const opts = parts.slice(1, parts.length - 1).map(s => s.trim());
    const question = parts[0].trim();
    const fixedQ = question.replace(/^-(\d)/, '$1');
    if (fixedQ && opts.length >= 2 && answer.length <= 2) {
      if (!chapters[currentChapter]) chapters[currentChapter] = [];
      chapters[currentChapter].push({ q: fixedQ, opts, answer: answer.toUpperCase() });
    }
  }
}

const totalQuestions = Object.values(chapters).reduce((s, arr) => s + arr.length, 0);
console.log(`Parsed ${Object.keys(chapters).length} chapters, ${totalQuestions} questions`);

// ── Chapter metadata ──────────────────────────────────────────
const chapterMeta = {
  '第一章':   { kp:'细菌形态与结构',   ref:'《医学微生物学》第1章',   ct:'attack',  subject:'细菌学' },
  '第二章':   { kp:'细菌生理',         ref:'《医学微生物学》第2章',   ct:'defense', subject:'细菌学' },
  '第三章':   { kp:'噬菌体',           ref:'《医学微生物学》第3章',   ct:'special', subject:'细菌学' },
  '第四章':   { kp:'细菌遗传与变异',   ref:'《医学微生物学》第4章',   ct:'special', subject:'细菌学' },
  '第五章':   { kp:'细菌耐药性',       ref:'《医学微生物学》第5章',   ct:'defense', subject:'细菌学' },
  '第六章':   { kp:'细菌感染与免疫',   ref:'《医学微生物学》第6章',   ct:'attack',  subject:'细菌学' },
  '第八章':   { kp:'病原性球菌',       ref:'《医学微生物学》第8章',   ct:'attack',  subject:'细菌学' },
  '第九章':   { kp:'肠杆菌科',         ref:'《医学微生物学》第9章',   ct:'attack',  subject:'细菌学' },
  '第十章':   { kp:'弧菌属',           ref:'《医学微生物学》第10章',  ct:'attack',  subject:'细菌学' },
  '第十一章': { kp:'螺杆菌属',         ref:'《医学微生物学》第11章',  ct:'heal',    subject:'细菌学' },
  '第十二章': { kp:'厌氧性细菌',       ref:'《医学微生物学》第12章',  ct:'attack',  subject:'细菌学' },
  '第十三章': { kp:'分枝杆菌属',       ref:'《医学微生物学》第13章',  ct:'defense', subject:'细菌学' },
  '第十四章': { kp:'嗜血杆菌属',       ref:'《医学微生物学》第14章',  ct:'heal',    subject:'细菌学' },
  '第十五章': { kp:'动物源性细菌',     ref:'《医学微生物学》第15章',  ct:'attack',  subject:'细菌学' },
  '第十七章': { kp:'放线菌',           ref:'《医学微生物学》第17章',  ct:'special', subject:'细菌学' },
  '第十八章': { kp:'支原体',           ref:'《医学微生物学》第18章',  ct:'special', subject:'其他微生物' },
  '第十九章': { kp:'立克次体',         ref:'《医学微生物学》第19章',  ct:'attack',  subject:'其他微生物' },
  '第二十章': { kp:'衣原体',           ref:'《医学微生物学》第20章',  ct:'special', subject:'其他微生物' },
  '第二十一章':{ kp:'螺旋体',          ref:'《医学微生物学》第21章',  ct:'heal',    subject:'其他微生物' },
  '第二十二章':{ kp:'病毒基本性状',    ref:'《医学微生物学》第22章',  ct:'attack',  subject:'病毒学' },
  '第二十三章':{ kp:'病毒感染与免疫',  ref:'《医学微生物学》第23章',  ct:'defense', subject:'病毒学' },
  '第二十四章':{ kp:'病毒检查与防治',  ref:'《医学微生物学》第24章',  ct:'special', subject:'病毒学' },
  '第二十五章':{ kp:'呼吸道病毒',      ref:'《医学微生物学》第25章',  ct:'attack',  subject:'病毒学' },
  '第二十六章':{ kp:'肠道病毒',        ref:'《医学微生物学》第26章',  ct:'attack',  subject:'病毒学' },
  '第二十七章':{ kp:'急性胃肠炎病毒',  ref:'《医学微生物学》第27章',  ct:'heal',    subject:'病毒学' },
  '第二十八章':{ kp:'肝炎病毒',        ref:'《医学微生物学》第28章',  ct:'defense', subject:'病毒学' },
  '第二十九章':{ kp:'虫媒病毒',        ref:'《医学微生物学》第29章',  ct:'attack',  subject:'病毒学' },
  '第三十章':  { kp:'出血热病毒',      ref:'《医学微生物学》第30章',  ct:'attack',  subject:'病毒学' },
  '第三十一章':{ kp:'疱疹病毒',        ref:'《医学微生物学》第31章',  ct:'special', subject:'病毒学' },
  '第三十二章':{ kp:'逆转录病毒',      ref:'《医学微生物学》第32章',  ct:'attack',  subject:'病毒学' },
  '第三十三章':{ kp:'其他病毒与朊粒',  ref:'《医学微生物学》第33-34章',ct:'attack', subject:'病毒学' },
  '第三十四章':{ kp:'朊粒',            ref:'《医学微生物学》第34章',  ct:'defense', subject:'病毒学' },
  '第三十五章':{ kp:'真菌学总论',      ref:'《医学微生物学》第35章',  ct:'heal',    subject:'真菌学' },
  '第三十六章':{ kp:'主要病原性真菌',  ref:'《医学微生物学》第36章',  ct:'attack',  subject:'真菌学' },
};

// ── Difficulty classification (scoring + percentile-based) ────
function scoreComplexity(q) {
  let score = q.length / 30; // base: length normalized
  if (/\d+岁/.test(q) || /患儿|婴儿|新生儿|幼儿/.test(q)) score += 1.5;
  if (/入院|查体|体检|就诊|急诊/.test(q)) score += 1.0;
  if (/WBC|HB|ALT|AST|PLT|血常规|实验室|脑脊液|X线|CT|培养|PCR|ELISA/.test(q)) score += 1.0;
  if (/诊断|治疗|感染|病原|致病|机制/.test(q)) score += 0.3;
  if (q.length > 80) score += 0.5;
  if (q.length > 120) score += 0.5;
  return score;
}

function classifyDiffByScore(q, thresholdL, thresholdE, thresholdR) {
  const s = scoreComplexity(q);
  if (s >= thresholdL) return 'legendary';
  if (s >= thresholdE) return 'epic';
  if (s >= thresholdR) return 'rare';
  return 'common';
}

// ── Card effect table (matching physiology.js values) ─────────
const cardEffects = {
  attack: {
    common:    { ec: 1, ce: '造成2点伤害' },
    rare:      { ec: 2, ce: '造成3点伤害' },
    epic:      { ec: 3, ce: '造成4点伤害' },
    legendary: { ec: 4, ce: '造成5点伤害' },
  },
  defense: {
    common:    { ec: 1, ce: '获得2点护盾' },
    rare:      { ec: 2, ce: '获得3点护盾' },
    epic:      { ec: 3, ce: '获得4点护盾' },
    legendary: { ec: 4, ce: '获得5点护盾' },
  },
  heal: {
    common:    { ec: 1, ce: '恢复2点HP' },
    rare:      { ec: 2, ce: '恢复3点HP' },
    epic:      { ec: 3, ce: '恢复4点HP' },
    legendary: { ec: 4, ce: '恢复5点HP' },
  },
  special: {
    common:    { ec: 1, ce: '摸1张牌' },
    rare:      { ec: 2, ce: '摸2张牌' },
    epic:      { ec: 3, ce: '造成3点伤害并摸1张牌' },
    legendary: { ec: 4, ce: '造成4点伤害并摸2张牌' },
  },
};

// ── Card names (microbiology-themed) ──────────────────────────
const cardNames = {
  attack: [
    '微生物精准攻击','病原体定点清除','抗生素冲击','细菌毒素爆发',
    '免疫防线击破','致病因子打击','传染源清除','抗微生物出击',
    '免疫清除','毒力因子打击','病毒侵袭','真菌感染',
    '内毒素释放','外毒素攻击','病原菌入侵',
  ],
  defense: [
    '黏膜屏障','吞噬细胞防御','抗体中和','补体激活',
    '免疫记忆防护','固有免疫屏障','适应性免疫应答','免疫球蛋白防护',
    '细胞免疫','体液免疫',
  ],
  heal: [
    '微生态修复','菌群平衡','益生菌补给','细胞修复',
    '免疫重建','感染康复治疗','抗感染修复','黏膜修复',
  ],
  special: [
    '噬菌体策略','基因重组','耐药性分析','病毒干扰',
    '分子模拟','微生物检查法','病原体检测','精准诊断',
    '血清学检测','核酸检测',
  ],
};

// ── Build all questions ───────────────────────────────────────
const allQs = [];
for (const [chName, qs] of Object.entries(chapters)) {
  for (const q of qs) {
    const chKey = Object.keys(chapterMeta).find(k => chName.startsWith(k));
    const meta = chapterMeta[chKey] || { kp: '微生物学', ref: '《医学微生物学》', ct: 'attack', subject: '微生物学' };
    allQs.push({
      ...q,
      chapter: chName,
      _score: scoreComplexity(q.q),
      cardType: meta.ct,
      knowledgePoint: meta.kp,
      textbookRef: meta.ref,
      subject: meta.subject,
    });
  }
}

// Percentile-based difficulty assignment (matching physiology ratios ~5/15/30/50)
const scores = allQs.map(q => q._score).sort((a, b) => b - a);
const p95 = scores[Math.floor(scores.length * 0.05)];
const p80 = scores[Math.floor(scores.length * 0.20)];
const p50 = scores[Math.floor(scores.length * 0.50)];

console.log(`Score thresholds — legendary: >=${p95.toFixed(1)}, epic: >=${p80.toFixed(1)}, rare: >=${p50.toFixed(1)}`);

for (const q of allQs) {
  if (q._score >= p95) q.difficulty = 'legendary';
  else if (q._score >= p80) q.difficulty = 'epic';
  else if (q._score >= p50) q.difficulty = 'rare';
  else q.difficulty = 'common';
  delete q._score;
}

// ── Shuffle within difficulty buckets for variety ─────────────
const byDiff = { legendary: [], epic: [], rare: [], common: [] };
for (const q of allQs) {
  byDiff[q.difficulty].push(q);
}
for (const d of Object.keys(byDiff)) {
  const arr = byDiff[d];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Sort: legendary first, then epic, rare, common ────────────
const diffOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
const sorted = [];
for (const diff of ['legendary', 'epic', 'rare', 'common']) {
  sorted.push(...byDiff[diff]);
}

// ── Generate module ────────────────────────────────────────────
function esc(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '');
}

const cnIdx = { attack: 0, defense: 0, heal: 0, special: 0 };
const idNums = { legendary: 0, epic: 0, rare: 0, common: 0 };
const diffIdPrefix = { legendary: 'lege', epic: 'epic', rare: 'rare', common: 'comm' };
const labels = 'ABCDEFGHIJ';

const out = [];
out.push('/**');
out.push(' * 医学微生物 题目集 — ' + sorted.length + '题 (从教材习题集提取)');
out.push(' * 难度分布: common(' + byDiff.common.length + ') / rare(' + byDiff.rare.length + ') / epic(' + byDiff.epic.length + ') / legendary(' + byDiff.legendary.length + ')');
out.push(' * 涵盖: 细菌学 / 病毒学 / 真菌学及其他微生物');
out.push(' */');
out.push('(function() {');
out.push('  var MediCard = window.MediCard || {};');
out.push('  MediCard.QuestionBank = MediCard.QuestionBank || {};');
out.push('');
out.push('  MediCard.QuestionBank[\'microbiology\'] = [');

for (const item of sorted) {
  const diff = item.difficulty;
  idNums[diff]++;
  const id = 'micro-' + diffIdPrefix[diff] + '-' + String(idNums[diff]).padStart(3, '0');

  const ct = item.cardType;
  const cn = cardNames[ct][cnIdx[ct] % cardNames[ct].length];
  cnIdx[ct]++;
  const { ec, ce } = cardEffects[ct][diff];

  // Options with A. B. C. D. E. labels
  const fOpts = item.opts.map((o, i) => labels[i] + '. ' + o);

  // Answer
  const ansIdx = labels.indexOf(item.answer);
  const correctText = ansIdx >= 0 && ansIdx < item.opts.length ? item.opts[ansIdx] : ('选项' + item.answer);

  // Explanation
  const exp = '正确答案为' + item.answer + '：' + correctText + '。本题考察' + item.knowledgePoint + '相关知识。';

  // Build inline object
  const obj = {
    id: id,
    subject: '医学微生物',
    subjectId: 'microbiology',
    difficulty: diff,
    questionType: 'single',
    cardType: ct,
    cardName: cn,
    energyCost: ec,
    cardEffect: ce,
    question: esc(item.q),
    options: fOpts.map(o => esc(o)),
    correctAnswers: [item.answer],
    explanation: esc(exp),
    textbookReference: item.textbookRef,
    knowledgePoint: item.knowledgePoint,
    tags: [item.subject, item.knowledgePoint],
    chapter: item.chapter,
  };

  out.push('    ' + JSON.stringify(obj) + ',');
}

out.push('  ];');
out.push('})();');

fs.writeFileSync(TARGET, out.join('\n') + '\n', 'utf-8');

// ── Stats ──────────────────────────────────────────────────────
const diffCounts = {};
sorted.forEach(q => diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1);
const subjCounts = {};
sorted.forEach(q => subjCounts[q.subject] = (subjCounts[q.subject] || 0) + 1);
const ctCounts = {};
sorted.forEach(q => ctCounts[q.cardType] = (ctCounts[q.cardType] || 0) + 1);

console.log(`Written ${sorted.length} questions to ${TARGET}`);
console.log('Difficulty:', diffCounts);
console.log('Subjects:', subjCounts);
console.log('Card types:', ctCounts);
console.log('Done!');
