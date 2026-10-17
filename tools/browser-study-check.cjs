/* Local UI acceptance test. Uses real question bank and isolated browser storage. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto((process.env.TEST_URL || 'http://127.0.0.1:8088') + '/index.html');
    await page.evaluate(() => MediCard.GameState.goToScreen('study'));
    await page.locator('.study-welcome').waitFor();
    assert.equal(await page.locator('#study-session-size').inputValue(), '10');
    const output = path.resolve('docs/review/experience');
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'study-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'study-mobile.png') });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.evaluate(() => {
      const M = MediCard;
      M.ScreenStudy._mode = 'fast';
      M.ScreenStudy.startSubject(M.Config.subjectCategories[0].subjects[0]);
    });
    await page.locator('#study-options .study-option-btn').first().waitFor();
    assert.equal(await page.evaluate(() => MediCard.ScreenStudy._questions.length), 10);
    const wrong = await page.evaluate(
      () => MediCard.ScreenStudy._currentShuffled.find((o) => !o.isCorrect).letter,
    );
    await page.locator('#study-options [data-letter="' + wrong + '"]').click();
    const submit = page.locator('#multi-submit-btn');
    if (await submit.isVisible()) await submit.click();
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => MediCard.ScreenStudy._questionIndex), 0);
    assert.equal(await page.locator('#study-continue-btn').count(), 1);
    assert.equal(
      await page.evaluate(() => {
        const q = MediCard.ScreenStudy._questions[0];
        return MediCard.FastLearnCore._memory[q.id].errorCount;
      }),
      1,
    );
    await page.screenshot({ path: path.join(output, 'study-feedback-mobile.png') });
    await page.evaluate(() => {
      MediCard.ScreenStudy._mode = 'slow';
    });
    await page.locator('#study-continue-btn').click();
    for (let i = 1; i < 10; i++) {
      console.log(
        'QUESTION',
        await page.evaluate(() => {
          const s = MediCard.ScreenStudy,
            q = s._questions[s._questionIndex];
          return {
            index: s._questionIndex,
            id: q.id,
            type: q.questionType,
            correct: q.correctAnswers,
            answered: s._answered,
          };
        }),
      );
      const letters = await page.evaluate(() =>
        MediCard.ScreenStudy._currentShuffled.filter((o) => o.isCorrect).map((o) => o.letter),
      );
      for (const letter of letters)
        await page.locator('#study-options [data-letter="' + letter + '"]').click();
      if (await submit.isVisible()) await submit.click();
      await page.locator('#study-continue-btn').click();
    }
    await page.locator('.study-summary').waitFor();
    assert.equal(await page.evaluate(() => MediCard.ScreenStudy._sessionAnswered), 10);
    assert.equal(await page.evaluate(() => MediCard.ScreenStudy._sessionCorrect), 9);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        groupSize: 10,
        answered: 10,
        correct: 9,
        wrongFeedbackHeld: true,
        spacedReviewRecorded: true,
        mobileOverflow: false,
        errors,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
