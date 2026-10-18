/* Real browser acceptance for the imported workbook and mixed practice. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8092/');
    await page.evaluate(() => MediCard.GameState.goToScreen('study'));
    await page.locator('.study-welcome').waitFor();
    await page.evaluate(() => new Promise(resolve => MediCard.QuestionLoader.onSubjectReady('pathophysiology', resolve)));
    const counts = await page.evaluate(() => ({
      battle: MediCard.QuestionLoader.getSubject('pathophysiology').length,
      study: MediCard.QuestionLoader.getSubject('pathophysiology', { includeSubjective: true }).length
    }));
    assert.deepEqual(counts, { battle: 858, study: 1243 });
    await page.evaluate(() => {
      const s = MediCard.ScreenStudy;
      const all = MediCard.QuestionLoader.getSubject('pathophysiology', { includeSubjective: true });
      s._currentSubject = 'pathophysiology';
      s._mode = 'slow';
      s._prepareSession(all.slice(0, 3));
      s._questions = [all.find(q => q.studyOnly), ...all.filter(q => !q.studyOnly).slice(0, 2)];
      s._renderQuestion();
    });
    await page.locator('#study-recall-draft').fill('先回忆定义，再列出关键机制。');
    await page.locator('#study-reveal-answer').click();
    assert.match(await page.locator('#study-recall-draft').inputValue(), /关键机制/);
    const source = await page.locator('.study-self-review a').first().getAttribute('href');
    assert.equal((await page.request.get(new URL(source, page.url()).href)).status(), 200);
    await page.locator('#study-self-mastered').click();
    assert.equal(await page.locator('#study-self-mastered').isDisabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    fs.mkdirSync('docs/review/pathophysiology-experience', { recursive: true });
    await page.screenshot({ path: 'docs/review/pathophysiology-experience/self-review-mobile.png', fullPage: true, animations: 'disabled' });
    await page.locator('#study-subjective-next').click();
    for (let i = 0; i < 2; i++) {
      const letter = await page.evaluate(correct => MediCard.ScreenStudy._currentShuffled.find(o => o.isCorrect === correct).letter, i === 1);
      await page.locator('#study-options [data-letter="' + letter + '"]').click();
      await page.locator('#study-continue-btn').click();
    }
    await page.locator('.study-summary').waitFor();
    assert.deepEqual(await page.evaluate(() => [MediCard.ScreenStudy._sessionAnswered, MediCard.ScreenStudy._sessionCorrect, MediCard.ScreenStudy._sessionSelfReviewed]), [2, 1, 1]);
    assert.match(await page.locator('.study-summary').innerText(), /50%/);
    await page.screenshot({ path: 'docs/review/pathophysiology-experience/mixed-summary-mobile.png', fullPage: true, animations: 'disabled' });
    const cacheUpgrade = await page.evaluate(async () => {
      for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
      const old = await caches.open('medicard-v1');
      await old.put('/old-question-bank.js', new Response('old'));
      const reg = await navigator.serviceWorker.register('/sw.js');
      const worker = reg.installing || reg.waiting || reg.active;
      if (worker.state !== 'activated') await new Promise(resolve => worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
      }));
      const keys = await caches.keys();
      return !keys.includes('medicard-v1') && keys.includes('medicard-v6.5.6');
    });
    assert.equal(cacheUpgrade, true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ...counts, mixedSession: 'passed', originalPage: 200, mobileOverflow: false, cacheUpgrade, errors }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
