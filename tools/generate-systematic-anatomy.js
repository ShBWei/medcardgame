/**
 * parse-xijie-bank.js — 系统解剖学题库完整解析 + 游戏题库生成
 *
 * Input:  系解题库.txt
 * Output: systematic-anatomy.js (MediCard question bank module)
 *
 * Question formats detected:
 *   Choice:   question | optA | optB | optC | optD | optE | correctLetter
 *   TrueFalse: statement | 正确 | (optional empty)
 *             statement | 错误。改正：correction
 *
 * Card type assignment: weighted distribution
 *   attack ~60%, defense ~25%, heal ~15%
 *
 * Difficulty assignment:
 *   common 50%, rare 30%, epic 15%, legendary 5%
 */
const fs = require('fs');

const INPUT  = '/home/ubuntu/medcardgame/系解题库.txt';
const OUTPUT = '/home/ubuntu/medcardgame/src/modules/question-bank/subjects/systematic-anatomy.js';

// ==================== 1. PARSE ====================
const raw = fs.readFileSync(INPUT, 'utf-8');
const allLines = raw.split('\n');

const questions = [];
const errors = [];
const stats = { choice5: 0, choiceOther: 0, truefalse: 0, malformed: 0, skippedEmpty: 0 };

for (let i = 0; i < allLines.length; i++) {
  const line = allLines[i].trim();

  // Skip empty lines, headers, comments
  if (line.length === 0 || line.startsWith('#') || line.startsWith('###')) {
    if (line.length > 0) stats.skippedEmpty++;
    continue;
  }

  const parts = line.split('|');
  if (parts.length < 2) {
    stats.malformed++;
    errors.push(`Line ${i+1}: Too few pipe fields (${parts.length})`);
    continue;
  }

  // ---- Detect format ----
  const lastField  = parts[parts.length - 1].trim();
  const lastFieldClean = lastField.replace(/。.*$/, '').trim(); // Strip punctuation for matching

  // True/false: "正确" or "错误..." as the second-to-last or last significant field
  const secondLast = parts.length >= 2 ? parts[parts.length - 2].trim() : '';
  const secondClean = secondLast.replace(/。.*$/, '').trim();

  // Case 1: Choice — 7 part fields, last field is single letter A-Z
  if (parts.length === 7 && /^[A-E]$/.test(lastField)) {
    const questionText = parts[0].trim();
    const options = [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim(), parts[5].trim()];
    const answer = lastField;

    // Validate answer index matches options
    const optLetters = ['A','B','C','D','E'];
    const ansIdx = optLetters.indexOf(answer);
    if (ansIdx < 0 || options[ansIdx].length === 0) {
      errors.push(`Line ${i+1}: Answer ${answer} but option text is empty`);
      stats.malformed++;
      continue;
    }

    questions.push({
      row: i + 1,
      type: 'choice',
      question: questionText,
      options: options,
      correctAnswer: answer,
      correctIndex: ansIdx,
      explanation: buildExplanation(questionText, options, answer)
    });
    stats.choice5++;
    continue;
  }

  // Case 2: True/false — last significant field is "正确"
  // Format: statement|正确|    or   statement|正确
  if (lastField === '正确' || (lastField === '' && secondClean === '正确')) {
    const statement = parts[0].trim();
    questions.push({
      row: i + 1,
      type: 'truefalse',
      question: statement,
      correctAnswer: 'A', // A.正确
      answerText: '正确',
      explanation: ''
    });
    stats.truefalse++;
    continue;
  }

  // Case 3: True/false — "错误" (wrong statement, possibly with correction)
  // Format A: statement|错误。改正：correction  (2 fields, correction embedded in last)
  // Format B: statement|错误|correction      (3 fields, correction separate)
  if (lastFieldClean.startsWith('错误') || secondClean === '错误' || secondClean.startsWith('错误')) {
    const statement = parts[0].trim();
    let correction;

    if (parts.length >= 3) {
      // Format B: correction is in the last field
      correction = lastField.trim();
      // Clean up 将"X"改为"Y" style
    } else {
      // Format A: correction embedded in last field after "错误。改正："
      correction = lastField.replace(/^错误[。，]?改正[：:]?\s*/, '').trim();
    }

    questions.push({
      row: i + 1,
      type: 'truefalse',
      question: statement,
      correctAnswer: 'B', // B.错误
      answerText: '错误',
      explanation: correction ? `应为：${correction}` : ''
    });
    stats.truefalse++;
    continue;
  }

  // Case 4: Choice with non-7 fields (variable option count, last is letter)
  // e.g., A1/A2/B1 type questions with 2-6 options
  if (/^[A-E]$/.test(lastField) && parts.length >= 4) {
    const questionText = parts[0].trim();
    const optionFields = [];
    for (let oi = 1; oi < parts.length - 1; oi++) {
      const opt = parts[oi].trim();
      if (opt.length > 0) optionFields.push(opt);
    }
    const answer = lastField;

    if (optionFields.length >= 2 && optionFields.length <= 6) {
      const letters = optionFields.map((_, idx) => String.fromCharCode(65 + idx));
      const ansIdx = letters.indexOf(answer);
      if (ansIdx >= 0) {
        questions.push({
          row: i + 1,
          type: 'choice',
          question: questionText,
          options: optionFields,
          correctAnswer: answer,
          correctIndex: ansIdx,
          explanation: buildExplanation(questionText, optionFields, answer)
        });
        stats.choiceOther++;
        continue;
      }
    }
  }

  // Unrecognized
  errors.push(`Line ${i+1}: Unrecognized format, parts=${parts.length}, last="${lastField.substring(0,50)}"`);
  stats.malformed++;
}

