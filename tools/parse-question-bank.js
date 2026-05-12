/**
 * MediCard 医杀 — Question Bank Parser V2
 * Parses 病理题题库.txt and 生理学题库.txt into game-format .js files
 */
const fs = require('fs');
const path = require('path');

const BASE = '/home/ubuntu/medcardgame';
const INPUTS = [
  { file: '病理题题库.txt', subject: '病理学', subjectId: 'pathology' },
  { file: '生理学题库.txt', subject: '生理学', subjectId: 'physiology' },
];
const OUTPUT_DIR = path.join(BASE, 'src/modules/question-bank/subjects');

const report = {
  pathology: { truefalse: 0, single: 0, multiple: 0, skipped: 0, errors: [] },
  physiology: { truefalse: 0, single: 0, multiple: 0, skipped: 0, errors: [] },
};

// ── Knowledge point extraction ──────────────────────────────
const KP_KEYWORDS = [
  // Pathology
  '充血','淤血','血栓','栓塞','梗死','水肿','出血','坏死','凋亡','变性','萎缩',
  '化生','增生','肥大','再生','修复','肉芽','炎症','肿瘤','癌','肉瘤','转移',
  '动脉','静脉','毛细血管','微循环','心力衰竭','肺水肿','肺褐色硬化',
  '槟榔肝','DIC','栓子','减压病','羊水栓塞','脂肪栓塞','气体栓塞',
  '白色血栓','混合血栓','红色血栓','透明血栓','机化','钙化','静脉石',
  '贫血性梗死','出血性梗死','凝固性坏死','液化性坏死','坏疽',
  '慢性肺淤血','慢性肝淤血','心衰细胞','心力衰竭细胞',
  '胃溃疡','十二指肠溃疡','慢性胃炎','萎缩性胃炎','肠上皮化生',
  'Crohn病','溃疡性结肠炎','阑尾炎','胰腺炎','胆囊炎','胆石',
  '病毒性肝炎','肝硬化','门脉高压','毛玻璃样肝细胞','嗜酸性小体',
  '肝癌','胰腺癌','胃癌','大肠癌','食管癌','肺癌','鼻咽癌',
  '大叶性肺炎','小叶性肺炎','支气管肺炎','间质性肺炎','病毒性肺炎',
  '硅肺','石棉肺','ARDS','肺气肿','慢性支气管炎','支气管扩张','支气管哮喘',
  '鳞癌','腺癌','小细胞癌','类癌',
  // Physiology
  '渗透压','胶体渗透压','红细胞','白细胞','血小板','血沉','比容',
  '凝血酶','纤维蛋白原','纤溶','抗凝血酶','肝素','FⅫ','FⅩ',
  '内源性凝血','外源性凝血','血型','凝集素','凝集原','Rh血型',
  '静息电位','动作电位','去极化','复极化','阈电位','钠泵','钙泵',
  '局部电位','突触后电位','终板电位','EPSP','IPSP',
  '神经递质','受体','突触','反射','牵张反射','腱反射','肌紧张',
  '脊休克','去大脑僵直','姿势反射','翻正反射',
  '感觉投射','特异性投射','非特异性投射','体表感觉','本体感觉',
  '痛觉','内脏痛','牵涉痛','视觉','听觉','嗅觉','味觉',
  '运动神经元','α运动神经元','γ运动神经元','肌梭','腱器官',
  '基底神经节','小脑','前庭','大脑皮层','运动区',
  '自主神经','交感神经','副交感神经','胆碱能','肾上腺素能',
  '下丘脑','体温','调定点','产热','散热',
  '心动周期','心输出量','射血分数','心力储备','心室','心房',
  '动脉血压','收缩压','舒张压','中心静脉压','微循环',
  '呼吸','肺通气','肺泡','顺应性','表面活性物质','潮气量',
  '消化','胃酸','胃液','胰液','胆汁','吸收','小肠',
  '肾小球滤过','肾小管重吸收','GFR','ADH','醛固酮','RAAS',
  '激素','胰岛素','胰高血糖素','甲状腺激素','皮质醇','生长激素',
  '钙磷代谢','PTH','维生素D','降钙素',
];

