import { expect, test } from '@playwright/test';

import { CONFIG } from '../../src/config';
import { captureScene } from '../visual/catalogue-page';
import { captureScenes, imageKinds, pendingRecords } from '../visual/catalogue-support';

for (const scene of captureScenes().filter((entry) => entry.mobile !== undefined)) {
  test(`shared mobile capture: ${scene.id}`, async ({ context }) => {
    const record = pendingRecords().find((entry) => entry.scene.id === scene.id);
    if (record === undefined) throw new Error('Mobile scene not registered');
    const views: string[] = [];
    await captureScene(context, record, (kind) => {
      views.push(kind);
      return Promise.resolve();
    });
    expect(views).toEqual(imageKinds(scene));
    expect(record.state?.mode).toBe('solo');
    expect(record.state?.ticks).toBe(0);
    expect(record.state?.state).toBe(scene.mobile === 'portrait' ? 'paused' : 'playing');
  });
}

test('portrait stops stepping and landscape requires explicit Resume', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
  await page.evaluate(() => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) throw new Error('Bridge missing');
    bridge.loadScenario('solo');
  });
  await expect(page.locator('#movePad')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotateHint')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => window.__TOYBOX_TEST__?.snapshot().state))
    .toBe('paused');
  const before = await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot());
  if (before === undefined) throw new Error('Paused snapshot missing');
  const after = await page.evaluate(() => window.__TOYBOX_TEST__?.advanceTicks(120));
  expect(after).toEqual(before);
  await page.setViewportSize({ width: 640, height: 300 });
  await expect(page.locator('#rotateHint')).toBeHidden();
  expect(await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot().state)).toBe('paused');
  await expect(page.locator('#touchControls')).toBeHidden();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#movePad')).toBeVisible();
  const resumed = await page.evaluate(() => window.__TOYBOX_TEST__?.advanceTicks(1));
  expect(resumed?.state).toBe('playing');
  expect(resumed?.time).toBeCloseTo(before.time + CONFIG.fixedStep, 10);
});
