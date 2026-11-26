import { expect, test, type Locator } from '@playwright/test';

test('missed native touches keep focus without commands; pause remains explicit', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Native touch delivery uses Chromium CDP; not iPhone certification.',
  );
  await page.setViewportSize({ width: 900, height: 440 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 2 });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo', exact: true }).click();
  await page.getByRole('button', { name: /Roll out!/ }).click();
  const snapshot = () =>
    page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) throw new Error('Missing test bridge');
      return bridge.advanceTicks(1, { sampleInput: true });
    });
  const before = await snapshot();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });

  // Keep control activation on the same native touch path as the missed taps.
  async function tapControl(control: Locator): Promise<void> {
    await expect(control).toBeVisible();
    await expect(control).toBeEnabled();
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    if (box === null) throw new Error('Missing touch control');
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  try {
    const app = await page.locator('#app').boundingBox();
    if (app === null) throw new Error('Missing app');
    for (const x of [app.x + 2, app.x + app.width - 2]) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: app.y + app.height - 2, id: 1 }],
      });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(page.locator('#stage')).toBeFocused();
      const after = await snapshot();
      expect(after.state).toBe('playing');
      expect(after.players[0]?.x).toBe(before.players[0]?.x);
      expect(after.players[0]?.y).toBe(before.players[0]?.y);
      expect(after.players[0]?.angle).toBe(before.players[0]?.angle);
      expect(after.shots).toBe(before.shots);
    }
    await tapControl(page.locator('#pauseBtn'));
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#dialogText')).toHaveText('No shells move while paused.');
    expect((await snapshot()).state).toBe('paused');
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: app.x + 2, y: app.y + app.height - 2, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect((await snapshot()).state).toBe('paused');
    await tapControl(page.getByRole('button', { name: 'Resume', exact: true }));
    await expect(page.locator('#overlay')).toBeHidden();
    expect((await snapshot()).state).toBe('playing');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    expect((await snapshot()).state).toBe('paused');
  } finally {
    await session.detach();
  }
});
