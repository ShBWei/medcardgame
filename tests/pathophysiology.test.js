import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';

function setup(fetch) {
  const mc = { Config: { version: 'test' } };
  const ctx = { window: { MediCard: mc }, fetch, document, localStorage, console };
  vm.runInNewContext(readFileSync('src/modules/question-bank/question-loader.js', 'utf8'), ctx);
  return mc;
}

it('loads a cold subject through onSubjectReady without waiting on itself', async () => {
  localStorage.clear();
  const data = [{ id: 'p1', question: '含有 [Na+] 和 ] 的题干', options: ['A. x', 'B. y'], correctAnswers: ['A'] }];
  const fetch = vi.fn(async () => ({ ok: true, text: async () => "MediCard.QuestionBank['pathophysiology'] = " + JSON.stringify(data) + ';' }));
  const mc = setup(fetch);
  const callback = vi.fn();
  mc.QuestionLoader.onSubjectReady('pathophysiology', callback);
  await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(mc.QuestionLoader.getSubject('pathophysiology')[0].question).toBe(data[0].question);
});

it('includes self-review questions only for study, while preserving chapter filters', () => {
  const mc = setup();
  mc.QuestionLoader._cache.pathophysiology = [
    { id: 'a', chapter: '第一章', questionType: 'single' },
    { id: 'b', chapter: '第一章', questionType: 'subjective', studyOnly: true },
    { id: 'c', chapter: '第二章', questionType: 'single' },
  ];
  mc.QuestionLoader.setChapterFilter('pathophysiology', ['第一章']);
  expect(mc.QuestionLoader.getSubject('pathophysiology').map(q => q.id)).toEqual(['a']);
  expect(mc.QuestionLoader.getSubject('pathophysiology', { includeSubjective: true }).map(q => q.id)).toEqual(['a', 'b']);
});

it('preserves existing notebook subject codes and recognizes workbook IDs', () => {
  const mc = realBank();
  vm.runInNewContext(readFileSync('src/modules/question-bank/wrong-question-book.js', 'utf8'), { window: { MediCard: mc }, console });
  const book = mc.WrongQuestionBook;
  const legacy = ['cell-biology', 'biochemistry', 'physiology', 'pathology', 'histology-embryology', 'systematic-anatomy', 'immunology', 'microbiology'];
  legacy.forEach((subject, index) => {
    expect(book._decodeId(index + ':42')).toBe(subject + '_42');
    expect(book._encodeId(subject + '_42')).toBe(index + ':42');
  });
  expect(book._subjectFromId('pathophysiology-ch03-A-001')).toBe('pathophysiology');
  expect(book._subjectFromId('atk_0_pathophysiology-ch03-A-001')).toBe('pathophysiology');
});

function realBank() {
  const mc = setup();
  const context = { window: { MediCard: mc, location: { hostname: 'localhost', protocol: 'http:', port: '8092' } }, console };
  for (const file of ['config/deploy-config.js', 'question-bank/subjects/pathophysiology.js', 'card-system/card-data.js']) {
    vm.runInNewContext(readFileSync('src/modules/' + file, 'utf8'), context);
  }
  mc.QuestionLoader.loadSubject('pathophysiology');
  return mc;
}

it('imports all 1243 source questions with stable unique IDs and valid answer mappings', () => {
  const mc = realBank();
  const qs = mc.QuestionLoader.getSubject('pathophysiology', { includeSubjective: true });
  expect(qs).toHaveLength(1243);
  expect(new Set(qs.map(q => q.id)).size).toBe(qs.length);
  expect(qs.filter(q => q.studyOnly)).toHaveLength(385);
  expect(mc.QuestionLoader.getSubjectCount('pathophysiology')).toBe(858);
  expect(mc.Config.subjectMeta.pathophysiology.questionCount).toBe(qs.length);
  expect(mc.Config.subjectMeta.pathophysiology.battleQuestionCount).toBe(858);
  for (const q of qs) {
    expect(q.question.trim().length).toBeGreaterThan(1);
    expect(q.chapter).toBeTruthy();
    expect(mc.QuestionLoader._questionIndex[q.id]).toBeTruthy();
    for (const page of q.sourcePages.concat(q.answerPages)) {
      expect(existsSync('src/assets/pathophysiology/page-' + String(page).padStart(3, '0') + '.webp')).toBe(true);
    }
    if (q.studyOnly) {
      expect(q.options).toEqual([]);
      expect(q.correctAnswers).toEqual([]);
      expect(q.referenceAnswer.trim().length).toBeGreaterThan(10);
    } else {
      expect(q.options.map(o => o.slice(0, 3))).toEqual(['A. ', 'B. ', 'C. ', 'D. ', 'E. ']);
      expect(q.correctAnswers).toHaveLength(1);
      expect('ABCDE').toContain(q.correctAnswers[0]);
    }
  }
});

it('keeps experiment chapters available for study and out of battle selection', () => {
  const mc = realBank();
  expect(mc.QuestionLoader.getChapters('pathophysiology')).toHaveLength(20);
  const studyChapters = mc.QuestionLoader.getChapters('pathophysiology', { includeSubjective: true });
  expect(studyChapters).toHaveLength(21);
  const experiment = studyChapters.find(c => c.startsWith('第二十一章'));
  mc.QuestionLoader.setChapterFilter('pathophysiology', [experiment]);
  expect(mc.QuestionLoader.getSubject('pathophysiology')).toEqual([]);
  expect(mc.QuestionLoader.getSubject('pathophysiology', { includeSubjective: true })).toHaveLength(34);
  mc.QuestionLoader._selectedSubjects = new Set(['pathophysiology']);
  expect(mc.QuestionLoader.getSelectionStats().total).toBe(0);
});

it('generates complete playable decks from the new bank without subjective cards', () => {
  const mc = realBank();
  for (let i = 0; i < 30; i++) {
    const deck = mc.CardData.generateFullDeck(['pathophysiology'], mc.QuestionLoader);
    expect(deck.length).toBeGreaterThan(100);
    for (const card of deck) {
      expect(card.subjectId).toBe('pathophysiology');
      expect(card.questionType).toBe('single');
      expect(card.options).toHaveLength(5);
      expect(card.correctAnswers).toHaveLength(1);
      const q = mc.QuestionBank.pathophysiology.find(q => q.id === card.questionId);
      expect(q).toBeTruthy();
      expect(card.correctAnswers).toEqual(q.correctAnswers);
    }
  }
});