// ==================== 2. REPORT ====================
console.log('='.repeat(60));
console.log('PARSE RESULTS');
console.log('='.repeat(60));
console.log(`5-option choice:   ${stats.choice5}`);
console.log(`Other choice:      ${stats.choiceOther}`);
console.log(`True/false:        ${stats.truefalse}`);
console.log(`Malformed:         ${stats.malformed}`);
console.log(`Skipped (headers): ${stats.skippedEmpty}`);
console.log(`TOTAL valid:       ${questions.length}`);
console.log('');

if (errors.length > 0) {
  console.log(`\n⚠️  ERRORS (${errors.length}):`);
  errors.forEach(e => console.log(`  ${e}`));
  console.log('');
}

// Option count distribution
const optDist = {};
questions.filter(q => q.type === 'choice').forEach(q => {
  const n = q.options.length;
  optDist[n] = (optDist[n] || 0) + 1;
});
console.log('Option distribution (choice questions):');
Object.entries(optDist).sort((a,b) => +a[0] - +b[0]).forEach(([k,v]) => {
  console.log(`  ${k} options: ${v}`);
});

// ==================== 3. DIAGNOSIS ====================
// Check questions that might have issues
const suspicious = questions.filter(q => {
  if (q.type === 'choice') {
    // Check for duplicate options
    const opts = q.options;
    const unique = new Set(opts);
    if (unique.size !== opts.length) return true;
    // Check very short question text (potential truncation)
    if (q.question.length <= 3) return true;
  }
  return false;
});
if (suspicious.length > 0) {
  console.log(`\n⚠️  SUSPICIOUS QUESTIONS (${suspicious.length}):`);
  suspicious.slice(0, 10).forEach(sq => {
    console.log(`  Line ${sq.row}: [${sq.type}] "${sq.question.substring(0,60)}" → ans: ${sq.correctAnswer || sq.answerText}`);
    if (sq.type === 'choice') {
      console.log(`    Options: ${sq.options.map((o, i) => String.fromCharCode(65+i) + '.' + o.substring(0,40)).join(' | ')}`);
    }
  });
  if (suspicious.length > 10) console.log(`  ... and ${suspicious.length - 10} more`);
}

// ==================== 4. GENERATE GAME FORMAT ====================
function buildExplanation(question, options, correctLetter) {
  const idx = ['A','B','C','D','E'].indexOf(correctLetter);
  if (idx >= 0 && idx < options.length) {
    return `正确答案是${correctLetter}：${options[idx]}`;
  }
  return '';
}

