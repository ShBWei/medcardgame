/**
 * add-chapters.js — Add `chapter` field to pathology.js, systematic-anatomy.js, cell-biology.js
 * Uses source .txt files to determine chapter boundaries.
 * Run: node tools/add-chapters.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';

// ── Chapter definitions for each subject ──

// Pathology: sections in the .txt file, in order
const PATHOLOGY_CHAPTERS = [
  // Lines 1-514 (no markdown header) — 局部血液循环障碍
  { name: '第三章 局部血液循环障碍', startLine: 1 },
  // Lines 515-820 — 细胞和组织的适应与损伤
  { name: '第一章 细胞和组织的适应与损伤', startLine: 515 },
  // Lines 821-1144 — 损伤的修复
  { name: '第二章 损伤的修复', startLine: 821 },
  // Lines 1145+ — from markdown headers
  { name: '第十一章 消化系统疾病', startLine: 1145 },
  { name: '第四章 炎症', startLine: 1380 },
  { name: '心血管系统疾病', startLine: 1487 },
  { name: '第六章 肿瘤', startLine: 1584 },
  { name: '第十章 呼吸系统疾病', startLine: 1691 },
];

// Systematic-anatomy: the main 系解题库.txt is one continuous file without chapter headers.
// Questions are in order: bones → joints → muscles → ... following textbook sequence.
// We use 系解题库补充.txt for chapters 5-8,10 with explicit headers.
// For the main file, we determine chapter boundaries by analyzing question topics.
// The textbook sequence is roughly: 骨学→关节学→肌学→内脏学总论→消化→呼吸→泌尿→生殖→心血管→淋巴→感官→神经

// Cell-biology: no source .txt. We derive chapters from knowledgePoint patterns.

// ── Helper functions ──

/** Count "答案：" lines in a .txt section to get question count */
function countQuestionsInRange(txt, startLine, endLine) {
  const lines = txt.split('\n');
  let count = 0;
  for (let i = startLine - 1; i < Math.min(endLine || lines.length, lines.length); i++) {
    if (lines[i].match(/^答案[：:]/)) count++;
  }
  return count;
}

/** Extract question text from a .txt line (pathology format: "N. text (answer)") */
function extractQuestionText(line) {
  // Remove leading number and dot
  let text = line.replace(/^\d+\.\s*/, '').trim();
  // Remove trailing answer: （×）, (√), etc
  text = text.replace(/[（(][√×ABDCE]+[）)]\s*$/, '').trim();
  return text;
}

