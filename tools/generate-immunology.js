/**
 * Parse 免疫学题库.txt → immunology.js
 * Extracts ALL questions from the immunology question bank text file
 * and formats them into the game's question format.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', '免疫学题库.txt');
const TARGET = path.join(__dirname, '..', 'src/modules/question-bank/subjects/immunology.js');

const raw = fs.readFileSync(SOURCE, 'utf-8');
const lines = raw.split(/\r?\n/);

// ── Chapter metadata mapping ───────────────────────────────────
const chapterMeta = {
  '第四章': { kp:'抗体',         ref:'《医学免疫学》第4章',  ct:'defense', subject:'免疫分子', tags:['抗体','免疫分子'] },
  '第三章': { kp:'抗原',         ref:'《医学免疫学》第3章',  ct:'attack',  subject:'免疫分子', tags:['抗原','免疫分子'] },
  '第二章': { kp:'免疫器官和组织', ref:'《医学免疫学》第2章',  ct:'special', subject:'免疫系统', tags:['免疫器官','免疫组织'] },
  '第五章': { kp:'补体系统',     ref:'《医学免疫学》第5章',  ct:'attack',  subject:'免疫分子', tags:['补体','免疫分子'] },
  '第六章': { kp:'细胞因子',     ref:'《医学免疫学》第6章',  ct:'special', subject:'免疫分子', tags:['细胞因子','免疫分子'] },
  '第七章': { kp:'白细胞分化抗原和黏附分子', ref:'《医学免疫学》第7章', ct:'defense', subject:'免疫分子', tags:['白细胞分化抗原','黏附分子'] },
  '第八章': { kp:'主要组织相容性复合体', ref:'《医学免疫学》第8章', ct:'special', subject:'免疫分子', tags:['MHC','免疫分子'] },
  '第九章': { kp:'B淋巴细胞',    ref:'《医学免疫学》第9章',  ct:'defense', subject:'免疫细胞', tags:['B细胞','免疫细胞'] },
  '第十章': { kp:'T淋巴细胞',    ref:'《医学免疫学》第10章', ct:'attack',  subject:'免疫细胞', tags:['T细胞','免疫细胞'] },
  '第十一章':{ kp:'抗原提呈细胞', ref:'《医学免疫学》第11章', ct:'special', subject:'免疫细胞', tags:['抗原提呈','免疫细胞'] },
  '第十二章':{ kp:'T细胞免疫应答', ref:'《医学免疫学》第12章', ct:'attack', subject:'免疫应答', tags:['T细胞','适应性免疫'] },
  '第十三章':{ kp:'B细胞免疫应答', ref:'《医学免疫学》第13章', ct:'defense', subject:'免疫应答', tags:['B细胞','适应性免疫'] },
  '第十四章':{ kp:'固有免疫系统', ref:'《医学免疫学》第14章', ct:'defense', subject:'免疫应答', tags:['固有免疫','天然免疫'] },
  '第十五章':{ kp:'黏膜免疫',    ref:'《医学免疫学》第15章', ct:'special', subject:'免疫系统', tags:['黏膜免疫','局部免疫'] },
  '第十六章':{ kp:'免疫耐受',    ref:'《医学免疫学》第16章', ct:'special', subject:'免疫调节', tags:['免疫耐受','免疫调节'] },
  '第十七章':{ kp:'免疫调节',    ref:'《医学免疫学》第17章', ct:'special', subject:'免疫调节', tags:['免疫调节'] },
  '第十八章':{ kp:'超敏反应',    ref:'《医学免疫学》第18章', ct:'attack',  subject:'免疫病理', tags:['超敏反应','免疫病理'] },
  '第十九章':{ kp:'自身免疫病',  ref:'《医学免疫学》第19章', ct:'heal',    subject:'免疫病理', tags:['自身免疫病','免疫病理'] },
  '第二十一章':{kp:'感染免疫',   ref:'《医学免疫学》第21章', ct:'defense', subject:'免疫应用', tags:['感染免疫','抗感染'] },
  '第二十二章':{kp:'肿瘤免疫',   ref:'《医学免疫学》第22章', ct:'attack',  subject:'免疫应用', tags:['肿瘤免疫','免疫监视'] },
  '第二十五章':{kp:'免疫学防治', ref:'《医学免疫学》第25章', ct:'heal',    subject:'免疫应用', tags:['免疫防治','免疫治疗'] },
};

// ── Card type definitions ──────────────────────────────────────
const cardTypes = {
  attack:  { name:'免疫攻击',   icon:'⚔️', cost:1, effect:'造成2点伤害' },
  defense: { name:'免疫防御',   icon:'🛡️', cost:1, effect:'获得1点护盾' },
  heal:    { name:'免疫修复',   icon:'💚', cost:2, effect:'恢复3点HP' },
  special: { name:'免疫调控',   icon:'🔬', cost:2, effect:'摸1张牌' },
};

// ── Parse questions ────────────────────────────────────────────
let currentChapter = '';
let currentChapterNum;
let chapterQuestions = {};

for (const line of lines) {
  // Match chapter headers: # 第X章...
  const chMatch = line.match(/^#\s+(第[一二三四五六七八九十百]+章)/);
  if (chMatch) {
    currentChapterNum = chMatch[1];
    currentChapter = currentChapterNum;
    if (!chapterQuestions[currentChapter]) {
      chapterQuestions[currentChapter] = [];
    }
    continue;
  }

  // Skip format description lines and empty lines
  if (line.startsWith('##') || line.trim() === '') continue;

  // Parse question line: 题干|选项A|选项B|选项C|选项D|选项E|答案
  const parts = line.split('|');
  if (parts.length === 7 && currentChapter) {
    const question = parts[0].trim();
    const opts = parts.slice(1, 6).map(s => s.trim());
    const answer = parts[6].trim().toUpperCase();

    if (question && opts.length === 5 && /^[A-E]$/.test(answer)) {
      if (!chapterQuestions[currentChapter]) {
        chapterQuestions[currentChapter] = [];
      }
      chapterQuestions[currentChapter].push({
        q: question,
        opts: opts,
        answer: answer
      });
    }
  }
}

const totalQuestions = Object.values(chapterQuestions).reduce((s, arr) => s + arr.length, 0);
console.log(`Parsed ${Object.keys(chapterQuestions).length} chapters, ${totalQuestions} questions`);

// ── Generate output ────────────────────────────────────────────
const cardNames = {
  attack:  ['免疫突袭','抗原攻击','细胞毒性','免疫杀伤','炎症风暴','病原清除','免疫监视攻击'],
  defense: ['免疫屏障','抗体中和','免疫记忆','补体防御','免疫稳固','免疫识别防御'],
  heal:    ['免疫修复','细胞再生','免疫重建','免疫平衡','组织修复','免疫调节修复'],
  special: ['免疫调控','细胞活化','免疫增强','免疫干预','信号转导','免疫网络'],
};

let questionIndex = 0;

// Helper: pick card name cyclically
const namePools = {};
function pickCardName(ct) {
  if (!namePools[ct]) namePools[ct] = 0;
  const names = cardNames[ct] || cardNames['special'];
  const name = names[namePools[ct] % names.length];
  namePools[ct]++;
  return name;
}

// Helper: pick difficulty based on index within chapter
function pickDifficulty(idx, total) {
  const ratio = idx / total;
  if (ratio < 0.50) return 'common';
  if (ratio < 0.80) return 'rare';
  if (ratio < 0.95) return 'epic';
  return 'legendary';
}

// Helper: pick card effect based on card type
function pickCardEffect(ct) {
  const ctDef = cardTypes[ct] || cardTypes['special'];
  return ctDef.effect;
}

function pickEnergyCost(ct) {
  const ctDef = cardTypes[ct] || cardTypes['special'];
  return ctDef.cost;
}

// Helper: escape string for JS
function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Build output
const lines_out = [];
lines_out.push('/**');
lines_out.push(' * 免疫学 题目集 — ' + totalQuestions + '题 (从教材习题集提取)');
lines_out.push(' * 难度分布: common(~50%) / rare(~30%) / epic(~15%) / legendary(~5%)');
lines_out.push(' * 涵盖: ' + Object.keys(chapterQuestions).join(' / '));
lines_out.push(' */');
lines_out.push('(function() {');
lines_out.push("  var MediCard = window.MediCard || {};");
lines_out.push("  MediCard.QuestionBank = MediCard.QuestionBank || {};");
lines_out.push("  MediCard.QuestionBank['immunology'] = [");

