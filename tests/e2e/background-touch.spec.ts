import { expect, test } from '@playwright/test';

test('missed native touches keep focus without commands; pause remains explicit', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native touch delivery uses Chromium CDP; not iPhone certification.');
  await page.setViewportSize({ width: 900, height: 440 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 2 });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  await page.getByRole('button', { name: /Roll out!/ }).click();
  const snapshot = () => page.evaluate(() => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) throw new Error('Missing test bridge');
    return bridge.advanceTicks(1, { sampleInput: true });
  });
  const before = await snapshot();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  try {
    const app = await page.locator('#app').boundingBox();
    if (app === null) throw new Error('Missing app');
    for (const x of [app.x + 2, app.x + app.width - 2]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: app.y + app.height - 2, id: 1 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(page.locator('#stage')).toBeFocused();
      const after = await snapshot();
      expect(after.state).toBe('playing');
      expect(after.players[0]?.x).toBe(before.players[0]?.x);
      expect(after.players[0]?.y).toBe(before.players[0]?.y);
      expect(after.players[0]?.angle).toBe(before.players[0]?.angle);
      expect(after.shots).toBe(before.shots);
    }
    await page.locator('#pauseBtn').click();
    expect((await snapshot()).state).toBe('paused');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: app.x + 2, y: app.y + app.height - 2, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect((await snapshot()).state).toBe('paused');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    expect((await snapshot()).state).toBe('paused');
  } finally {
    await session.detach();
  }
});
