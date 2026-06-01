const fs = require('fs');
const src = fs.readFileSync('src/modules/question-bank/subjects/microbiology.js', 'utf-8');

console.log('File size:', src.length, 'bytes');
console.log('Lines:', src.split('\n').length);

// Count IDs
const idMatches = [...src.matchAll(/"id":"([^"]+)"/g)];
console.log('Total questions (by ID):', idMatches.length);

// Check difficulty distribution
const diffs = {};
for (const m of [...src.matchAll(/"difficulty":"([^"]+)"/g)]) {
  diffs[m[1]] = (diffs[m[1]] || 0) + 1;
}
console.log('Difficulty distribution:', JSON.stringify(diffs));

// Check card type distribution
const cts = {};
for (const m of [...src.matchAll(/"cardType":"([^"]+)"/g)]) {
  cts[m[1]] = (cts[m[1]] || 0) + 1;
}
console.log('Card type distribution:', JSON.stringify(cts));

// Check answers
let badAnswers = 0;
for (const m of [...src.matchAll(/"correctAnswers":\[([^\]]+)\]/g)]) {
  if (!/^"([A-E])"$/.test(m[1])) {
    badAnswers++;
    if (badAnswers <= 5) console.log('Bad answer format:', m[1]);
  }
}
console.log('Bad answers:', badAnswers);

// Check explanations
let badExplanations = 0;
for (const m of [...src.matchAll(/"explanation":"([^"]+)"/g)]) {
  if (!m[1].startsWith('正确答案为')) {
    badExplanations++;
    if (badExplanations <= 3) console.log('Bad explanation:', m[1].substring(0, 80));
  }
}
console.log('Bad explanations:', badExplanations);

// Check for option-answer consistency (spot check - every 50th question)
const blocks = src.split('"id":"');
let optMismatches = 0;
for (let i = 1; i < blocks.length; i += 50) {
  const block = blocks[i];
  const optMatch = block.match(/"options":\[([^\]]+)\]/);
  const ansMatch = block.match(/"correctAnswers":\[([^\]]+)\]/);
  if (optMatch && ansMatch) {
    const opts = optMatch[1];
    const ans = ansMatch[1].replace(/"/g, '');
    if (!opts.includes('"' + ans + '.')) {
      optMismatches++;
      const qMatch = block.match(/"question":"([^"]+)"/);
      console.log('Option mismatch:', ans, 'Q:', (qMatch ? qMatch[1].substring(0, 60) : '?'));
    }
  }
}
console.log('Option mismatches (sampled):', optMismatches);

// Verify IIFE structure
const startsOK = src.startsWith('/**');
const hasIIFE = src.includes('(function() {');
const hasEnd = src.endsWith('})();\n');
const hasQuestionBank = src.includes("MediCard.QuestionBank['microbiology']");
console.log('Structure OK:', { startsOK, hasIIFE, hasEnd, hasQuestionBank });

// Verify each question has required fields
const requiredFields = ['subject', 'subjectId', 'difficulty', 'questionType', 'cardType', 'cardName', 'energyCost', 'cardEffect', 'question', 'options', 'correctAnswers', 'explanation', 'textbookReference', 'knowledgePoint', 'tags', 'chapter'];
const missing = {};
for (const field of requiredFields) {
  const re = new RegExp('"' + field + '":', 'g');
  const matches = [...src.matchAll(re)];
  if (matches.length < idMatches.length) {
    missing[field] = matches.length;
  }
}
console.log('Fields with wrong count:', Object.keys(missing).length > 0 ? JSON.stringify(missing) : 'none');

// Check for duplicate IDs
const ids = [];
for (const m of idMatches) ids.push(m[1]);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  const seen = new Set();
  const dupes = [];
  for (const id of ids) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  console.log('Duplicate IDs:', dupes.slice(0, 5));
} else {
  console.log('Duplicate IDs: none');
}

// Check chapter field presence
let chapterCount = 0;
for (const m of [...src.matchAll(/"chapter":"([^"]+)"/g)]) {
  chapterCount++;
}
console.log('Questions with chapter field:', chapterCount);

console.log('\n=== Validation complete ===');