function extractKnowledge(text) {
  // Score each keyword by presence in text
  let best = null;
  let bestLen = 0;
  for (const kw of KP_KEYWORDS) {
    if (text.includes(kw) && kw.length > bestLen) {
      best = kw;
      bestLen = kw.length;
    }
  }
  if (best) return best;
  // Fallback: first meaningful phrase
  const clean = text.replace(/^下列关于|^关于|^下列|的描述|的描述,|的叙述|的叙述,|,错误的是|,正确的是/g, '');
  return clean.substring(0, 20).replace(/[，,。.]/g, '');
}

// ── Option line parser ──────────────────────────────────────
function parseOptionsFromLine(line) {
  // Parse "A.xxx  B.xxx  C.xxx" or "A.xxx B.xxx C.xxx" format
  const options = [];
  // Match each option: letter.delimiter followed by text until next option or end
  const re = /([A-E])[\.\s]\s*(.+?)(?=\s*[A-E][\.\s]|$)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    options.push(m[1] + '. ' + m[2].trim());
  }
  if (options.length > 0) return options;

  // Fallback: single option at start of line
  const sm = line.match(/^([A-E])[\.\s]\s*(.+)$/);
  if (sm) {
    options.push(sm[1] + '. ' + sm[2].trim());
  }
  return options;
}

function isOptionLine(line) {
  return /^[A-E][\.\s]/.test(line) || /^[A-E]\s/.test(line);
}

function isAnswerLine(line) {
  return /(?:^答案[：:]|^\*\*答案[：:]|^【答案】)/.test(line.trim());
}

function parseAnswer(ansRaw) {
  return ansRaw.replace(/\*\*/g,'').replace(/[【】]/g,'').replace(/.*[：:]/, '').trim().split('').filter(c => /[A-E]/.test(c));
}

// ── Pathology Parser ────────────────────────────────────────
function parsePathology(text) {
  const questions = [];
  const lines = text.split(/\r?\n/);
  let section = null;
  let mode = 'old';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Section headers
    if (/^[一二三四五六七八九十]、判断题/.test(line) || /^## 一、判断题/.test(line)) {
      section = 'truefalse';
      mode = line.includes('｜') ? 'new' : 'old';
      continue;
    }
    if (/^[二三四五六七八九十]、选择题/.test(line) || /^## 二、选择题/.test(line)) {
      section = 'single';
      mode = line.includes('｜') ? 'new' : 'old';
      continue;
    }
    if (/^### 【A[12]型题】/.test(line)) {
      section = 'single';
      mode = 'new';
      continue;
    }

    // True/False (old format with (√)/(×))
    if (section === 'truefalse' && mode === 'old') {
      const m = line.match(/^(\d+)\.\s*(.+?)\s*[（(]([√×])[）)]\s*$/);
      if (m) {
        questions.push({
          sourceType: 'truefalse',
          question: m[2].trim(),
          options: ['A. 正确', 'B. 错误'],
          correctAnswers: [m[3] === '√' ? 'A' : 'B'],
          knowledgePoint: extractKnowledge(m[2]),
        });
        report.pathology.truefalse++;
      }
    }
    // True/False (new format with ｜)
    if (section === 'truefalse' && mode === 'new') {
      const m = line.match(/^(\d+)\.\s*(.+?)｜([√×])$/);
      if (m) {
        questions.push({
          sourceType: 'truefalse',
          question: m[2].trim(),
          options: ['A. 正确', 'B. 错误'],
          correctAnswers: [m[3] === '√' ? 'A' : 'B'],
          knowledgePoint: extractKnowledge(m[2]),
        });
        report.pathology.truefalse++;
      }
    }

    // Single choice (old format: bullet options + 答案：X)
    if (section === 'single' && mode === 'old') {
      const qMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (qMatch) {
        const qText = qMatch[2];
        const options = [];
        let j = i + 1;
        while (j < lines.length && j < i + 15) {
          const ol = lines[j].trim();
          if (!ol) { j++; continue; }
          if (ol.startsWith('答案：')) {
            const correctAnswers = parseAnswer(ol);
            if (correctAnswers.length > 0) {
              const qType = correctAnswers.length > 1 ? 'multiple' : 'single';
              questions.push({ sourceType: qType, question: qText, options: [...options], correctAnswers, knowledgePoint: extractKnowledge(qText) });
              if (qType === 'multiple') report.pathology.multiple++; else report.pathology.single++;
              i = j;
            }
            break;
          }
          const parsed = parseOptionsFromLine(ol.replace(/^[•••]\s*/, ''));
          if (parsed.length > 0) {
            options.push(...parsed);
          } else if (ol.match(/^[A-E]\s/)) {
            const l = ol.charAt(0);
            options.push(l + '. ' + ol.substring(1).trim());
          }
          j++;
        }
        i = j;
      }
    }

    // Single choice (new format: ｜ delimiter)
    if (section === 'single' && mode === 'new') {
      // "1. question｜A. opt1 B. opt2｜C"
      const m = line.match(/^(\d+)\.\s*(.+?)｜(.+?)｜([A-E]+)$/);
      if (m) {
        const qText = m[2].trim();
        const optsRaw = m[3];
        const answerRaw = m[4];
        const options = parseOptionsFromLine(optsRaw);
        const correctAnswers = answerRaw.split('').filter(c => /[A-E]/.test(c));
        if (options.length >= 2 && correctAnswers.length > 0) {
          const qType = correctAnswers.length > 1 ? 'multiple' : 'single';
          questions.push({ sourceType: qType, question: qText, options, correctAnswers, knowledgePoint: extractKnowledge(qText) });
          if (qType === 'multiple') report.pathology.multiple++; else report.pathology.single++;
        }
      }
    }
  }
  return questions;
}