// Card type distribution
const CARD_TYPES = ['attack','attack','attack','attack','attack','attack','defense','defense','defense','heal','heal'];
function assignCardType(index) {
  return CARD_TYPES[index % CARD_TYPES.length];
}

// Difficulty distribution
const DIFFICULTIES = [
  'common','common','common','common','common','common','common','common','common','common',
  'rare','rare','rare','rare','rare','rare',
  'epic','epic','epic',
  'legendary'
];
function assignDifficulty(index) {
  return DIFFICULTIES[index % DIFFICULTIES.length];
}

// Generate card names based on subject content keywords
function generateCardName(question, type) {
  // Extract key term from question
  const keywords = ['骨', '关节', '肌', '神经', '动脉', '静脉', '心脏', '肺', '肝', '胃', '肾', '脑',
                    '脊髓', '眼', '耳', '淋巴', '胸', '腹', '骨盆', '脊柱', '颈椎', '胸椎', '腰椎',
                    '颅', '鼻', '舌', '气管', '食管', '腹膜', '韧带', '肌腱'];
  for (const kw of keywords) {
    if (question.includes(kw)) {
      const prefix = type === 'attack' ? '⚔️' : type === 'defense' ? '🛡️' : '💚';
      return kw + '解剖';
    }
  }
  return '系统解剖';
}

function generateCardEffect(type, difficulty) {
  const effects = {
    attack: { common: '造成2点伤害', rare: '造成3点伤害', epic: '造成4点伤害', legendary: '造成5点伤害' },
    defense:{ common: '获得2点护盾', rare: '获得3点护盾', epic: '获得4点护盾', legendary: '获得5点护盾' },
    heal:   { common: '恢复2点HP',  rare: '恢复3点HP',  epic: '恢复4点HP',  legendary: '恢复5点HP' }
  };
  return (effects[type] || effects.attack)[difficulty] || '造成2点伤害';
}

function generateEnergyCost(difficulty) {
  return { common: 1, rare: 2, epic: 3, legendary: 3 }[difficulty] || 1;
}

console.log(`\n${'='.repeat(60)}`);
console.log('GENERATING GAME QUESTION BANK');
console.log('='.repeat(60));

// Convert all questions to game format
const gameQuestions = [];
const subjectName = '系统解剖学';
const subjectId = 'systematic-anatomy';

questions.forEach((q, idx) => {
  try {
    const difficulty = assignDifficulty(idx);
    const cardType = assignCardType(idx);
    const id = `sys-anat-v2-${String(idx + 1).padStart(4, '0')}`;

    // Build question text for display
    let questionText = q.question;
    if (q.type === 'truefalse') {
      questionText = q.question;
    }

    // Build options
    let options;
    if (q.type === 'truefalse') {
      options = ['A. 正确', 'B. 错误'];
    } else {
      options = q.options.map((opt, oi) => `${String.fromCharCode(65 + oi)}. ${opt}`);
    }

    // Build correctAnswers
    let correctAnswers;
    if (q.type === 'truefalse') {
      correctAnswers = q.answerText === '正确' ? ['A'] : ['B'];
    } else {
      correctAnswers = [q.correctAnswer];
    }

    // Build card-specific metadata
    const cardName = generateCardName(q.question, cardType);

    // Build explanation
    let explanation = '';
    if (q.type === 'truefalse') {
      explanation = q.correctAnswer === 'A' ? '该陈述正确。' : `该陈述错误。${q.explanation || ''}`;
    } else {
      explanation = `正确答案是${q.correctAnswer}：${q.options[q.correctIndex]}`;
    }

    const gameQ = {
      id: id,
      subject: subjectName,
      subjectId: subjectId,
      difficulty: difficulty,
      questionType: q.type === 'truefalse' ? 'truefalse' : 'single',
      cardType: cardType,
      cardName: cardName,
      energyCost: generateEnergyCost(difficulty),
      cardEffect: generateCardEffect(cardType, difficulty),
      question: questionText,
      options: options,
      correctAnswers: correctAnswers,
      explanation: explanation,
      // textbookReference: '《系统解剖学》题库',
      // knowledgePoint: '',
      tags: ['系统解剖学']
    };

    gameQuestions.push(gameQ);
  } catch (e) {
    errors.push(`Generation error for question ${idx} (row ${q.row}): ${e.message}`);
  }
});