const chapterNums = Object.keys(chapterQuestions).sort((a, b) => {
  // Sort by chapter number
  const nums = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,
                 '十一':11,'十二':12,'十三':13,'十四':14,'十五':15,'十六':16,'十七':17,
                 '十八':18,'十九':19,'二十':20,'二十一':21,'二十二':22,'二十三':23,
                 '二十四':24,'二十五':25 };
  const getNum = (ch) => {
    const m = ch.match(/第([一二三四五六七八九十百廿]+)章/);
    if (!m) return 0;
    return nums[m[1]] || 0;
  };
  return getNum(a) - getNum(b);
});

for (const chNum of chapterNums) {
  const questions = chapterQuestions[chNum];
  if (!questions || questions.length === 0) continue;

  const meta = chapterMeta[chNum] || { kp:'免疫学', ref:'《医学免疫学》', ct:'special', subject:'免疫学', tags:['免疫学'] };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const difficulty = pickDifficulty(i, questions.length);
    const ct = meta.ct || 'special';
    const cardName = pickCardName(ct);

    // Build question ID: immuno-[chapter]-[index]
    const chShort = chNum.replace(/第|章/g, '');
    const qId = `immuno-${chShort}-${String(i + 1).padStart(3, '0')}`;

    // Format options with letters
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const options = q.opts.map((opt, idx) => letters[idx] + '. ' + opt);

    // Build explanation with correct answer
    const correctLetter = q.answer;
    const correctIdx = letters.indexOf(correctLetter);
    const correctText = correctIdx >= 0 && correctIdx < q.opts.length ? q.opts[correctIdx] : '';
    const explanation = '正确答案为' + correctLetter + '：' + correctText + '。本题考察' + (meta.kp || '免疫学') + '相关知识。';

    const entry = {
      id: qId,
      subject: '免疫学',
      subjectId: 'immunology',
      difficulty: difficulty,
      questionType: 'single',
      cardType: ct,
      cardName: cardName,
      energyCost: pickEnergyCost(ct),
      cardEffect: pickCardEffect(ct),
      question: q.q,
      options: options,
      correctAnswers: [correctLetter],
      explanation: explanation,
      textbookReference: meta.ref,
      knowledgePoint: meta.kp,
      tags: meta.tags || ['免疫学'],
      chapter: chNum
    };

    lines_out.push('  ' + JSON.stringify(entry) + ',');
    questionIndex++;
  }
}

// Remove trailing comma from last entry
const lastLine = lines_out[lines_out.length - 1];
if (lastLine.endsWith(',')) {
  lines_out[lines_out.length - 1] = lastLine.slice(0, -1);
}

lines_out.push('  ];');
lines_out.push('})();');
lines_out.push('');

const output = lines_out.join('\n');
fs.writeFileSync(TARGET, output, 'utf-8');
console.log(`Generated ${questionIndex} questions → ${TARGET}`);
console.log(`Output: ${(output.length / 1024).toFixed(1)} KB`);

// Report per-chapter counts
console.log('\nPer-chapter breakdown:');
for (const chNum of chapterNums) {
  const questions = chapterQuestions[chNum];
  if (!questions) continue;
  const meta = chapterMeta[chNum] || {};
  console.log(`  ${chNum} (${meta.kp || '未知'}): ${questions.length}题`);
}
