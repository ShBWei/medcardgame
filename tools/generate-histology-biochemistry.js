/**
 * Parse 组胚题库.txt → histology-embryology.js
 * Parse 生化题库.txt → biochemistry.js
 * Full extraction with multi-choice support, difficulty classification, game format.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SUBJECTS_DIR = path.join(ROOT, 'src/modules/question-bank/subjects');

const SOURCES = [
  {
    file: '组胚题库.txt',
    subjectId: 'histology-embryology',
    subjectName: '组织与胚胎学',
    output: path.join(SUBJECTS_DIR, 'histology-embryology.js'),
  },
  {
    file: '生化题库.txt',
    subjectId: 'biochemistry',
    subjectName: '生物化学',
    output: path.join(SUBJECTS_DIR, 'biochemistry.js'),
  },
];

// ── Card names ───────────────────────────────────────────────────
const cardNames = {
  'histology-embryology': {
    attack: [
      '上皮组织攻击','结缔组织基质','肌节收缩','神经元信号','红细胞运输',
      '肾小球滤过','肝小叶代谢','精原细胞分裂','卵泡发育','突触传递',
      '内胚层分化','神经管闭合','巨噬细胞吞噬','肾单位功能','平滑肌收缩',
      '受精过程','胎盘屏障','成牙本质细胞','溶菌酶防御','胰岛内分泌',
      '肥大细胞脱颗粒','微绒毛吸收','心肌间盘连接','肺泡表面活性物质',
      '腺垂体分泌','造血干细胞动员','纤毛清除','血小板止血','胃底腺分泌',
    ],
    defense: [
      '基底膜屏障','软骨支撑','骨组织坚固','表皮屏障','血睾屏障',
      '淋巴结过滤','脾脏滤血','血脑屏障','弹性纤维回缩','黑色素防护',
      '浆细胞抗体','杯状细胞黏液','网状纤维支撑','紧密连接防护','基膜滤过',
    ],
    heal: [
      '白细胞防御','胸腺免疫训练','成骨细胞修复','胚泡着床','维甲酸信号',
      '肺泡表面活性物质','溶菌酶防御','肝细胞再生','干细胞分化','组织修复',
      '潘氏细胞防御','血管新生','软骨再生','神经修复','免疫重建',
    ],
    special: [
      '显微镜检查','免疫组化染色','组织培养','电镜观察','原位杂交',
      '特殊染色','组织化学','胚胎诱导','细胞分化','形态发生',
      '组织芯片','凋亡检测','细胞示踪','基因敲除','谱系追踪',
    ],
  },
  biochemistry: {
    attack: [
      '肽键断裂','蛋白质变性','酶活性抑制','糖代谢阻断','氧化磷酸化解耦联',
      '核酸水解','脂质过氧化','自由基攻击','代谢毒物','氨基酸脱氨',
      'DNA损伤','RNA干扰','蛋白酶体降解','糖异生抑制','脂肪酸氧化',
    ],
    defense: [
      '分子伴侣保护','抗氧化防御','DNA修复','蛋白质二硫键异构','热休克应答',
      '谷胱甘肽还原','超氧化物歧化','金属硫蛋白','分子筛层析','离子交换',
    ],
    heal: [
      '蛋白质复性','酶活性恢复','代谢调节','维生素补给','辅酶再生',
      '能量代谢修复','糖原合成','氨基酸补充','核苷酸修复','膜脂修复',
    ],
    special: [
      '电泳分离','层析纯化','PCR扩增','基因重组','光谱分析',
      '质谱鉴定','X射线衍射','核磁共振','序列比对','分子对接',
      '印迹技术','离心分离','同位素示踪','酶联免疫','荧光标记',
    ],
  },
};

// ── Card effects ──────────────────────────────────────────────────
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

// ── Chapter → cardType mapping (balanced distribution) ──────────
const cardTypeCycle = ['attack', 'attack', 'defense', 'heal', 'special', 'attack', 'defense'];

function getChapterCardType(subjectId, chapterName, questionIndex) {
  // Use round-robin within each chapter for balanced card type distribution
  return cardTypeCycle[questionIndex % cardTypeCycle.length];
}

// ── Difficulty scoring ────────────────────────────────────────────
function scoreComplexity(q, item) {
  let score = q.length / 25;
  // Answer is multi-choice
  if (item.answer && item.answer.length > 1) score += 1.5;
  // Long options suggest complex content
  const optList = item.opts || [];
  const avgOptLen = optList.length > 0 ? optList.reduce((s, o) => s + o.length, 0) / optList.length : 0;
  if (avgOptLen > 15) score += 0.5;
  if (avgOptLen > 25) score += 0.5;
  // Technical terms
  const techTerms = /受体|信号|通路|机制|基因|表达|调控|磷酸化|抑制|激活|突变|编码|合成|降解|转运|代谢|氧化|还原/;
  if (techTerms.test(q)) score += 0.3;
  // Clinical relevance
  if (/病|症|畸形|缺陷|异常|损伤|坏死|癌|瘤|炎/.test(q)) score += 0.4;
  // Numerical/quantitative
  if (/\d+/.test(q)) score += 0.2;
  return score;
}

// ── Parse source file ─────────────────────────────────────────────
function parseSource(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  let currentChapter = '';
  const chapters = {};
  let errors = [];

  for (const line of lines) {
    // Chapter header
    const chMatch = line.match(/^##\s+(.+)/);
    if (chMatch) {
      currentChapter = chMatch[1].trim();
      if (!chapters[currentChapter]) chapters[currentChapter] = [];
      continue;
    }

    // Skip empty lines and separators
    if (line.trim() === '' || line.trim() === '---') continue;

    // Parse question line: question|optA|optB|optC|optD|optE|answer
    const parts = line.split('|');
    if (parts.length < 3) continue;

    const answer = parts[parts.length - 1].trim().toUpperCase();
    const opts = parts.slice(1, parts.length - 1).map(s => s.trim()).filter(s => s.length > 0);
    const question = parts[0].trim();

    // Validate
    if (!question || opts.length < 2) {
      errors.push(`SKIP (empty fields): ${line.substring(0, 60)}...`);
      continue;
    }

    // Answer validation: should be letters A-E
    if (!/^[A-E]+$/.test(answer)) {
      errors.push(`SKIP (bad answer "${answer}"): ${question.substring(0, 40)}...`);
      continue;
    }

    // Validate answer indices exist in options
    const labels = 'ABCDEFGHIJ';
    let allValid = true;
    for (const ch of answer) {
      const idx = labels.indexOf(ch);
      if (idx < 0 || idx >= opts.length) {
        errors.push(`ANSWER MISMATCH: "${answer}" but only ${opts.length} options for: ${question.substring(0, 40)}...`);
        allValid = false;
        break;
      }
    }
    if (!allValid) continue;

    // Check for duplicate/near-duplicate options
    const uniqueOpts = new Set(opts.map(o => o.replace(/^[A-E][.、\s]+/, '').trim()));
    if (uniqueOpts.size < opts.length && opts.length > 2) {
      // Only flag if serious (all but one are unique)
    }

    if (!chapters[currentChapter]) chapters[currentChapter] = [];
    chapters[currentChapter].push({
      q: question,
      opts: opts,
      answer: answer,
      multiChoice: answer.length > 1,
    });
  }

  return { chapters, errors };
}

// ── Generate module ───────────────────────────────────────────────
function esc(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '');
}

function generateModule(subjectId, subjectName, chapters, errors) {
  const names = cardNames[subjectId];

  // Flatten all questions with metadata
  const allQs = [];
  for (const [chName, qs] of Object.entries(chapters)) {
    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi];
      const ct = getChapterCardType(subjectId, chName, qi);
      allQs.push({
        ...q,
        chapter: chName,
        cardType: ct,
        _score: scoreComplexity(q.q, q),
      });
    }
  }

  // Percentile-based difficulty
  const scores = allQs.map(q => q._score).sort((a, b) => b - a);
  const p95 = scores[Math.floor(scores.length * 0.05)] || 100;
  const p80 = scores[Math.floor(scores.length * 0.20)] || 10;
  const p50 = scores[Math.floor(scores.length * 0.50)] || 3;

  console.log(`  Score thresholds — L: >=${p95.toFixed(1)}, E: >=${p80.toFixed(1)}, R: >=${p50.toFixed(1)}`);

  for (const q of allQs) {
    if (q._score >= p95) q.difficulty = 'legendary';
    else if (q._score >= p80) q.difficulty = 'epic';
    else if (q._score >= p50) q.difficulty = 'rare';
    else q.difficulty = 'common';
    delete q._score;
  }

  // Shuffle within difficulty buckets
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

  // Sort: legendary first, then epic, rare, common
  const sorted = [];
  for (const diff of ['legendary', 'epic', 'rare', 'common']) {
    sorted.push(...byDiff[diff]);
  }

  // Generate output
  const cnIdx = { attack: 0, defense: 0, heal: 0, special: 0 };
  const idNums = {};
  const labels = 'ABCDEFGHIJ';

  const out = [];
  out.push('/**');
  out.push(' * ' + subjectName + ' 题目集 — ' + sorted.length + '题 (从教材习题集提取)');
  out.push(' * 难度分布: common(' + byDiff.common.length + ') / rare(' + byDiff.rare.length + ') / epic(' + byDiff.epic.length + ') / legendary(' + byDiff.legendary.length + ')');
  out.push(' */');
  out.push('(function() {');
  out.push('  var MediCard = window.MediCard || {};');
  out.push('  MediCard.QuestionBank = MediCard.QuestionBank || {};');
  out.push('');
  out.push('  MediCard.QuestionBank[\'' + subjectId + '\'] = [');

  for (const item of sorted) {
    const diff = item.difficulty;
    if (!idNums[diff]) idNums[diff] = 0;
    idNums[diff]++;

    const diffPrefix = { legendary: 'lege', epic: 'epic', rare: 'rare', common: 'comm' };
    const id = subjectId.substring(0, 6) + '-' + diffPrefix[diff] + '-' + String(idNums[diff]).padStart(4, '0');

    const ct = item.cardType;
    const cn = names[ct][cnIdx[ct] % names[ct].length];
    cnIdx[ct]++;
    const { ec, ce } = cardEffects[ct][diff];

    // Format options with labels
    const fOpts = item.opts.map((o, i) => labels[i] + '. ' + o);

    // Answer — array for multi-choice, single for single-choice
    const ansArray = item.answer.split('');

    // Generate explanation
    const correctTexts = ansArray.map(ch => {
      const idx = labels.indexOf(ch);
      return idx >= 0 && idx < item.opts.length ? item.opts[idx] : '';
    }).filter(Boolean).join('；');
    const exp = '正确答案为' + item.answer + '：' + correctTexts + '。本题考察' + item.chapter + '相关知识。';

    const obj = {
      id: id,
      subject: subjectName,
      subjectId: subjectId,
      difficulty: diff,
      questionType: item.multiChoice ? 'multiple' : 'single',
      cardType: ct,
      cardName: cn,
      energyCost: ec,
      cardEffect: ce,
      question: esc(item.q),
      options: fOpts.map(o => esc(o)),
      correctAnswers: ansArray,
      explanation: esc(exp),
      textbookReference: '《' + subjectName + '》教材习题集',
      knowledgePoint: item.chapter,
      tags: [subjectName, item.chapter],
      chapter: item.chapter,
    };

    out.push('    ' + JSON.stringify(obj) + ',');
  }

  out.push('  ];');
  out.push('})();');
  out.push('');

  return { output: out.join('\n'), stats: { total: sorted.length, byDiff, sorted } };
}

