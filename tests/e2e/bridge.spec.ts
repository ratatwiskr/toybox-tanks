import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { BridgeSnapshot } from './support/bridge';

async function openBridge(page: Page): Promise<BridgeSnapshot> {
  await page.goto('/');
  await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
  return page.evaluate(() => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) {
      throw new Error('Bridge missing');
    }
    return bridge.loadScenario('coop');
  });
}

test.describe('test bridge', () => {
  test('loads scenarios, steps ticks, and keeps a single time owner', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(`pageerror: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });

    const initial = await openBridge(page);
    expect(initial.state).toBe('playing');
    expect(initial.players).toHaveLength(2);
    expect(initial.ticks).toBe(0);

    const stepped = await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) {
        throw new Error('Bridge missing');
      }
      return bridge.advanceTicks(120);
    });
    expect(stepped.ticks).toBe(120);
    expect(stepped.time).toBeCloseTo(1, 6);

    await page.waitForTimeout(150);
    const frozen = await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) {
        throw new Error('Bridge missing');
      }
      return bridge.snapshot();
    });
    expect(frozen.ticks).toBe(120);

    const shot = await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) {
        throw new Error('Bridge missing');
      }
      return bridge.loadScenario('active-shot');
    });
    expect(shot.shells).toHaveLength(1);
    expect(shot.shells[0]?.owner).toBe('p1');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('samples real keyboard events during explicit ticks', async ({ page }) => {
    await openBridge(page);

    const before = await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) {
        throw new Error('Bridge missing');
      }
      return bridge.snapshot();
    });

    await page.keyboard.down('d');
    try {
      const after = await page.evaluate(() => {
        const bridge = window.__TOYBOX_TEST__;
        if (bridge === undefined) {
          throw new Error('Bridge missing');
        }
        return bridge.advanceTicks(12, { sampleInput: true });
      });

      const first = after.players[0];
      const previous = before.players[0];
      expect(first).toBeDefined();
      expect(previous).toBeDefined();
      if (first === undefined || previous === undefined) {
        return;
      }
      expect(first.x).toBeGreaterThan(previous.x);
      expect(first.y).toBeCloseTo(previous.y, 6);
    } finally {
      await page.keyboard.up('d');
    }
  });

  test('loads outcome, disabled, and error states without mutating on render', async ({ page }) => {
    await openBridge(page);

    const result = await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) {
        throw new Error('Bridge missing');
      }

      const scenes = {
        cleared: bridge.loadScenario('cleared'),
        defeat: bridge.loadScenario('defeat'),
        completed: bridge.loadScenario('completed'),
        disabled: bridge.loadScenario('disabled-player'),
        paused: bridge.loadScenario('paused'),
      };

      bridge.loadScenario('active-shot');
      const before = JSON.stringify(bridge.snapshot());
      bridge.render();
      const after = JSON.stringify(bridge.snapshot());

      return {
        scenes: {
          cleared: scenes.cleared.state,
          defeat: scenes.defeat.state,
          completed: scenes.completed.state,
          disabled: scenes.disabled.players[1]?.alive,
          paused: scenes.paused.state,
        },
        unchanged: before === after,
      };
    });

    expect(result.scenes).toEqual({
      cleared: 'cleared',
      defeat: 'defeat',
      completed: 'completed',
      disabled: false,
      paused: 'paused',
    });
    expect(result.unchanged).toBe(true);

    await page.evaluate(() => {
      const bridge = window.__TOYBOX_TEST__;
      if (bridge === undefined) {
        throw new Error('Bridge missing');
      }
      bridge.loadScenario('error');
    });
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#dialogTitle')).toContainText('This map needs a fix');
  });
});
