/**
 * Parse 系解题库.txt — 系统解剖学题库
 * Extracts all single-choice and true/false questions
 * Converts to MediCard game question bank format
 * Reports any malformed or problematic questions
 */
const fs = require('fs');

const INPUT = '/home/ubuntu/medcardgame/系解题库.txt';
const OUTPUT = '/home/ubuntu/medcardgame/src/modules/question-bank/subjects/systematic-anatomy.js';

// ============ Read & Parse ============
const raw = fs.readFileSync(INPUT, 'utf-8');
const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('###'));

console.log(`Total non-header/non-blank lines: ${lines.length}`);

const questions = [];
const errors = [];
const stats = { choice: 0, truefalse: 0, malformed: 0, skipped: 0 };

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const parts = line.split('|');

  if (parts.length === 0) {
    stats.skipped++;
    continue;
  }

  // Detect question type by checking last non-empty field
  const nonEmptyParts = parts.filter(p => p.trim().length > 0);

  if (nonEmptyParts.length === 0) {
    stats.skipped++;
    continue;
  }

  const lastField = nonEmptyParts[nonEmptyParts.length - 1].trim();

  // True/false: last field is "正确" or "错误", or second-to-last is "正确/错误"
  // Format: statement|正确|correction  OR  statement|错误|correction
  if (lastField === '正确' || lastField === '错误') {
    // This is a true/false question
    const statement = parts[0].trim();
    const answer = lastField;
    const correction = parts.length >= 3 ? parts.slice(1, -1).join('|').trim() : '';

    if (statement.length < 5) {
      errors.push(`Line ${i+1}: True/false statement too short: "${statement}"`);
      stats.malformed++;
      continue;
    }

    questions.push({
      sourceLine: i + 1,
      type: 'truefalse',
      question: statement,
      answer: answer,
      correction: correction || null
    });
    stats.truefalse++;
    continue;
  }

  // Check if last field is a single letter A-E (single choice)
  if (/^[A-E]$/.test(lastField) && nonEmptyParts.length >= 6) {
    // Should have: question | A | B | C | D | E | answer
    // But options may have pipe characters too (rare)
    // Let's check: if we have exactly 7 pipe-delimited fields with last being A-E
    if (parts.length === 7) {
      const questionText = parts[0].trim();
      const options = [
        parts[1].trim(),
        parts[2].trim(),
        parts[3].trim(),
        parts[4].trim(),
        parts[5].trim()
      ];
      const correctLetter = parts[6].trim();

      // Validate
      if (questionText.length < 3) {
        errors.push(`Line ${i+1}: Question text too short: "${questionText}"`);
        stats.malformed++;
        continue;
      }

      if (!/^[A-E]$/.test(correctLetter)) {
        errors.push(`Line ${i+1}: Invalid answer letter: "${correctLetter}"`);
        stats.malformed++;
        continue;
      }

      const optLetters = ['A','B','C','D','E'];
      const correctIdx = optLetters.indexOf(correctLetter);

      questions.push({
        sourceLine: i + 1,
        type: 'choice',
        question: questionText,
        options: options,
        correctAnswer: correctLetter,
        correctIndex: correctIdx,
        correctText: options[correctIdx]
      });
      stats.choice++;
      continue;
    }
  }

  // Check for multi-option format (A1/A2/A3/B1 types with more than 5 options)
  // These are still single choice but with different option counts
  if (/^[A-E]$/.test(lastField) && nonEmptyParts.length >= 3) {
    // Variable number of options
    const questionText = parts[0].trim();
    // Options are everything between first and last field
    const optionFields = parts.slice(1, -1).filter(p => p.trim().length > 0);
    const correctLetter = lastField;

    if (optionFields.length >= 2 && optionFields.length <= 6) {
      // Map option letters A, B, C, ...
      const letters = optionFields.map((_, idx) => String.fromCharCode(65 + idx));
      const correctIdx = letters.indexOf(correctLetter);

      if (correctIdx < 0) {
        errors.push(`Line ${i+1}: Answer ${correctLetter} not in options range (${letters.join('')}), ${optionFields.length} options`);
        stats.malformed++;
        continue;
      }

      questions.push({
        sourceLine: i + 1,
        type: 'choice',
        question: questionText,
        options: optionFields,
        correctAnswer: correctLetter,
        correctIndex: correctIdx,
        correctText: optionFields[correctIdx]
      });
      stats.choice++;
      continue;
    }
  }

  // If we get here, the format is unrecognized
  errors.push(`Line ${i+1}: Unrecognized format (parts=${parts.length}, last="${lastField}"): ${line.substring(0, 80)}...`);
  stats.malformed++;
}

console.log(`\n=== Parse Results ===`);
console.log(`Single-choice questions: ${stats.choice}`);
console.log(`True/false questions:    ${stats.truefalse}`);
console.log(`Malformed/skipped:       ${stats.malformed}`);
console.log(`Total valid:             ${questions.length}`);
console.log(`\nErrors: ${errors.length}`);

// Report errors
if (errors.length > 0) {
  console.log(`\n=== ERRORS (${errors.length}) ===`);
  errors.forEach(e => console.log(`  ⚠️  ${e}`));
}

// Report option count distribution for choice questions
const optDist = {};
questions.filter(q => q.type === 'choice').forEach(q => {
  const n = q.options.length;
  optDist[n] = (optDist[n] || 0) + 1;
});
console.log(`\n=== Option count distribution (choice questions) ===`);
Object.keys(optDist).sort().forEach(k => {
  console.log(`  ${k} options: ${optDist[k]} questions`);
});

// Sample output
console.log(`\n=== Sample questions ===`);
questions.slice(0, 3).forEach(q => console.log(JSON.stringify(q, null, 2)));
if (questions.length > 100) {
  questions.slice(100, 103).forEach(q => console.log(JSON.stringify(q, null, 2)));
}
if (stats.truefalse > 0) {
  console.log(`\n=== Sample true/false ===`);
  questions.filter(q => q.type === 'truefalse').slice(0, 3).forEach(q => console.log(JSON.stringify(q, null, 2)));
}

// ============ Export summary ============
fs.writeFileSync('/tmp/xijie_parse_summary.json', JSON.stringify({ stats, errorCount: errors.length, totalQuestions: questions.length, optDist, sampleChoice: questions.filter(q => q.type === 'choice').slice(0, 3), sampleTF: questions.filter(q => q.type === 'truefalse').slice(0, 3) }, null, 2));
console.log(`\nSummary written to /tmp/xijie_parse_summary.json`);
console.log(`Total valid questions to import: ${questions.length}`);
