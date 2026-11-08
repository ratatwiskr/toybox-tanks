import { expect, test } from '@playwright/test';

const viewports = [
  { width: 640, height: 300 },
  { width: 900, height: 440 },
  { width: 1280, height: 800 },
];

for (const viewport of viewports) {
  test(`touch pads stay outside the arena at ${String(viewport.width)}x${String(viewport.height)}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
    await expect(page.locator('#movePad')).toBeVisible();
    await expect(page.locator('#aimPad')).toBeVisible();
    const move = await page.locator('#movePad').boundingBox();
    const aim = await page.locator('#aimPad').boundingBox();
    const arena = await page.locator('#game').boundingBox();
    const app = await page.locator('#app').boundingBox();
    if (move === null || aim === null || arena === null || app === null) {
      throw new Error('Missing touch layout elements');
    }
    const oldSize = Math.min(126, Math.max(76, viewport.height * 0.25));
    expect(move.width).toBeGreaterThanOrEqual(oldSize * 1.15);
    expect(aim.width).toBeCloseTo(move.width, 2);
    expect(move.height).toBeCloseTo(move.width, 2);
    expect(move.x - app.x).toBeGreaterThanOrEqual(0);
    expect(move.x - app.x).toBeLessThanOrEqual(16);
    expect(app.x + app.width - aim.x - aim.width).toBeGreaterThanOrEqual(0);
    expect(app.x + app.width - aim.x - aim.width).toBeLessThanOrEqual(16);
    expect(move.x + move.width).toBeLessThanOrEqual(arena.x + 1);
    expect(aim.x).toBeGreaterThanOrEqual(arena.x + arena.width - 1);
    expect(arena.width / arena.height).toBeCloseTo(16 / 9, 2);
    expect(move.y + move.height).toBeLessThanOrEqual(viewport.height);
    expect(aim.y + aim.height).toBeLessThanOrEqual(viewport.height);
    await page.locator('#touchToggle').uncheck();
    await expect(page.locator('#touchControls')).toBeHidden();
    const withoutTouch = await page.locator('#game').boundingBox();
    if (withoutTouch === null) {
      throw new Error('Arena missing after disabling touch');
    }
    expect(withoutTouch.width).toBeGreaterThanOrEqual(arena.width - 1);
  });
}
