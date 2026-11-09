import { expect, type BrowserContext } from '@playwright/test';

import { CONFIG } from '../../src/config';
import type { CaptureRecord } from './catalogue-support';

export async function captureScene(
  context: BrowserContext,
  record: CaptureRecord,
  save: (kind: string, bytes: Buffer) => Promise<void>,
): Promise<void> {
  const scene = record.scene;
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(15_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
    });
    await page.setViewportSize(scene.viewport);
    await page.goto('/');
    await page.bringToFront();
    await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await page.evaluate(async (entry) => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) throw new Error('Test bridge missing');
      if (entry.fixture === undefined) {
        bridge.loadScenario(entry.scenario, entry.options);
      } else {
        bridge.loadVisualScene(entry.fixture);
      }
      await document.fonts.ready;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      bridge.render();
    }, scene);
    const state = await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) throw new Error('Test bridge missing after fixture loading');
      return bridge.snapshot();
    });
    record.state = state;
    if (scene.scenario === 'room') {
      expect(state.ticks).toBe(0);
      expect(state.shells).toHaveLength(0);
      expect(state.effects).toHaveLength(0);
      expect(state.corks.every((cell) => cell.hitsRemaining === 3 && !cell.destroyed)).toBe(true);
    }
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('Canvas bounds missing');
    record.renderContext = {
      canvasBounds: box,
      viewport: page.viewportSize(),
      ...(await page.evaluate(() => ({
        deviceScaleFactor: window.devicePixelRatio,
        fonts: document.fonts.status,
        focusedElement: document.activeElement?.id ?? '',
        focusVisible: document.activeElement?.matches(':focus-visible') ?? false,
        documentHasFocus: document.hasFocus(),
        visible: document.visibilityState,
      }))),
    };
    const settings = { animations: 'disabled', caret: 'hide', timeout: 10_000 } as const;
    await save('full', await page.screenshot(settings));
    await save('arena', await page.screenshot({ ...settings, clip: box }));
    if (scene.fixture !== undefined) {
      await save('detail', await page.screenshot({
        ...settings,
        clip: {
          x: box.x + (160 / CONFIG.width) * box.width,
          y: box.y + (120 / CONFIG.height) * box.height,
          width: (560 / CONFIG.width) * box.width,
          height: (300 / CONFIG.height) * box.height,
        },
      }));
    }
    expect(await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot())).toEqual(state);
    expect(errors, scene.id).toEqual([]);
  } finally {
    await page.close();
  }
}
