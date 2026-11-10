import { expect, type Page } from '@playwright/test';

import type { CaptureScene } from './catalogue-support';

export async function configureMobileCapture(page: Page, scene: CaptureScene): Promise<void> {
  if (scene.mobile !== undefined) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true });
    });
  }
  await page.setViewportSize(
    scene.mobile === 'portrait' ? { width: 640, height: 300 } : scene.viewport,
  );
}

export async function verifyMobileCapture(page: Page, scene: CaptureScene): Promise<unknown> {
  if (scene.mobile === undefined) return null;
  await expect(page.locator('#touchToggle')).toBeChecked();
  await expect(page.locator('#app')).toHaveClass(/compact/);
  const initial = await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot());
  if (initial === undefined) throw new Error('Mobile scene bridge missing');
  expect(initial.mode).toBe('solo');
  expect(initial.state).toBe('playing');
  expect(initial.ticks).toBe(0);

  if (scene.mobile === 'portrait') {
    await page.setViewportSize(scene.viewport);
    await expect(page.locator('#rotateHint')).toBeVisible();
    await expect(page.locator('#rotateHint')).toContainText('Resume when you are ready');
    await expect(page.locator('#dialogText')).toContainText('Rotate to landscape');
    await expect(page.locator('#touchControls')).toBeHidden();
    await expect.poll(async () =>
      page.evaluate(() => window.__TOYBOX_TEST__?.snapshot().state),
    ).toBe('paused');
    const paused = await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot());
    if (paused === undefined) throw new Error('Paused mobile bridge missing');
    expect(paused.time).toBe(initial.time);
    expect(paused.players).toEqual(initial.players);
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      window.__TOYBOX_TEST__?.render();
    });
    return { mobile: scene.mobile, orientationGuard: await page.locator('#rotateHint').boundingBox() };
  }

  await expect(page.locator('#movePad')).toBeVisible();
  await expect(page.locator('#aimPad')).toBeVisible();
  await expect(page.locator('#overlay')).toBeHidden();
  const move = await page.locator('#movePad').boundingBox();
  const aim = await page.locator('#aimPad').boundingBox();
  const arena = await page.locator('#game').boundingBox();
  if (move === null || aim === null || arena === null) throw new Error('Mobile layout bounds missing');
  expect(move.x + move.width).toBeLessThanOrEqual(arena.x + 1);
  expect(aim.x).toBeGreaterThanOrEqual(arena.x + arena.width - 1);
  expect(arena.width / arena.height).toBeCloseTo(16 / 9, 2);
  for (const box of [move, aim, arena]) {
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(scene.viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(scene.viewport.height + 1);
  }
  return { mobile: scene.mobile, move, aim, arena };
}
