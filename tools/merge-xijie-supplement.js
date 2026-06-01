/**
 * parse-xijie-supplement.js
 * Parse 系解题库补充.txt and merge into systematic-anatomy.js
 *
 * Supplementary topics:
 *   - 呼吸系统 (Respiratory)
 *   - 泌尿系统 (Urinary)
 *   - 男性生殖系统 (Male reproductive)
 *   - 女性生殖系统+乳房+会阴 (Female reproductive + breast + perineum)
 *   - 心血管系统 (Cardiovascular)
 *
 * Questions types: choice (5 options A-E) and true/false (判断改错题)
 */
const fs = require('fs');

const SUPPLEMENT = '/home/ubuntu/medcardgame/系解题库补充.txt';
const BANK_FILE  = '/home/ubuntu/medcardgame/src/modules/question-bank/subjects/systematic-anatomy.js';

// ==================== 1. Parse supplement ====================
const raw = fs.readFileSync(SUPPLEMENT, 'utf-8');
const allLines = raw.split('\n');

const questions = [];
const errors = [];
const stats = { choice5: 0, truefalse: 0, malformed: 0, skipped: 0 };

for (let i = 0; i < allLines.length; i++) {
  const line = allLines[i].trim();

  // Skip empty lines, headers, comments
  if (line.length === 0 || line.startsWith('#') || line.startsWith('###') || line.startsWith('##')) {
    if (line.length > 0) stats.skipped++;
    continue;
  }

  const parts = line.split('|');

  if (parts.length < 2) {
    stats.malformed++;
    errors.push(`Line ${i+1}: Too few pipe fields (${parts.length})`);
    continue;
  }

  const lastField  = parts[parts.length - 1].trim();
  const lastFieldClean = lastField.replace(/。.*$/, '').trim();
  const secondLast = parts.length >= 2 ? parts[parts.length - 2].trim() : '';
  const secondClean = secondLast.replace(/。.*$/, '').trim();

  // Choice: 7 fields, last is A-E
  if (parts.length === 7 && /^[A-E]$/.test(lastField)) {
    const questionText = parts[0].trim();
    const options = [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim(), parts[5].trim()];
    const answer = lastField;
    const letters = ['A','B','C','D','E'];
    const ansIdx = letters.indexOf(answer);

    if (ansIdx < 0 || !options[ansIdx]) {
      errors.push(`Line ${i+1}: Answer ${answer} but option empty`);
      stats.malformed++;
      continue;
    }

    // Detect duplicate options
    const uniqueOpts = new Set(options);
    if (uniqueOpts.size < options.length) {
      errors.push(`Line ${i+1}: Duplicate options in "${questionText.substring(0,40)}..."`);
    }

    questions.push({
      row: i + 1,
      type: 'choice',
      question: questionText,
      options: options,
      correctAnswer: answer,
      correctIndex: ansIdx
    });
    stats.choice5++;
    continue;
  }

  // True/false: "正确"
  if (lastField === '正确' || lastFieldClean === '正确' ||
      (lastField === '' && secondClean === '正确')) {
    questions.push({
      row: i + 1,
      type: 'truefalse',
      question: parts[0].trim(),
      correctAnswer: 'A', // A.正确
      answerText: '正确',
      correction: null
    });
    stats.truefalse++;
    continue;
  }

  // True/false: "错误" with correction
  // Format A: statement|错误|correction
  // Format B: statement|错误。改正：correction
  if (lastFieldClean.startsWith('错误') || secondClean === '错误' || secondClean.startsWith('错误')) {
    const statement = parts[0].trim();
    let correction;

    if (parts.length >= 3 && !lastFieldClean.startsWith('错误')) {
      // Format A: correction in last field
      correction = lastField.trim();
    } else {
      // Format B: correction embedded
      const errField = lastFieldClean.startsWith('错误') ? lastField : secondLast;
      correction = errField.replace(/^错误[。，]?改正[：:]?\s*/, '').trim();
    }

    questions.push({
      row: i + 1,
      type: 'truefalse',
      question: statement,
      correctAnswer: 'B', // B.错误
      answerText: '错误',
      correction: correction || null
    });
    stats.truefalse++;
    continue;
  }

  // Unrecognized
  errors.push(`Line ${i+1}: Unrecognized, parts=${parts.length}, last="${lastField.substring(0,60)}"`);
  stats.malformed++;
}

console.log('='.repeat(60));
console.log('SUPPLEMENT PARSE RESULTS');
console.log('='.repeat(60));
console.log(`Choice questions:  ${stats.choice5}`);
console.log(`True/false:        ${stats.truefalse}`);
console.log(`Malformed:         ${stats.malformed}`);
console.log(`Skipped (headers): ${stats.skipped}`);
console.log(`TOTAL valid:       ${questions.length}`);

if (errors.length > 0) {
  console.log(`\n⚠️  ERRORS (${errors.length}):`);
  errors.forEach(e => console.log(`  ${e}`));
}

