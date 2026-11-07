import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { BridgeSnapshot } from './support/bridge';

interface SyntheticPadControl {
  axis(index: number, value: number): void;
  button(index: number, pressed: boolean, value?: number): void;
  connect(connected: boolean): void;
}

declare global {
  interface Window {
    __PAD_TEST__?: SyntheticPadControl;
  }
}

async function installSyntheticPad(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const pad = {
      index: 0,
      id: 'Synthetic Pad',
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [pad],
    });
    window.__PAD_TEST__ = {
      axis(index, value) {
        pad.axes[index] = value;
      },
      button(index, pressed, value = 0) {
        const button = pad.buttons[index];
        if (button !== undefined) {
          button.pressed = pressed;
          button.value = value;
        }
      },
      connect(connected) {
        pad.connected = connected;
      },
    };
  });
}

async function snapshot(page: Page): Promise<BridgeSnapshot> {
  return page.evaluate(() => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) {
      throw new Error('Test bridge missing');
    }
    return bridge.snapshot();
  });
}

// WebKit throttles requestAnimationFrame under Playwright, so a fixed timeout can
// elapse without a single poll. Wait for real frames when the adapter must observe
// a neutral sample or a Start release before the next input.
async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let remaining = frames;
        const next = (): void => {
          remaining -= 1;
          if (remaining <= 0) {
            resolve();
            return;
          }
          requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      }),
    count,
  );
}

test.describe('synthetic gamepad adapter', () => {
  test('moves, aims, fires, pauses, and disconnects through a synthetic pad', async ({ page }) => {
    await installSyntheticPad(page);
    await page.goto('/');
    await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
    await page.getByRole('button', { name: 'Start two-player co-op' }).click();
    await expect(page.locator('#overlay')).toBeHidden();

    // Let the real RAF loop take neutral samples before moving the stick;
    // otherwise the deliberate neutral gate correctly ignores a held input.
    await waitForFrames(page, 2);
    await expect(page.locator('#device1')).toContainText('Pad 1');

    const start = await snapshot(page);
    const initial = start.players[0];
    expect(initial).toBeDefined();
    if (initial === undefined) {
      return;
    }

    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.axis(0, 0.8);
    });

    await expect
      .poll(async () => (await snapshot(page)).players[0]?.x ?? Number.NaN, { timeout: 5_000 })
      .toBeGreaterThan(initial.x + 5);

    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.axis(0, 0);
      pad.axis(2, 1);
    });

    await expect
      .poll(async () => (await snapshot(page)).players[0]?.angle ?? Number.NaN, { timeout: 5_000 })
      .toBeCloseTo(0, 1);

    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.button(0, true, 1);
    });

    await expect
      .poll(async () => (await snapshot(page)).shells.length, { timeout: 5_000 })
      .toBeGreaterThan(0);

    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.axis(2, 0);
      pad.axis(3, 0);
      pad.button(0, false);
      pad.button(9, true, 1);
    });

    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');

    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.button(9, false);
    });
    // The adapter only resumes on a fresh Start edge, so a real frame must
    // observe the release before the button is pressed again.
    await waitForFrames(page, 2);
    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.button(9, true, 1);
    });

    await expect(page.locator('#overlay')).toBeHidden();
    await expect(page.locator('#device1')).toContainText('Pad 1');

    await page.evaluate(() => {
      const pad = window.__PAD_TEST__;
      if (pad === undefined) {
        throw new Error('Synthetic pad missing');
      }
      pad.connect(false);
    });
    await expect(page.locator('#device1')).toContainText('keyboard');
    await expect(page.locator('#device1')).not.toContainText('Pad 1');
  });
});
