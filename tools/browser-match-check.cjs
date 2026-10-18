/* Local acceptance test. Requires a running server and Playwright via PLAYWRIGHT_PATH. */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.TEST_URL || 'http://127.0.0.1:8088';
async function run(relayOnly) {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const errors = [];
  try {
    const host = await browser.newPage();
    const guest = await browser.newPage();
    for (const page of [host, guest]) {
      page.on('console', (msg) => {
        if (/\[Lobby\]|\[Relay\]|crashed/.test(msg.text())) console.log(msg.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', async (dialog) => {
        errors.push(dialog.message());
        await dialog.dismiss();
      });
      await page.goto(base + '/index.html');
      await page.waitForFunction(() => window.MediCard && MediCard.ScreenLobby && MediCard.UI);
      await page.evaluate((relayOnly) => {
        // Keep test traffic local. Disable only DataChannel creation for the relay scenario.
        MediCard.Config.peerjs.config = { iceServers: [] };
        if (relayOnly)
          Peer.prototype.connect = function () {
            return { open: false, on() {}, close() {}, send() {} };
          };
        MediCard.GameState.goToScreen('lobby');
      }, relayOnly);
    }
    await host.locator('#lobby-name').fill('测试房主');
    await host.locator('#btn-create-room').click();
    await host.waitForFunction(() => MediCard.ScreenLobby._relayReady);
    const code = await host.evaluate(() => MediCard.ScreenLobby._roomCode);
    await guest.locator('#lobby-name').fill('测试同学');
    await guest.locator('#btn-join-room').click();
    await guest.locator('#lobby-code').fill(code);
    await guest.locator('#btn-confirm-join').click();
    try {
      await guest.locator('#btn-ready').waitFor();
    } catch (e) {
      console.log(
        'LOBBY',
        await host.locator('body').innerText(),
        await guest.locator('body').innerText(),
        errors,
      );
      throw e;
    }
    await guest.locator('#btn-ready').click();
    try {
      await host.waitForFunction(() => MediCard.RoomManager.allReady(), null, { timeout: 5000 });
    } catch (e) {
      console.log(
        'READY STATE',
        await guest.evaluate(() => ({
          ready: MediCard.ScreenLobby._ready,
          room: MediCard.ScreenLobby._roomCode,
          conn: MediCard.NetworkClient._hostConn?.open,
          players: MediCard.ScreenLobby._players,
          relay: MediCard.RelayTransport._open,
          send: MediCard.NetworkClient.send.toString(),
        })),
        await host.evaluate(() => MediCard.RoomManager.players),
      );
      throw e;
    }
    console.log('READY OK');
    assert.equal(await host.evaluate(() => MediCard.RoomManager.players.length), 2);
    // Supply a deterministic deck to isolate the match flow from large question downloads.
    const answerTexts = await host.evaluate(async (subject) => {
      let source;
      if (subject) {
        await new Promise(resolve => MediCard.QuestionLoader.onSubjectReady(subject, resolve));
        source = MediCard.QuestionLoader.getSubject(subject)[0];
        if (!source || source.studyOnly) throw new Error('No battle-ready workbook question');
      }
      const cards = Array.from({ length: 30 }, (_, i) => ({
        id: 'acceptance-' + i,
        cardType: 'attack',
        cardName: '杀',
        question: '联机验收：请选择正确选项',
        options: ['A. 正确', 'B. 错误'],
        correctAnswers: ['A'],
        subject: 'physiology',
        difficulty: 'common',
        explanation: '测试题，仅用于连接验收。',
        ...(source ? { ...source, id: 'acceptance-' + i, subject } : {}),
      }));
      MediCard.CardData.generateFullDeck = () => cards;
      if (!source) return { correct: '正确', wrong: '错误' };
      const correct = source.options.find(o => source.correctAnswers.includes(o[0]));
      const wrong = source.options.find(o => !source.correctAnswers.includes(o[0]));
      return { correct: correct.replace(/^[A-Z][.、．]\s*/, ''), wrong: wrong.replace(/^[A-Z][.、．]\s*/, '') };
    }, process.env.TEST_SUBJECT || '');
    await host.locator('#btn-start-game').click();
    console.log('START CLICKED');
    await guest.waitForFunction(
      () => MediCard.ScreenBattle._isMultiplayer && MediCard.GameState.players.length === 2,
    );
    await host.waitForFunction(() => MediCard.ScreenBattle._isMultiplayer);
    const before = await guest.evaluate(() => MediCard.GameState.players[1].resources.hp.current);
    // Real intent -> transport -> defense popup -> answer -> host settlement -> transport.
    await host.evaluate(() => MediCard.ScreenBattle._handleAttackIntent(0, 0, 1));
    await guest.locator('[data-answer-letter]').first().waitFor();
    await guest.locator('[data-answer-letter]').filter({ hasText: answerTexts.wrong }).click();
    await guest.getByRole('button', { name: '继续', exact: true }).click();
    await guest.waitForFunction(
      (before) => MediCard.GameState.players[1].resources.hp.current < before,
      before,
    );
    const hp = await guest.evaluate(() => MediCard.GameState.players[1].resources.hp.current);
    assert.equal(hp, await host.evaluate(() => MediCard.GameState.players[1].resources.hp.current));
    await host.evaluate(() => MediCard.ScreenBattle._continueNewTurn());
    await guest.waitForFunction(() => MediCard.GameState.currentPlayerIndex === 1);
    const turnHP = await host.evaluate(() => MediCard.GameState.players[1].resources.hp.current);
    const expectedHP = await host.evaluate((hp) => {
      const p = MediCard.GameState.players[1];
      return p.identity === 'lord' ? Math.min(p.resources.hp.max, hp + 1) : hp;
    }, hp);
    assert.equal(turnHP, expectedHP);
    assert.equal(
      await guest.evaluate(() => MediCard.GameState.players[1].resources.hp.current),
      expectedHP,
    );
    // Guest attacks host; answer correctly and verify the match continues without damage.
    const hostHP = await host.evaluate(() => MediCard.GameState.players[0].resources.hp.current);
    await guest.evaluate(() => {
      const M = MediCard,
        b = M.ScreenBattle,
        p = M.GameState.players[1];
      M.MPAttackResolver.executeAttack(b, p, p.hand[0], 0, 0);
    });
    await host.locator('[data-answer-letter]').filter({ hasText: answerTexts.correct }).click();
    await host.getByRole('button', { name: '继续', exact: true }).click();
    await guest.waitForFunction(() => !MediCard.ScreenBattle._attackInProgress);
    assert.equal(
      await host.evaluate(() => MediCard.GameState.players[0].resources.hp.current),
      hostHP,
    );
    // A real network surrender finishes both screens.
    await guest.evaluate(() =>
      MediCard.NetworkClient.send(
        MediCard.SyncProtocol.pack(MediCard.SyncProtocol.MessageType.SURRENDER, {}),
      ),
    );
    await host.waitForFunction(() => !MediCard.ScreenBattle._isMultiplayer);
    await guest.waitForFunction(() => !MediCard.ScreenBattle._isMultiplayer);
    console.log(
      JSON.stringify({
        scenario: relayOnly ? 'relay-only' : 'direct-and-relay',
        joined: true,
        damage: before - hp,
        turnHealthStable: true,
        defended: true,
        matchFinished: true,
        errors,
      }),
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
(async () => {
  await run(false);
  await run(true);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