// ==================== 2. Read existing bank to get current count ====================
const existingContent = fs.readFileSync(BANK_FILE, 'utf-8');
const idMatches = existingContent.match(/sys-anat-v2-(\d+)/g);
let maxId = 0;
if (idMatches) {
  idMatches.forEach(m => {
    const num = parseInt(m.replace('sys-anat-v2-', ''));
    if (num > maxId) maxId = num;
  });
}
console.log(`\nExisting question count: ${maxId}`);
const startId = maxId + 1;

// ==================== 3. Convert to game format ====================
const CARD_TYPES = ['attack','attack','attack','attack','attack','attack','defense','defense','defense','heal','heal'];
const DIFFICULTIES = [
  'common','common','common','common','common','common','common','common','common','common',
  'rare','rare','rare','rare','rare','rare',
  'epic','epic','epic',
  'legendary'
];

function assignCardType(idx) { return CARD_TYPES[idx % CARD_TYPES.length]; }
function assignDifficulty(idx) { return DIFFICULTIES[idx % DIFFICULTIES.length]; }

function extractKeyword(question) {
  const keywords = ['骨', '关节', '肌', '神经', '动脉', '静脉', '心脏', '肺', '肝', '胃', '肾',
                    '脊髓', '眼', '耳', '淋巴', '胸', '腹', '骨盆', '脊柱', '颈椎', '胸椎', '腰椎',
                    '颅', '鼻', '舌', '气管', '食管', '腹膜', '韧带', '肌腱', '呼吸', '泌尿',
                    '膀胱', '输尿管', '尿道', '生殖', '睾丸', '卵巢', '子宫', '心', '血管',
                    '乳房', '会阴', '直肠', '肛', '纵隔', '喉', '声带', '胸膜', '鼻旁窦'];
  for (const kw of keywords) {
    if (question.includes(kw)) return kw + '解剖';
  }
  return '系统解剖';
}

const gameQuestions = [];
const subjectName = '系统解剖学';
const subjectId = 'systematic-anatomy';

questions.forEach((q, idx) => {
  try {
    const cardIdx = maxId + idx; // Continue from existing count
    const difficulty = assignDifficulty(cardIdx);
    const cardType = assignCardType(cardIdx);
    const id = `sys-anat-v2-${String(cardIdx + 1).padStart(4, '0')}`;

    let questionText = q.question;

    let options;
    if (q.type === 'truefalse') {
      options = ['A. 正确', 'B. 错误'];
    } else {
      options = q.options.map((opt, oi) => `${String.fromCharCode(65 + oi)}. ${opt}`);
    }

    let correctAnswers;
    if (q.type === 'truefalse') {
      correctAnswers = q.answerText === '正确' ? ['A'] : ['B'];
    } else {
      correctAnswers = [q.correctAnswer];
    }

    const cardName = extractKeyword(q.question);

    let explanation = '';
    if (q.type === 'truefalse') {
      if (q.correctAnswer === 'A') {
        explanation = '该陈述正确。';
      } else {
        explanation = q.correction ? `该陈述错误。应为：${q.correction}` : '该陈述错误。';
      }
    } else {
      const ci = q.correctIndex;
      explanation = `正确答案是${q.correctAnswer}：${q.options[ci]}`;
    }

    const ec = { common: 1, rare: 2, epic: 3, legendary: 3 }[difficulty] || 1;
    const ceMap = {
      attack:  { common:'造成2点伤害', rare:'造成3点伤害', epic:'造成4点伤害', legendary:'造成5点伤害' },
      defense: { common:'获得2点护盾', rare:'获得3点护盾', epic:'获得4点护盾', legendary:'获得5点护盾' },
      heal:    { common:'恢复2点HP',  rare:'恢复3点HP',  epic:'恢复4点HP',  legendary:'恢复5点HP' }
    };
    const ce = (ceMap[cardType] || ceMap.attack)[difficulty] || '造成2点伤害';

    // Compact format entry
    const parts = [
      `id:"${id}"`,
      `qt:"${q.type === 'truefalse' ? 'truefalse' : 'single'}"`,
      `ct:"${cardType}"`,
      `cn:"${cardName}"`,
      `ec:${ec}`,
      `ce:"${ce}"`,
      `q:${JSON.stringify(questionText)}`,
      `opts:${JSON.stringify(options)}`,
      `ans:${JSON.stringify(correctAnswers)}`,
      `exp:${JSON.stringify(explanation)}`
    ];
    gameQuestions.push(`    {${parts.join(',')}}`);
  } catch (e) {
    errors.push(`Generation error for Q${idx} (row ${q.row}): ${e.message}`);
  }
});

console.log(`\nGenerated ${gameQuestions.length} new game entries`);
console.log(`New ID range: sys-anat-v2-${String(startId + 1).padStart(4, '0')} to sys-anat-v2-${String(startId + gameQuestions.length).padStart(4, '0')}`);

