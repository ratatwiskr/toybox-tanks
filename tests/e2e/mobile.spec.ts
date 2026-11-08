import { expect, test, type Page } from '@playwright/test';

import type { BridgeSnapshot } from './support/bridge';

async function ticks(page: Page, count = 1): Promise<BridgeSnapshot> {
  return page.evaluate((amount) => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) {
      throw new Error('Test bridge missing');
    }
    return bridge.advanceTicks(amount, { sampleInput: true });
  }, count);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 440 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true });
  });
});

test('landscape native Chromium touch delivery moves and aims together, then taps once', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#touchToggle')).toBeChecked();
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  const before = await ticks(page);
  expect(before.players).toHaveLength(1);
  await expect(page.locator('#movePad')).toBeVisible();
  await expect(page.locator('.p2')).toBeHidden();
  const move = await page.locator('#movePad').boundingBox();
  const aim = await page.locator('#aimPad').boundingBox();
  const arena = await page.locator('#game').boundingBox();
  if (move === null || aim === null || arena === null) {
    throw new Error('Missing mobile controls or arena');
  }
  expect(arena.width / arena.height).toBeCloseTo(16 / 9, 2);
  expect(arena.y + arena.height).toBeLessThanOrEqual(441);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const left = { x: move.x + move.width / 2, y: move.y + move.height / 2, id: 1 };
  const right = { x: aim.x + aim.width / 2, y: aim.y + aim.height / 2, id: 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...left, x: left.x + 35 }, { ...right, x: right.x + 35 }],
  });
  await expect(page.locator('#movePad')).toHaveClass(/engaged/);
  await expect(page.locator('#aimPad')).toHaveClass(/engaged/);
  const held = await ticks(page, 5);
  const initial = before.players[0];
  const moved = held.players[0];
  if (initial === undefined || moved === undefined) {
    throw new Error('Solo player missing');
  }
  expect(moved.x).toBeGreaterThan(initial.x);
  expect(moved.angle).toBeGreaterThan(initial.angle);
  expect(held.shots).toBe(0);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const released = await ticks(page, 2);
  expect(released.players[0]?.x).toBeCloseTo(moved.x, 8);
  expect(released.players[0]?.angle).toBeCloseTo(moved.angle, 8);
  expect(released.shots).toBe(0);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await ticks(page)).shots).toBe(1);
  expect((await ticks(page, 20)).shots).toBe(1);
  await session.detach();
  expect(errors).toEqual([]);
});

test('portrait pauses and returning to landscape requires explicit resume', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  await ticks(page);
  await page.setViewportSize({ width: 440, height: 900 });
  await expect(page.locator('#rotateHint')).toBeVisible();
  await expect(page.locator('#touchControls')).toBeHidden();
  await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');
  await page.setViewportSize({ width: 900, height: 440 });
  await expect(page.locator('#rotateHint')).toBeHidden();
  await expect(page.locator('#overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#touchControls')).toBeVisible();
  expect((await ticks(page)).state).toBe('playing');
});

for (const touch of [true, false]) {
  test(`tablet co-op routes controllers with Touch P1=${String(touch)}`, async ({ page }) => {
    await page.addInitScript(() => {
      const makePad = (index: number) => ({
        index,
        id: `Synthetic pad ${String(index + 1)}`,
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      });
      const first = makePad(0);
      const second = makePad(1);
      Object.defineProperty(navigator, 'getGamepads', { value: () => [first, second] });
      window.addEventListener('test-pad-aim', () => {
        first.axes[2] = 1;
        second.axes[2] = -1;
      });
      window.addEventListener('test-pad-neutral', () => {
        first.axes[2] = 0;
        second.axes[2] = 0;
      });
      window.addEventListener('test-pad-disconnect', () => {
        first.connected = false;
      });
      window.addEventListener('test-pad-reconnect', () => {
        first.connected = true;
      });
    });
    await page.goto('/');
    await page.locator('#touchToggle').setChecked(touch);
    await page.getByRole('button', { name: 'Start two-player co-op', exact: true }).click();
    await expect(page.locator('#device2')).toContainText(touch ? 'Pad 1' : 'Pad 2');
    const before = await ticks(page);
    expect(before.players).toHaveLength(2);
    await page.evaluate(() => window.dispatchEvent(new Event('test-pad-aim')));
    const after = await ticks(page, 5);
    const firstBefore = before.players[0];
    const secondBefore = before.players[1];
    const firstAfter = after.players[0];
    const secondAfter = after.players[1];
    if (!firstBefore || !secondBefore || !firstAfter || !secondAfter) {
      throw new Error('Co-op players missing');
    }
    if (touch) {
      expect(firstAfter.angle).toBeCloseTo(firstBefore.angle, 8);
      expect(secondAfter.angle).toBeGreaterThan(secondBefore.angle);
    } else {
      expect(firstAfter.angle).toBeGreaterThan(firstBefore.angle);
      expect(secondAfter.angle).toBeLessThan(secondBefore.angle);
    }
    await page.evaluate(() => window.dispatchEvent(new Event('test-pad-disconnect')));
    await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');
    await page.evaluate(() => window.dispatchEvent(new Event('test-pad-reconnect')));
    await expect(page.locator('#device2')).toContainText(touch ? 'Pad 1' : 'Pad 2');
    await expect(page.locator('#overlay')).toBeVisible();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    const gated = await ticks(page, 3);
    expect(gated.players[0]?.angle).toBeCloseTo(firstAfter.angle, 8);
    expect(gated.players[1]?.angle).toBeCloseTo(secondAfter.angle, 8);
    await page.evaluate(() => window.dispatchEvent(new Event('test-pad-neutral')));
    await ticks(page);
    await page.evaluate(() => window.dispatchEvent(new Event('test-pad-aim')));
    const rearmed = await ticks(page, 2);
    expect(rearmed.players[1]?.angle).not.toBe(gated.players[1]?.angle);
  });
}
