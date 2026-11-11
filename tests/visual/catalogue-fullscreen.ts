import { expect, type Page } from '@playwright/test';

import type { CaptureScene } from './catalogue-support';

export async function configureFullscreenCapture(page: Page, scene: CaptureScene): Promise<void> {
  if (scene.fullscreen === true && scene.mobile === undefined) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    });
  }
}

async function ready(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          resolve();
        }),
      );
    });
    window.__TOYBOX_TEST__?.render();
  });
}

export async function enterFullscreenCapture(page: Page, scene: CaptureScene): Promise<unknown> {
  if (scene.fullscreen !== true) return null;
  const button = page.locator('#fullscreenBtn');
  const enabled = await page.evaluate(() => document.fullscreenEnabled);
  if (!enabled || !(await button.isEnabled())) {
    throw new Error(
      'FULLSCREEN_UNSUPPORTED: real fullscreen is unavailable; no windowed substitute captured.',
    );
  }
  const before = await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot());
  if (before === undefined) throw new Error('Fullscreen capture bridge missing');
  expect(before.state).toBe('playing');
  await button.click();
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          if (document.fullscreenElement === document.getElementById('app')) return 'active';
          return document.getElementById('fullscreenBtn')?.textContent === 'Fullscreen unavailable'
            ? 'denied'
            : 'pending';
        }),
      { message: 'Real app fullscreen must activate; no CSS or viewport substitute is accepted' },
    )
    .not.toBe('pending');
  if (!(await page.evaluate(() => document.fullscreenElement === document.getElementById('app')))) {
    throw new Error('FULLSCREEN_UNSUPPORTED: browser denied the real Fullscreen button request.');
  }
  await expect(button).toHaveText('Exit fullscreen');
  await expect(page.locator('#app')).toHaveClass(/compact/);
  await ready(page);
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    fullscreenElement: document.fullscreenElement?.id ?? '',
    maxTouchPoints: navigator.maxTouchPoints,
  }));
  const app = await page.locator('#app').boundingBox();
  const arena = await page.locator('#game').boundingBox();
  if (app === null || arena === null) throw new Error('Fullscreen app/arena bounds missing');
  expect(app.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(app.height).toBeGreaterThanOrEqual(viewport.height - 1);
  expect(arena.width / arena.height).toBeCloseTo(16 / 9, 2);
  for (const selector of ['#app', '#game', '.hud', '#fullscreenBtn']) {
    await expect(page.locator(selector)).toBeVisible();
    const box = await page.locator(selector).boundingBox();
    if (box === null) throw new Error(`Fullscreen bounds missing: ${selector}`);
    expect(box.x, selector).toBeGreaterThanOrEqual(-1);
    expect(box.y, selector).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height, selector).toBeLessThanOrEqual(viewport.height + 1);
  }
  let touchBounds: unknown = null;
  if (scene.mobile !== undefined) {
    await expect(page.locator('#touchToggle')).toBeChecked();
    await expect(page.locator('#movePad')).toBeVisible();
    await expect(page.locator('#aimPad')).toBeVisible();
    const move = await page.locator('#movePad').boundingBox();
    const aim = await page.locator('#aimPad').boundingBox();
    if (move === null || aim === null) throw new Error('Fullscreen touch pads missing');
    expect(move.x + move.width).toBeLessThanOrEqual(arena.x + 1);
    expect(aim.x).toBeGreaterThanOrEqual(arena.x + arena.width - 1);
    for (const box of [move, aim]) {
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    touchBounds = { move, aim };
  } else {
    await expect(page.locator('#touchToggle')).not.toBeChecked();
    await expect(page.locator('#touchControls')).toBeHidden();
  }
  expect(await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot())).toEqual(before);
  return { viewport, app, arena, touchBounds };
}

export async function exitFullscreenCapture(page: Page, scene: CaptureScene): Promise<void> {
  const before = await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot());
  if (before === undefined) throw new Error('Fullscreen exit bridge missing');
  await expect(page.locator('#fullscreenBtn')).toHaveText('Exit fullscreen');
  await page.locator('#fullscreenBtn').click();
  await expect
    .poll(async () => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await expect(page.locator('#fullscreenBtn')).toHaveText('Fullscreen');
  await ready(page);
  if (scene.mobile === undefined) {
    await expect(page.locator('#app')).not.toHaveClass(/compact/);
    await expect(page.locator('#touchToggle')).not.toBeChecked();
    await expect(page.locator('#touchControls')).toBeHidden();
  } else {
    await expect(page.locator('#app')).toHaveClass(/compact/);
    await expect(page.locator('#touchToggle')).toBeChecked();
    await expect(page.locator('#movePad')).toBeVisible();
    await expect(page.locator('#aimPad')).toBeVisible();
  }
  expect(await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot())).toEqual(before);
}