// ==================== 4. Card type & difficulty distribution ====================
const cardDist = {}, diffDist = {}, qtDist = {};
for (let i = 0; i < gameQuestions.length; i++) {
  const entry = gameQuestions[i];
  const ct = (entry.match(/"ct":"([^"]+)"/) || [])[1];
  const qt = (entry.match(/"qt":"([^"]+)"/) || [])[1];
  const idx = startId + i;
  const diff = DIFFICULTIES[idx % DIFFICULTIES.length];
  cardDist[ct] = (cardDist[ct] || 0) + 1;
  diffDist[diff] = (diffDist[diff] || 0) + 1;
  qtDist[qt] = (qtDist[qt] || 0) + 1;
}
console.log(`Card types:  attack=${cardDist['attack']||0} defense=${cardDist['defense']||0} heal=${cardDist['heal']||0}`);
console.log(`Difficulty:  common=${diffDist['common']||0} rare=${diffDist['rare']||0} epic=${diffDist['epic']||0} legendary=${diffDist['legendary']||0}`);
console.log(`Q types:     single=${qtDist['single']||0} truefalse=${qtDist['truefalse']||0}`);

// ==================== 5. Insert into existing file ====================
// Strategy: add new entries to the end of the legendary group (last group before ])
// We'll distribute by difficulty to the appropriate groups

// Actually simpler: add a new section at the end before "];"
const groupedByDifficulty = { common: [], rare: [], epic: [], legendary: [] };
for (let i = 0; i < gameQuestions.length; i++) {
  const idx = startId + i;
  const diff = DIFFICULTIES[idx % DIFFICULTIES.length];
  groupedByDifficulty[diff].push(gameQuestions[i]);
}

// Read the current file and find insertion points
let fileContent = fs.readFileSync(BANK_FILE, 'utf-8');
const lines = fileContent.split('\n');

// Find the closing "];" and insert before it
const closeIdx = lines.findIndex(l => l.trim() === '];');
if (closeIdx < 0) {
  console.error('Could not find "];" in bank file!');
  process.exit(1);
}

// Build new sections to insert
const newSections = [];
const groupLabels = {
  common: '补充-普通题',
  rare: '补充-稀有题',
  epic: '补充-史诗题',
  legendary: '补充-传说题'
};

for (const [diff, entries] of Object.entries(groupedByDifficulty)) {
  if (entries.length === 0) continue;
  newSections.push('');
  newSections.push(`    // ========== ${groupLabels[diff]} (${entries.length}题) ==========`);
  // Batch of 5 per line
  const batchSize = 5;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const isLastBatch = (i + batchSize >= entries.length);
    const isLastGroup = (diff === 'legendary');
    const suffix = (isLastBatch && isLastGroup) ? '' : ',';
    newSections.push(batch.join(',\n') + suffix);
  }
}

// Insert before closing bracket
lines.splice(closeIdx, 0, ...newSections);

// Update header comment with new total
const newTotal = maxId + gameQuestions.length;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('系统解剖学 题目集')) {
    lines[i] = lines[i].replace(/\d+题/, `${newTotal}题`);
    break;
  }
}
// Update type counts
for (let i = 0; i < lines.length; i++) {
  // Add supplement counts to the comment header
  if (lines[i].includes('选择题:')) {
    const currentSingle = parseInt((lines[i].match(/选择题:\s*(\d+)/) || [])[1]) || 0;
    lines[i] = lines[i].replace(/选择题:\s*\d+/, `选择题: ${currentSingle + (qtDist['single']||0)}`);
  }
  if (lines[i].includes('判断题:')) {
    const currentTF = parseInt((lines[i].match(/判断题:\s*(\d+)/) || [])[1]) || 0;
    lines[i] = lines[i].replace(/判断题:\s*\d+/, `判断题: ${currentTF + (qtDist['truefalse']||0)}`);
  }
}

// Write back
fs.writeFileSync(BANK_FILE, lines.join('\n'));
console.log(`\n✅ Appended ${gameQuestions.length} new questions to ${BANK_FILE}`);
console.log(`Total questions now: ${newTotal}`);

// ==================== 6. Validate output ====================
// Syntax check
const { execSync } = require('child_process');
try {
  execSync(`node --check "${BANK_FILE}"`, { stdio: 'pipe' });
  console.log('✅ Syntax check passed');
} catch (e) {
  console.log(`❌ Syntax error: ${e.stderr ? e.stderr.toString().substring(0, 200) : e.message}`);
}

// Count questions
const idCount = (fs.readFileSync(BANK_FILE, 'utf-8').match(/sys-anat-v2-/g) || []).length;
console.log(`Question count verified: ${idCount}`);

// ==================== 7. Final summary ====================
console.log(`\n${'='.repeat(60)}`);
console.log('FINAL SUMMARY');
console.log('='.repeat(60));
console.log(`Original questions: ${maxId}`);
console.log(`New questions:      ${gameQuestions.length}`);
console.log(`  - Choice:          ${stats.choice5}`);
console.log(`  - True/false:      ${stats.truefalse}`);
console.log(`Total:              ${newTotal}`);
console.log(`Parse errors:       ${errors.length}`);
if (errors.length > 0) {
  console.log(`ERROR DETAILS:`);
  errors.forEach(e => console.log(`  ⚠️  ${e}`));
}