// ── Physiology Parser ────────────────────────────────────────
function parsePhysiology(text) {
  const questions = [];
  const lines = text.split(/\r?\n/);
  let section = null; // 'single' | 'multiple' | 'truefalse' | 'btype'
  let chapterName = '';
  let sharedOptions = []; // For B-type questions

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Chapter header (single # or ## without brackets)
    if (/^# [^#]/.test(line)) {
      chapterName = line.replace(/^#+\s*/, '').replace(/选择题.*$/, '').trim();
      continue;
    }
    if (/^## [^#]/.test(line) && !/型题/.test(line)) {
      chapterName = line.replace(/^##\s*/, '').replace(/选择题.*$/, '').trim();
      continue;
    }

    // Section type detection (handles ##, ####, 【】 formats)
    if (/A[₁1₂2]*型题/.test(line)) {
      section = 'single';
      sharedOptions = [];
      continue;
    }
    if (/B型题/.test(line)) {
      section = 'btype';
      sharedOptions = [];
      continue;
    }
    if (/X型题|多选题/.test(line)) {
      section = 'multiple';
      sharedOptions = [];
      continue;
    }
    if (/判断题/.test(line)) {
      section = 'truefalse';
      continue;
    }

    // B-type group reset: "(XX~XX题共用备选答案）" or similar parenthetical
    if (section === 'btype' && /^\(/.test(line) && /题共用/.test(line)) {
      sharedOptions = [];
      continue;
    }

    // B-type shared options: accumulate across multiple lines until question number
    if (section === 'btype' && isOptionLine(line) && !/^\d+\./.test(line)) {
      const parsed = parseOptionsFromLine(line);
      if (parsed.length >= 1) {
        for (const p of parsed) sharedOptions.push(p);
      }
      continue;
    }

    // Parse numbered question (all types)
    if ((section === 'single' || section === 'multiple' || section === 'btype') && /^\d+\./.test(line)) {
      const qMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (!qMatch) continue;
      const qText = qMatch[2];
      const options = section === 'btype' ? [...sharedOptions] : [];
      let answerLine = null;
      let j = i + 1;
      while (j < lines.length && j < i + 25) {
        const ol = lines[j].trim();
        if (!ol) { j++; continue; }
        if (isAnswerLine(ol)) {
          answerLine = ol;
          i = j;
          break;
        }
        // Stop if we hit the next question number
        if (/^\d+\.\s/.test(ol)) break;
        // Option line: could contain multiple options inline
        if (isOptionLine(ol)) {
          const parsed = parseOptionsFromLine(ol);
          if (parsed.length > 0) {
            options.push(...parsed);
          }
        } else if (ol.startsWith('•') || ol.startsWith('-')) {
          const clean = ol.replace(/^[•\-]\s*/, '');
          const parsed = parseOptionsFromLine(clean);
          if (parsed.length > 0) options.push(...parsed);
        }
        j++;
      }
      // Validate
      if (answerLine && options.length >= 2) {
        const correctAnswers = parseAnswer(answerLine);
        if (correctAnswers.length > 0) {
          const qType = section === 'multiple' ? 'multiple' : (correctAnswers.length > 1 ? 'multiple' : 'single');
          questions.push({
            sourceType: qType,
            question: qText,
            options,
            correctAnswers,
            knowledgePoint: extractKnowledge(qText),
            chapter: chapterName,
          });
          if (qType === 'multiple') report.physiology.multiple++; else report.physiology.single++;
        } else {
          report.physiology.errors.push(`Could not parse answer: ${answerLine}`);
          report.physiology.skipped++;
        }
      } else if (answerLine && options.length < 2) {
        report.physiology.errors.push(`Too few options (${options.length}): ${qText.substring(0,40)}`);
        report.physiology.skipped++;
      } else if (!answerLine) {
        report.physiology.skipped++;
      }
      i = j;
    }
  }
  return questions;
}

// ── Game format generation ───────────────────────────────────
function classifyDifficulty(idx, total) {
  const ratio = idx / total;
  if (ratio < 0.50) return 'common';
  if (ratio < 0.80) return 'rare';
  if (ratio < 0.95) return 'epic';
  return 'legendary';
}

const CARD_POOLS = {
  single:   ['attack','attack','attack','defense','defense','heal','attack','special'],
  truefalse:['defense','heal','attack','defense','heal','attack'],
  multiple: ['attack','defense','heal','special','attack'],
};

function pickCardType(qType, idx) {
  const pool = CARD_POOLS[qType] || CARD_POOLS.single;
  return pool[idx % pool.length];
}

const CARD_NAMES = {
  attack:  { pathology: ['病理攻击','坏死侵袭','变性打击','炎症风暴','分子病损'], physiology: ['生理挑战','稳态破坏','反射干扰','信号阻断','通道异常'] },
  defense: { pathology: ['病理防御','修复屏障','再生护盾','免疫防线','纤维包裹'], physiology: ['生理防御','稳态维持','代偿反应','适应保护','负反馈调控'] },
  heal:    { pathology: ['病理修复','组织再生','细胞恢复','炎症消退','坏死吸收'], physiology: ['生理恢复','平衡调节','机能修复','代偿恢复','自愈反应'] },
  special: { pathology: ['病理诊断','镜下判读','标本分析','分子检测','免疫组化'], physiology: ['生理测试','机能评估','机制解析','实验推演','数据判读'] },
};

function generateCardName(subject, cardType) {
  const cat = subject === '病理学' ? 'pathology' : 'physiology';
  const pool = CARD_NAMES[cardType]?.[cat] || CARD_NAMES.attack[cat];
  return pool[Math.floor(Math.random() * pool.length)];
}

const CARD_EFFECTS = {
  attack:  { common:'造成2点伤害', rare:'造成3点伤害', epic:'造成4点伤害', legendary:'造成5点伤害' },
  defense: { common:'获得2点护盾', rare:'获得3点护盾', epic:'获得4点护盾', legendary:'获得5点护盾' },
  heal:    { common:'恢复2点HP', rare:'恢复3点HP', epic:'恢复4点HP', legendary:'恢复5点HP' },
  special: { common:'摸1张牌', rare:'查看牌库顶2张牌', epic:'额外攻击一次', legendary:'造成3点伤害并摸1张牌' },
};

function generateGameFile(subject, subjectId, questions) {
  const total = questions.length;
  const lines = [];
  lines.push(`/**`);
  lines.push(` * ${subject} 题目集 — ${total}题 (从教材习题集提取)`);
  lines.push(` * 难度分布: common(~${Math.round(total*0.5)}) / rare(~${Math.round(total*0.3)}) / epic(~${Math.round(total*0.15)}) / legendary(~${Math.round(total*0.05)})`);
  lines.push(` */`);
  lines.push(`(function() {`);
  lines.push(`  var MediCard = window.MediCard || {};`);
  lines.push(`  MediCard.QuestionBank = MediCard.QuestionBank || {};`);
  lines.push(``);
  lines.push(`  MediCard.QuestionBank['${subjectId}'] = [`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const diff = classifyDifficulty(i, total);
    const qType = q.sourceType;
    const cardType = pickCardType(qType, i);
    const cardName = generateCardName(subject, cardType);
    const cardEffect = CARD_EFFECTS[cardType]?.[diff] || CARD_EFFECTS.attack[diff];
    const energyCost = { common:1, rare:2, epic:3, legendary:4 }[diff];
    const id = `${subjectId}-${diff.substring(0,4)}-${String(i+1).padStart(3,'0')}`;

    const obj = {
      id, subject, subjectId,
      difficulty: diff,
      questionType: qType,
      cardType, cardName, energyCost, cardEffect,
      question: q.question,
      options: q.options,
      correctAnswers: q.correctAnswers,
      explanation: q.knowledgePoint ? `知识点：${q.knowledgePoint}` : '详见教材习题集',
      textbookReference: `《${subject}学习指导与习题集》`,
      knowledgePoint: q.knowledgePoint || '',
      tags: q.knowledgePoint ? [q.knowledgePoint] : [subject],
    };
    if (q.chapter) obj.chapter = q.chapter;

    lines.push('    ' + JSON.stringify(obj) + ',');
  }

  lines.push(`  ];`);
  lines.push(`})();`);
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────
function main() {
  console.log('═══ MediCard Question Bank Parser V2 ═══\n');

  for (const input of INPUTS) {
    const filePath = path.join(BASE, input.file);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${input.file}`);
      continue;
    }

    console.log(`📖 Parsing: ${input.file} (${input.subject})...`);
    const text = fs.readFileSync(filePath, 'utf-8');

    let questions;
    if (input.subjectId === 'pathology') {
      questions = parsePathology(text);
    } else if (input.subjectId === 'physiology') {
      questions = parsePhysiology(text);
    }

    const r = report[input.subjectId];
    console.log(`   ✅ Extracted ${questions.length} questions`);
    console.log(`      判断(truefalse): ${r.truefalse}`);
    console.log(`      单选(single):    ${r.single}`);
    console.log(`      多选(multiple):  ${r.multiple}`);
    if (r.skipped > 0) console.log(`      ⚠ Skipped:       ${r.skipped}`);

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const q of questions) {
      const key = q.question.substring(0, 80);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(q);
      }
    }
    if (unique.length < questions.length) {
      console.log(`   📊 After dedup: ${unique.length} unique (${questions.length - unique.length} duplicates removed)`);
    }

    // Validate options
    const badOpts = unique.filter(q => q.options.length < 2 || q.options.length > 5);
    if (badOpts.length > 0) {
      console.log(`   ⚠ ${badOpts.length} questions with unusual option count:`);
      badOpts.slice(0,5).forEach(q => console.log(`      - [${q.options.length} opts] ${q.question.substring(0,50)}`));
      if (badOpts.length > 5) console.log(`      ... and ${badOpts.length - 5} more`);
    }

    // Generate output
    const output = generateGameFile(input.subject, input.subjectId, unique);
    const outPath = path.join(OUTPUT_DIR, `${input.subjectId}.js`);
    fs.writeFileSync(outPath, output, 'utf-8');
    console.log(`   💾 Written: ${input.subjectId}.js (${(output.length/1024).toFixed(1)} KB)\n`);
  }

  console.log('═══ Summary ═══');
  for (const input of INPUTS) {
    const r = report[input.subjectId];
    console.log(`  ${input.subject}: ${r.truefalse + r.single + r.multiple} (判断:${r.truefalse} 单选:${r.single} 多选:${r.multiple} 跳过:${r.skipped})`);
  }
  console.log('\n✅ Done!');
}

main();