// ── Main ──────────────────────────────────────────────────────────
console.log('='.repeat(60));
console.log('Generating Histology/Embryology & Biochemistry Question Banks');
console.log('='.repeat(60));

for (const src of SOURCES) {
  const srcPath = path.join(ROOT, src.file);
  console.log('\n📖 Parsing ' + src.file + '...');

  if (!fs.existsSync(srcPath)) {
    console.error('  ❌ Source file not found: ' + srcPath);
    continue;
  }

  const { chapters, errors } = parseSource(srcPath);
  const totalQ = Object.values(chapters).reduce((s, arr) => s + arr.length, 0);
  console.log('  Chapters: ' + Object.keys(chapters).length + ', Questions: ' + totalQ);

  if (errors.length > 0) {
    console.log('  ⚠️  Parse errors (' + errors.length + '):');
    errors.forEach(e => console.log('    ' + e));
  }

  const { output, stats } = generateModule(src.subjectId, src.subjectName, chapters, errors);

  // Write output
  fs.writeFileSync(src.output, output, 'utf-8');
  console.log('  ✅ Written ' + stats.total + ' questions to ' + path.basename(src.output));

  // Stats
  const diffCounts = {};
  const ctCounts = {};
  stats.sorted.forEach(q => {
    diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
    ctCounts[q.cardType] = (ctCounts[q.cardType] || 0) + 1;
  });
  console.log('  Difficulty: ' + JSON.stringify(diffCounts));
  console.log('  Card types: ' + JSON.stringify(ctCounts));

  // Multi-choice count
  const multiCount = stats.sorted.filter(q => q.multiChoice).length;
  if (multiCount > 0) console.log('  Multi-choice: ' + multiCount + ' questions');

  // Report any multi-choice questions with bad answer format
  const badMulti = stats.sorted.filter(q => q.multiChoice && q.answer.length > q.opts.length);
  if (badMulti.length > 0) {
    console.log('  ⚠️  Potential multi-choice issues: ' + badMulti.length);
    badMulti.slice(0, 5).forEach(q => console.log('    Answer=' + q.answer + ' opts=' + q.opts.length + ' : ' + q.q.substring(0, 50)));
  }
}

console.log('\n' + '='.repeat(60));
console.log('Done!');
console.log('='.repeat(60));