console.log(`Generated ${gameQuestions.length} game questions`);
console.log(`Card type distribution:`);
const cardDist = {};
gameQuestions.forEach(q => { cardDist[q.cardType] = (cardDist[q.cardType] || 0) + 1; });
Object.entries(cardDist).sort().forEach(([k,v]) => console.log(`  ${k}: ${v}`));

console.log(`Difficulty distribution:`);
const diffDist = {};
gameQuestions.forEach(q => { diffDist[q.difficulty] = (diffDist[q.difficulty] || 0) + 1; });
Object.entries(diffDist).sort().forEach(([k,v]) => console.log(`  ${k}: ${v}`));

console.log(`Question type distribution:`);
const qtDist = {};
gameQuestions.forEach(q => { qtDist[q.questionType] = (qtDist[q.questionType] || 0) + 1; });
Object.entries(qtDist).sort().forEach(([k,v]) => console.log(`  ${k}: ${v}`));

// ==================== 5. WRITE OUTPUT ====================
console.log(`\nWriting output to: ${OUTPUT}`);

// Split into chunks for readability
const FULL = gameQuestions.slice(0, Math.floor(gameQuestions.length * 0.5));
const RARE = gameQuestions.slice(Math.floor(gameQuestions.length * 0.5), Math.floor(gameQuestions.length * 0.8));
const EPIC = gameQuestions.slice(Math.floor(gameQuestions.length * 0.8), Math.floor(gameQuestions.length * 0.95));
const LEGENDARY = gameQuestions.slice(Math.floor(gameQuestions.length * 0.95));

// Count actual difficulty per chunk
const chunkCounts = {
  common: FULL.length,
  rare: RARE.length,
  epic: EPIC.length,
  legendary: LEGENDARY.length
};

// We'll use the compact format for space efficiency
// Group by difficulty then by card type

// Sort by difficulty then cardType
const diffOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
const sorted = [...gameQuestions].sort((a, b) => {
  const d = diffOrder[a.difficulty] - diffOrder[b.difficulty];
  if (d !== 0) return d;
  return a.cardType.localeCompare(b.cardType);
});

// Actually let's just write them all in order with good grouping
let output = [];
output.push(`/**`);
output.push(` * 系统解剖学 题目集 — ${gameQuestions.length}题`);
output.push(` * 选择题: ${qtDist['single'] || 0} / 判断题: ${qtDist['truefalse'] || 0}`);
output.push(` * 难度分布: common(${diffDist['common']||0}) / rare(${diffDist['rare']||0}) / epic(${diffDist['epic']||0}) / legendary(${diffDist['legendary']||0})`);
output.push(` * 卡牌类型: attack(${cardDist['attack']||0}) / defense(${cardDist['defense']||0}) / heal(${cardDist['heal']||0})`);
output.push(` * 来源: 系解题库.txt 完整题库`);
output.push(` * 生成时间: ${new Date().toISOString().split('T')[0]}`);
output.push(` */`);
output.push(`(function() {`);
output.push(`  var MediCard = window.MediCard || {};`);
output.push(`  MediCard.QuestionBank = MediCard.QuestionBank || {};`);
output.push(``);
output.push(`  MediCard.QuestionBank['systematic-anatomy'] = [`);

// Write in groups by difficulty
const groups = { common: [], rare: [], epic: [], legendary: [] };
gameQuestions.forEach(q => groups[q.difficulty].push(q));

const groupHeaders = {
  common: '普通题 (common)',
  rare: '稀有题 (rare)',
  epic: '史诗题 (epic)',
  legendary: '传说题 (legendary)'
};

const groupKeys = ['common', 'rare', 'epic', 'legendary'];
const nonEmptyGroups = groupKeys.filter(k => groups[k] && groups[k].length > 0);

