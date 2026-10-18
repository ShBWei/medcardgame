import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { it, expect, vi, afterEach } from 'vitest';

function setup() {
  const mc = {
    Crypto: { escapeHtml: (s) => String(s || '') },
    Config: { subjectMeta: {} },
    QuestionLoader: { _chapterFilters: {} },
    FastLearnCore: { load: vi.fn(), _memory: {}, updateMemory: vi.fn() },
  };
  const context = {
    window: { MediCard: mc },
    MediCard: mc,
    document,
    console,
    localStorage,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
  };
  vm.runInNewContext(readFileSync('src/modules/ui-system/screen-study.js', 'utf8'), context);
  const study = mc.ScreenStudy;
  document.body.innerHTML = '<div id="study-main-area"></div><div id="study-feedback-area"></div>';
  study._currentSubject = 'medicine';
  study._progress = {};
  study._saveSubjectProgress = () => {};
  study._pushCorrectToLeaderboard = () => {};
  return { mc, study, context };
}
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

it('requires revealing a subjective answer before self-rating and never awards leaderboard points', () => {
  const { study, mc } = setup();
  const q = { id: 'essay-1', questionType: 'subjective', studyOnly: true, question: '解释缺氧', referenceAnswer: '原书答案', options: [], correctAnswers: [] };
  study._questions = [q];
  study._questionIndex = 0;
  study._selfReviewStates = {};
  study._questionHistory = [];
  study._updateHeaderForQuestion = vi.fn();
  study._scrollNavigatorToCurrent = vi.fn();
  study._sessionSelfReviewed = 0;
  study._sessionSelfMastered = 0;
  study._pushCorrectToLeaderboard = vi.fn();
  study._renderQuestion();
  expect(document.querySelector('#study-self-mastered')).toBeNull();
  document.querySelector('#study-reveal-answer').click();
  document.querySelector('#study-self-mastered').click();
  document.querySelector('#study-self-mastered').click();
  expect(study._sessionSelfReviewed).toBe(1);
  expect(study._sessionSelfMastered).toBe(1);
  expect(study._pushCorrectToLeaderboard).not.toHaveBeenCalled();
  expect(mc.FastLearnCore.updateMemory).toHaveBeenCalledTimes(1);
  study._renderQuestion();
  expect(document.querySelector('#study-self-mastered').disabled).toBe(true);
});

it('shows a self-review summary without a zero accuracy or leaderboard submission', () => {
  const { study } = setup();
  study._sessionAnswered = 0;
  study._sessionCorrect = 0;
  study._sessionWrongIds = [];
  study._sessionSelfReviewed = 2;
  study._sessionSelfMastered = 1;
  study._updateHeaderForSummary = vi.fn();
  study._pushStudyScoreToLeaderboard = vi.fn();
  study._showSessionSummary();
  expect(document.querySelector('.study-summary').textContent).not.toContain('0%');
  expect(document.querySelector('.study-summary').textContent).toContain('主观题自评 2 题');
  expect(study._pushStudyScoreToLeaderboard).not.toHaveBeenCalled();
});

it('does not build choice-only cache entries for subjective questions', () => {
  vi.useFakeTimers();
  const { study, context } = setup();
  vm.runInNewContext(readFileSync('src/modules/speed-engine.js', 'utf8'), context);
  expect(context.window.speedEngine._buildAndCache(study, { id: 'essay', questionType: 'subjective' }, 0)).toBeNull();
});

it('does not cache a nonexistent next question and invalidates another session at the same index', () => {
  vi.useFakeTimers();
  const { study, context } = setup();
  vm.runInNewContext(readFileSync('src/modules/speed-engine.js', 'utf8'), context);
  const engine = context.window.speedEngine;
  expect(() => engine._buildAndCache(study, undefined, 10)).not.toThrow();
  const q = { id: 'first', options: ['A. one', 'B. two'], correctAnswers: ['A'] };
  engine._buildAndCache(study, q, 0);
  const next = engine._buildAndCache(study, { ...q, id: 'next' }, 0);
  expect(next.id).toBe('next');
});

it('keeps wrong-answer feedback visible even in fast mode', () => {
  vi.useFakeTimers();
  const { study } = setup();
  const q = {
    id: 'q1',
    question: 'test',
    options: ['A. correct', 'B. wrong'],
    correctAnswers: ['A'],
  };
  study._questions = [q];
  study._currentShuffled = [
    { letter: 'A', isCorrect: true },
    { letter: 'B', isCorrect: false },
  ];
  study._mode = 'fast';
  study._renderQuestion = vi.fn();
  study._handleAnswer(['B'], q.id, q);
  vi.advanceTimersByTime(2000);
  expect(study._renderQuestion).not.toHaveBeenCalled();
  expect(document.getElementById('study-continue-btn')).not.toBeNull();
});

it('caps a session, prioritizes due recall, and gives fallback IDs before shuffling', () => {
  const { mc, study } = setup();
  study._sessionSize = 2;
  mc.FastLearnCore._memory = {
    due: { nextReview: 1, reviewCount: 1 },
    recent: { nextReview: Date.now() + 60000, reviewCount: 1 },
  };
  study._prepareSession([{ id: 'recent' }, { id: 'due' }, { question: 'new' }]);
  expect(study._questions.map((q) => q.id)).toEqual(['due', 'medicine_2']);
  expect(study._questionIndex).toBe(0);
});

it('records ordinary practice in the existing spaced-review engine', () => {
  const { mc, study } = setup();
  study._questions = [{ id: 'q1', knowledgePoint: 'physiology' }];
  study._questionIndex = 0;
  study._questionStartTime = Date.now() - 8000;
  study._recordAnswer(false);
  expect(mc.FastLearnCore.updateMemory).toHaveBeenCalledWith(
    'q1',
    false,
    expect.any(Number),
    '',
    'physiology',
    'medicine',
  );
});
