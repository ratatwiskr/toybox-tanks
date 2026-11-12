import { expect, test, type Page } from '@playwright/test';

import {
  configureFullscreenCapture,
  enterFullscreenCapture,
  exitFullscreenCapture,
} from '../visual/catalogue-fullscreen';
import { configureMobileCapture, verifyMobileCapture } from '../visual/catalogue-mobile';
import { captureScene } from '../visual/catalogue-page';
import { captureScenes, imageKinds, pendingRecords } from '../visual/catalogue-support';

async function sampledPlayer(page: Page) {
  return page.evaluate(() => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) throw new Error('Fullscreen test bridge missing');
    const player = bridge.advanceTicks(1, { sampleInput: true }).players[0];
    if (player === undefined) throw new Error('Fullscreen test player missing');
    return { x: player.x, y: player.y, angle: player.angle };
  });
}

for (const scene of captureScenes().filter((entry) => entry.fullscreen === true)) {
  test(`real fullscreen capture: ${scene.id}`, async ({ context }) => {
    const record = pendingRecords().find((entry) => entry.scene.id === scene.id);
    if (record === undefined) throw new Error('Fullscreen scene missing');
    const views: string[] = [];
    await captureScene(context, record, (kind) => {
      views.push(kind);
      return Promise.resolve();
    });
    expect(views).toEqual(imageKinds(scene));
    expect(record.state?.state).toBe('playing');
    expect(record.state?.ticks).toBe(0);
  });

  test(`fullscreen exit restores layout and clears held keyboard input: ${scene.id}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
    });
    await configureMobileCapture(page, scene);
    await configureFullscreenCapture(page, scene);
    await page.goto('/');
    await page.bringToFront();
    await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
    await page.evaluate((entry) => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) throw new Error('Fullscreen test bridge missing');
      bridge.loadScenario(entry.scenario, entry.options);
    }, scene);
    await verifyMobileCapture(page, scene);
    const windowed = await page.locator('#game').boundingBox();
    if (windowed === null) throw new Error('Windowed arena missing');
    const initial = await sampledPlayer(page);
    await page.keyboard.down('d');
    const moved = await sampledPlayer(page);
    expect(moved.x).toBeGreaterThan(initial.x);
    await enterFullscreenCapture(page, scene);
    expect(await sampledPlayer(page)).toEqual(moved);
    await page.keyboard.up('d');
    await page.keyboard.down('d');
    const movedAgain = await sampledPlayer(page);
    expect(movedAgain.x).toBeGreaterThan(moved.x);
    await exitFullscreenCapture(page, scene);
    await expect
      .poll(async () => (await page.locator('#game').boundingBox())?.width ?? -1)
      .toBeCloseTo(windowed.width, 1);
    await expect
      .poll(async () => (await page.locator('#game').boundingBox())?.height ?? -1)
      .toBeCloseTo(windowed.height, 1);
    expect(await sampledPlayer(page)).toEqual(movedAgain);
    await page.keyboard.up('d');
  });
}