for (let g = 0; g < nonEmptyGroups.length; g++) {
  const diff = nonEmptyGroups[g];
  const qs = groups[diff];
  const isLastGroup = (g === nonEmptyGroups.length - 1);

  output.push('');
  output.push(`    // ========== ${groupHeaders[diff]} (${qs.length}题) ==========`);

  // Write in batches of ~5 per line for readability
  const batchSize = 5;
  for (let i = 0; i < qs.length; i += batchSize) {
    const batch = qs.slice(i, i + batchSize);
    const isLastBatch = (i + batchSize >= qs.length);
    const entries = batch.map(q => {
      // Compact format for smaller file size
      const parts = [
        `id:"${q.id}"`,
        `qt:"${q.questionType === 'truefalse' ? 'truefalse' : 'single'}"`,
        `ct:"${q.cardType}"`,
        `cn:"${q.cardName}"`,
        `ec:${q.energyCost}`,
        `ce:"${q.cardEffect}"`,
        `q:${JSON.stringify(q.question)}`,
        `opts:${JSON.stringify(q.options)}`,
        `ans:${JSON.stringify(q.correctAnswers)}`,
        `exp:${JSON.stringify(q.explanation)}`
      ];
      return `{${parts.join(',')}}`;
    });

    // Add trailing comma unless this is the last batch of the last group
    const suffix = (isLastBatch && isLastGroup) ? '' : ',';
    output.push(`    ${entries.join(',\n    ')}${suffix}`);
  }
}

output.push('');
output.push(`  ];`);
output.push(``);
output.push(`  window.MediCard = MediCard;`);
output.push(`})();`);
output.push('');

fs.writeFileSync(OUTPUT, output.join('\n'));
console.log(`\n✅ Output written to ${OUTPUT}`);
console.log(`File size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);

// ==================== 6. VALIDATE OUTPUT ====================
// Quick validation: check every question has required fields
console.log(`\n${'='.repeat(60)}`);
console.log('VALIDATION');
console.log('='.repeat(60));
let validationErrors = 0;
gameQuestions.forEach((q, idx) => {
  const required = ['id','subject','subjectId','difficulty','questionType','cardType','question','options','correctAnswers'];
  for (const field of required) {
    if (!q[field]) {
      console.log(`Missing ${field} in question ${idx}: ${q.id}`);
      validationErrors++;
    }
  }
  // Validate correctAnswers format
  if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
    console.log(`Bad correctAnswers in question ${idx}: ${q.id}`);
    validationErrors++;
  }
  // Validate options
  if (!Array.isArray(q.options) || q.options.length < 2) {
    console.log(`Bad options in question ${idx}: ${q.id}`);
    validationErrors++;
  }
  // Validate answer exists in options
  for (const ans of q.correctAnswers) {
    const letter = ans.replace(/\..*/, '').trim();
    const found = q.options.some(opt => opt.startsWith(letter + '.') || opt.startsWith(letter));
    if (!found) {
      console.log(`Answer ${ans} not found in options for ${q.id}: ${JSON.stringify(q.options)}`);
      validationErrors++;
    }
  }
  // Validate question type
  if (q.questionType === 'truefalse' && q.options.length !== 2) {
    console.log(`True/false question ${q.id} has ${q.options.length} options (expected 2)`);
    validationErrors++;
  }
});

if (validationErrors === 0) {
  console.log(`✅ All ${gameQuestions.length} questions pass validation`);
} else {
  console.log(`❌ ${validationErrors} validation errors found`);
}

// Summary for user
console.log(`\n${'='.repeat(60)}`);
console.log('FINAL SUMMARY');
console.log('='.repeat(60));
console.log(`Total questions:     ${gameQuestions.length}`);
console.log(`  - Choice (单选):    ${qtDist['single'] || 0}`);
console.log(`  - True/false (判断): ${qtDist['truefalse'] || 0}`);
console.log(`Attack cards:        ${cardDist['attack'] || 0}`);
console.log(`Defense cards:       ${cardDist['defense'] || 0}`);
console.log(`Heal cards:          ${cardDist['heal'] || 0}`);
console.log(`Parse errors:        ${errors.length ? errors.length : 0}`);