/** Parse a .js file with comments, return question array */
function parseJSArray(filePath, subjectId) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find the array start and extract
  const pattern = "MediCard.QuestionBank['" + subjectId + "']";
  const altPattern = 'MediCard.QuestionBank["' + subjectId + '"]';
  let match = content.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*(\\[)'));
  if (!match) {
    match = content.match(new RegExp(altPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*(\\[)'));
  }
  if (!match) {
    console.error('  Could not find QuestionBank assignment for', subjectId);
    return null;
  }
  const arrayStart = match.index + match[0].length - 1;
  // Find matching closing bracket
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    else if (content[i] === ']') { depth--; if (depth === 0) { arrayEnd = i + 1; break; } }
  }
  if (arrayEnd < 0) return null;
  const arrayStr = content.substring(arrayStart, arrayEnd);
  // Use Function constructor to evaluate JS (handles comments, trailing commas, etc.)
  try {
    return (new Function('return ' + arrayStr))();
  } catch (e) {
    console.error('  JS eval error:', e.message);
    return null;
  }
}

/** Parse pathology .txt into chapter → question texts mapping */
function parsePathologyTxt(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const lines = txt.split('\n');
  const chapters = [];

  for (let ci = 0; ci < PATHOLOGY_CHAPTERS.length; ci++) {
    const ch = PATHOLOGY_CHAPTERS[ci];
    const nextCh = PATHOLOGY_CHAPTERS[ci + 1];
    const endLine = nextCh ? nextCh.startLine - 1 : lines.length;

    const questions = [];
    let inQuestionSection = false;
    for (let i = ch.startLine - 1; i < endLine; i++) {
      const line = lines[i].trim();
      // Detect question sections
      if (line.match(/^(一|二|三)、/)) { inQuestionSection = true; continue; }
      if (line.startsWith('#')) { inQuestionSection = true; continue; }
      // Question lines: start with a number followed by "." or "．"
      if (inQuestionSection && line.match(/^\d+[.．]/)) {
        const qText = extractQuestionText(line);
        if (qText && qText.length > 3) {
          questions.push(qText);
        }
      }
    }
    chapters.push({ name: ch.name, questions: questions });
    console.log(`  Chapter "${ch.name}": ${questions.length} questions (lines ${ch.startLine}-${endLine})`);
  }
  return chapters;
}

/** Match .js questions to .txt chapters by question text (first N chars for fuzzy matching) */
function matchChapters(jsQuestions, txtChapters) {
  let txtIdx = 0;
  let matched = 0;
  const results = [];

  for (let ci = 0; ci < txtChapters.length; ci++) {
    const chQuestions = txtChapters[ci].questions;
    const chapterName = txtChapters[ci].name;
    let chMatched = 0;

    for (let qi = 0; qi < chQuestions.length; qi++) {
      if (txtIdx >= jsQuestions.length) break;
      const txtQ = chQuestions[qi].substring(0, 30).replace(/\s+/g, '');
      const jsQ = (jsQuestions[txtIdx].question || '').substring(0, 30).replace(/\s+/g, '');
      // Fuzzy match
      if (txtQ === jsQ || txtQ.includes(jsQ.substring(0, 15)) || jsQ.includes(txtQ.substring(0, 15))) {
        jsQuestions[txtIdx].chapter = chapterName;
        txtIdx++;
        chMatched++;
      }
    }
    matched += chMatched;
    console.log(`  Matched ${chMatched}/${chQuestions.length} → "${chapterName}"`);
  }
  console.log(`  Total matched: ${matched}/${jsQuestions.length}`);
  return jsQuestions;
}

/** Write updated .js file for pathology/cell-biology (JS array format with comments) */
function writeJSSubjectFile(filePath, subjectId, questions) {
  let content = fs.readFileSync(filePath, 'utf8');
  const header = content.substring(0, content.indexOf("MediCard.QuestionBank['" + subjectId + "']"));
  if (!header) {
    console.error('  Could not find header in', filePath);
    return;
  }
  // Rebuild: group by difficulty for readability
  const groups = { common: [], rare: [], epic: [], legendary: [] };
  for (const q of questions) {
    const d = q.difficulty || 'common';
    if (groups[d]) groups[d].push(q);
  }
  const labels = { common: '普通 (common)', rare: '稀有 (rare)', epic: '史诗 (epic)', legendary: '传说 (legendary)' };
  let out = header + "\n  MediCard.QuestionBank['" + subjectId + "'] = [\n";
  for (const d of ['common', 'rare', 'epic', 'legendary']) {
    if (groups[d].length === 0) continue;
    out += '    // ' + labels[d] + ' (' + groups[d].length + '题)\n';
    for (const q of groups[d]) {
      out += '    ' + JSON.stringify(q) + ',\n';
    }
  }
  // Remove trailing comma
  out = out.replace(/,\n$/, '\n');
  out += '  ];\n\n  window.MediCard = MediCard;\n})();\n';
  fs.writeFileSync(filePath, out, 'utf8');
  console.log(`  Written: ${filePath} (${questions.length} questions)`);
}

// ── Systematic Anatomy ──

/** Parse 系解题库补充.txt to get chapter boundaries and question texts */
function parseSysAnatSupp(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const lines = txt.split('\n');
  const chapters = [];
  let currentChapter = null;
  let currentQuestions = [];

  for (const line of lines) {
    // Chapter header: ### 第X章 ...
    const chMatch = line.match(/^###\s+(第[一二三四五六七八九十]+章.*)$/);
    if (chMatch || line.match(/^#\s+(第[一二三四五六七八九十]+章.*)$/)) {
      if (currentChapter) {
        chapters.push({ name: currentChapter, questions: currentQuestions });
      }
      currentChapter = chMatch ? chMatch[1] : line.replace(/^#\s+/, '').trim();
      if (currentChapter.startsWith('第')) currentChapter = currentChapter.replace(/^第/, '第').trim();
      currentQuestions = [];
      continue;
    }
    // Question line: text|opt1|opt2|...|answer
    if (currentChapter && line.includes('|') && line.length > 10 && !line.startsWith('#')) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        currentQuestions.push(parts[0].trim());
      }
    }
  }
  if (currentChapter) chapters.push({ name: currentChapter, questions: currentQuestions });

  for (const ch of chapters) {
    console.log(`  SysAnat Chapter "${ch.name}": ${ch.questions.length} questions`);
  }
  return chapters;
}

/** Match sys-anat questions to chapters from supplement */
function matchSysAnatChapters(jsQuestions, suppChapters) {
  // Build a lookup: question text → chapter name
  const lookup = {};
  for (const ch of suppChapters) {
    for (const q of ch.questions) {
      const key = q.substring(0, 25).replace(/\s+/g, '');
      lookup[key] = ch.name;
    }
  }

  let matched = 0;
  let unmatched = 0;
  for (const q of jsQuestions) {
    const key = (q.q || q.question || '').substring(0, 25).replace(/\s+/g, '');
    if (lookup[key]) {
      q.chapter = lookup[key];
      matched++;
    } else {
      unmatched++;
    }
  }
  console.log(`  SysAnat: ${matched} matched, ${unmatched} unmatched (will try alternative matching)`);
  return jsQuestions;
}

/** For unmatched sys-anat questions, assign chapters based on cardName / question topic patterns */
function assignSysAnatChaptersByTopic(jsQuestions) {
  // Topic-based chapter assignment for the main 系解题库.txt
  const topicPatterns = [
    // Chapter 1: 骨学 (Osteology)
    { chapter: '第一章 骨学', keywords: ['椎骨','胸骨','肋骨','肱骨','股骨','尺骨','桡骨','胫骨','腓骨','肩胛','锁骨','髋骨','颅骨','蝶骨','颞骨','枕骨','筛骨','上颌','下颌','椎间','骶骨','尾骨','腕骨','掌骨','跖骨','跗骨','指骨','趾骨','长骨','短骨','扁骨','不规则骨','骺线','髁','茎突','粗隆','结节','切迹','关节盂','髋臼','闭孔'] },
    // Chapter 2: 关节学 (Arthrology)
    { chapter: '第二章 关节学', keywords: ['关节','韧带','半月板','滑膜','关节囊','屈伸','内收','外展','旋转','环转'] },
    // Chapter 3: 肌学 (Myology)
    { chapter: '第三章 肌学', keywords: ['肌群','肌腱','筋膜','斜方肌','背阔肌','胸锁乳突肌','三角肌','肱二头','肱三头','股四头','腓肠肌','比目鱼','膈肌','腹直肌','腹外斜','腹内斜','腹横肌','肋间肌','前锯肌','提肛','括约肌','咀嚼肌','表情肌','肌的起','肌的止','肌收缩','肌间隔'] },
    // Chapter 4: 消化系统
    { chapter: '第四章 消化系统', keywords: ['胃','肠','肝','胆','胰','食管','贲门','幽门','十二指肠','空肠','回肠','盲肠','结肠','直肠','肛管','阑尾','腹膜','网膜','系膜','腮腺','舌下腺','下颌下腺','咽','腭扁桃体'] },
    // Chapter 5: 呼吸系统
    { chapter: '第五章 呼吸系统', keywords: ['鼻腔','鼻旁窦','喉','气管','支气管','肺','胸膜','声带','会厌','声门','上颌窦','额窦','蝶窦','筛窦','环状软骨','甲状软骨','杓状软骨'] },
    // Chapter 6: 泌尿系统
    { chapter: '第六章 泌尿系统', keywords: ['肾','输尿管','膀胱','尿道','肾盂','肾盏','肾单位','肾小球','肾小管'] },
    // Chapter 7: 男性生殖系统
    { chapter: '第七章 男性生殖系统', keywords: ['睾丸','附睾','输精管','精囊','前列腺','阴茎','阴囊','射精管'] },
    // Chapter 8: 女性生殖系统及乳房会阴
    { chapter: '第八章 女性生殖系统及乳房会阴', keywords: ['卵巢','输卵管','子宫','阴道','乳房','乳腺','会阴','前庭大腺'] },
    // Chapter 9: 脉管系统 (心血管+淋巴)
    { chapter: '第九章 脉管系统', keywords: ['心脏','动脉','静脉','毛细血管','主动脉','肺动脉','颈总动脉','锁骨下动脉','肱动脉','桡动脉','股动脉','门静脉','淋巴','胸导管','心包','冠状','室间隔'] },
    // Chapter 10: 感觉器
    { chapter: '第十章 感觉器', keywords: ['眼球','角膜','虹膜','晶状体','视网膜','鼓膜','听小骨','耳蜗','前庭','半规管','味蕾','嗅神经','瞳孔','睫状体'] },
    // Chapter 11: 神经系统
    { chapter: '第十一章 神经系统', keywords: ['脑','脊髓','神经','中枢','周围','大脑','小脑','间脑','中脑','脑桥','延髓','丘脑','下丘脑','基底','内囊','锥体','脑室','脑脊液','硬膜','蛛网膜','脊神经','脑神经','迷走','交感','副交感','反射弧','传导','感觉','运动','躯体','内脏神经'] },
    // Chapter 12: 内分泌系统
    { chapter: '第十二章 内分泌系统', keywords: ['垂体','甲状腺','甲状旁腺','肾上腺','松果体','胸腺','胰岛','内分泌腺'] },
  ];

  let assigned = 0;
  for (const q of jsQuestions) {
    if (q.chapter) continue;
    const text = (q.q || q.question || '') + ' ' + (q.cn || q.cardName || '');
    for (const tp of topicPatterns) {
      for (const kw of tp.keywords) {
        if (text.includes(kw)) {
          q.chapter = tp.chapter;
          assigned++;
          break;
        }
      }
      if (q.chapter) break;
    }
  }
  console.log(`  SysAnat topic-based: ${assigned} questions assigned chapters`);
  return jsQuestions;
}

function writeSysAnatJS(filePath, questions) {
  let content = fs.readFileSync(filePath, 'utf8');
  // For sys-anat, need to update inline JSON within the IIFE
  // Strategy: rebuild the entire file
  const header = content.substring(0, content.indexOf('MediCard.QuestionBank[\'systematic-anatomy\']'));
  const footer = '\n  ];\n\n  window.MediCard = MediCard;\n})();\n';

  // Group by difficulty
  const groups = { common: [], rare: [], epic: [], legendary: [] };
  for (const q of questions) {
    const d = q.difficulty || 'common';
    if (groups[d]) groups[d].push(q);
  }

  let out = header;
  const labels = { common: '普通题 (common)', rare: '稀有题 (rare)', epic: '史诗题 (epic)', legendary: '传说题 (legendary)' };
  for (const d of ['common', 'rare', 'epic', 'legendary']) {
    const arr = groups[d];
    out += `\n    // ========== ${labels[d]} (${arr.length}题) ==========\n`;
    for (const q of arr) {
      out += '    ' + JSON.stringify(q) + ',\n';
    }
  }
  out = out.replace(/,\n$/, '\n'); // Remove trailing comma
  out += footer;
  fs.writeFileSync(filePath, out, 'utf8');
  console.log(`  Written: ${filePath}`);
}

// ── Cell Biology ──
// No source .txt — use knowledgePoint patterns to assign chapters
function assignCellBioChapters(jsQuestions) {
  const topicPatterns = [
    { chapter: '第一章 细胞膜与物质运输', keywords: ['膜','运输','转运','通道','载体','离子泵','内吞','外排','胞吞','胞吐','受体','信号','配体','G蛋白','流动镶嵌','被动运输','主动运输','钠钾泵','钙泵'] },
    { chapter: '第二章 内膜系统与蛋白质分选', keywords: ['内质网','高尔基','溶酶体','过氧化物酶体','线粒体','核糖体','蛋白质合成','信号肽','糖基化','分泌蛋白','囊泡','COP','网格蛋白'] },
    { chapter: '第三章 细胞核与染色体', keywords: ['细胞核','染色','DNA','RNA','基因','转录','复制','核仁','核膜','核孔','端粒','着丝粒','组蛋白','核小体','基因组'] },
    { chapter: '第四章 细胞骨架', keywords: ['微管','微丝','中间纤维','肌动蛋白','肌球蛋白','驱动蛋白','动力蛋白','中心粒','纤毛','鞭毛','细胞骨架'] },
    { chapter: '第五章 细胞增殖与周期调控', keywords: ['细胞周期','有丝分裂','减数分裂','G1期','G2期','S期','M期','CDK','周期蛋白','纺锤体','着丝点','MPF'] },
    { chapter: '第六章 细胞分化与凋亡', keywords: ['分化','凋亡','程序性死亡','干细胞','caspase','Bcl-2','p53','衰老','坏死'] },
  ];

  let assigned = 0;
  for (const q of jsQuestions) {
    const text = (q.question || '') + ' ' + (q.knowledgePoint || '') + ' ' + (q.tags || []).join(' ');
    for (const tp of topicPatterns) {
      for (const kw of tp.keywords) {
        if (text.includes(kw)) {
          q.chapter = tp.chapter;
          assigned++;
          break;
        }
      }
      if (q.chapter) break;
    }
    if (!q.chapter) {
      q.chapter = '其他';
      assigned++;
    }
  }
  console.log(`  CellBio: ${assigned}/${jsQuestions.length} questions assigned chapters`);
  return jsQuestions;
}

function writeCellBioJS(filePath, questions) {
  let content = fs.readFileSync(filePath, 'utf8');
  const jsonStr = JSON.stringify(questions, null, 2);
  const newContent = content.replace(
    /(MediCard\.QuestionBank\['cell-biology'\]\s*=\s*)\[[\s\S]*?\];/,
    '$1' + jsonStr + ';'
  );
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`  Written: ${filePath}`);
}

// ── Main ──

console.log('=== Adding Chapter Fields to Question Bank ===\n');

// 1. Pathology
console.log('[1/3] Pathology (病理学)...');
const pathoJS = parseJSArray(ROOT + '/src/modules/question-bank/subjects/pathology.js', 'pathology');
if (pathoJS) {
  console.log(`  Loaded ${pathoJS.length} questions from pathology.js`);
  const pathoTxt = parsePathologyTxt(ROOT + '/病理题题库.txt');
  const updatedPatho = matchChapters(pathoJS, pathoTxt);
  writeJSSubjectFile(ROOT + '/src/modules/question-bank/subjects/pathology.js', 'pathology', updatedPatho);
}

// 2. Systematic Anatomy
console.log('\n[2/3] Systematic Anatomy (系统解剖学)...');
const sysAnatPath = ROOT + '/src/modules/question-bank/subjects/systematic-anatomy.js';
const sysAnatQuestions = parseJSArray(sysAnatPath, 'systematic-anatomy');
if (sysAnatQuestions) {
  console.log(`  Loaded ${sysAnatQuestions.length} questions from systematic-anatomy.js`);
  const suppChapters = parseSysAnatSupp(ROOT + '/系解题库补充.txt');
  const matched = matchSysAnatChapters(sysAnatQuestions, suppChapters);
  const final = assignSysAnatChaptersByTopic(matched);
  writeJSSubjectFile(sysAnatPath, 'systematic-anatomy', final);
}

// 3. Cell Biology
console.log('\n[3/3] Cell Biology (细胞生物学)...');
const cellBioPath = ROOT + '/src/modules/question-bank/subjects/cell-biology.js';
const cellBioQuestions = parseJSArray(cellBioPath, 'cell-biology');
if (cellBioQuestions) {
  console.log(`  Loaded ${cellBioQuestions.length} questions from cell-biology.js`);
  const final = assignCellBioChapters(cellBioQuestions);
  writeJSSubjectFile(cellBioPath, 'cell-biology', final);
}

console.log('\n=== Done. Verify with: node --check on the modified files ===');
