import { expect, test, type CDPSession, type Page } from '@playwright/test';

import type { BridgeSnapshot } from './support/bridge';

async function sample(page: Page, count = 1): Promise<BridgeSnapshot> {
  return page.evaluate((amount) => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) {
      throw new Error('Test bridge missing');
    }
    return bridge.advanceTicks(amount, { sampleInput: true });
  }, count);
}

async function frames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

async function signal(page: Page, name: string): Promise<void> {
  await page.evaluate((event) => window.dispatchEvent(new Event(event)), name);
}

function poses(snapshot: BridgeSnapshot) {
  return snapshot.players.map(({ id, x, y, angle }) => ({ id, x, y, angle }));
}

async function centre(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (box === null) {
    throw new Error(`Missing control ${selector}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function touchSession(page: Page): Promise<CDPSession> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  return session;
}

async function holdBoth(page: Page, session: CDPSession) {
  const left = { ...(await centre(page, '#movePad')), id: 1 };
  const right = { ...(await centre(page, '#aimPad')), id: 2 };
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [left, right],
  });
  const moved = [
    { ...left, x: left.x + 35 },
    { ...right, x: right.x + 35 },
  ];
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: moved });
  return moved;
}

async function tapAim(page: Page, session: CDPSession): Promise<void> {
  const point = { ...(await centre(page, '#aimPad')), id: 3 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function start(page: Page, coop: boolean, touch = true): Promise<BridgeSnapshot> {
  await page.goto('/');
  await page.locator('#touchToggle').setChecked(touch);
  const name = coop ? 'Start two-player co-op' : 'Solo practice';
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: /Roll out!/ }).click();
  await sample(page, 0);
  await frames(page);
  return sample(page);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 440 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true });
    const pads = [0, 1, 2].map((index) => ({
      index,
      id: `Ownership test pad ${String(index + 1)}`,
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    }));
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads });
    for (const pad of pads) {
      window.addEventListener(`input-${String(pad.index)}-move`, () => {
        pad.axes[0] = pad.index === 0 ? -1 : 1;
      });
      window.addEventListener(`input-${String(pad.index)}-fire`, () => {
        const fire = pad.buttons[0];
        if (fire === undefined) {
          throw new Error('Synthetic fire button missing');
        }
        fire.pressed = true;
      });
    }
    window.addEventListener('input-neutral', () => {
      for (const pad of pads) {
        pad.axes.fill(0);
        for (const button of pad.buttons) {
          button.pressed = false;
          button.value = 0;
        }
      }
    });
  });
});

test('mixed co-op keeps touch and controller movement and projectile owners separate', async ({
  page,
}) => {
  let baseline = await start(page, true);
  expect(baseline.players.map((player) => player.id)).toEqual(['p1', 'p2']);
  for (const index of [1, 2]) {
    await signal(page, `input-${String(index)}-move`);
    await signal(page, `input-${String(index)}-fire`);
    const ignored = await sample(page, 2);
    expect(poses(ignored)).toEqual(poses(baseline));
    expect(ignored.shots).toBe(0);
    await signal(page, 'input-neutral');
    baseline = await sample(page);
  }
  const session = await touchSession(page);
  await holdBoth(page, session);
  await signal(page, 'input-0-move');
  const moved = await sample(page, 3);
  const p1 = baseline.players[0];
  const p2 = baseline.players[1];
  if (p1 === undefined || p2 === undefined) {
    throw new Error('Co-op players missing');
  }
  expect(moved.players[0]?.x).toBeGreaterThan(p1.x);
  expect(moved.players[1]?.x).toBeLessThan(p2.x);
  expect(moved.shots).toBe(0);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await signal(page, 'input-neutral');
  await signal(page, 'input-0-fire');
  const controllerShot = await sample(page);
  expect(controllerShot.shots).toBe(1);
  expect(controllerShot.shells.map((shell) => shell.owner)).toEqual(['p2']);
  await signal(page, 'input-neutral');
  await tapAim(page, session);
  const touchShot = await sample(page);
  expect(touchShot.shots).toBe(2);
  expect(touchShot.shells.map((shell) => shell.owner).sort()).toEqual(['p1', 'p2']);
  await session.detach();
});

test('two gamepads move and fire only their own tanks when touch is off', async ({ page }) => {
  const baseline = await start(page, true, false);
  await expect(page.locator('#touchControls')).toBeHidden();
  await signal(page, 'input-2-move');
  await signal(page, 'input-2-fire');
  const ignored = await sample(page, 2);
  expect(poses(ignored)).toEqual(poses(baseline));
  expect(ignored.shots).toBe(0);
  await signal(page, 'input-neutral');
  await signal(page, 'input-0-move');
  await signal(page, 'input-0-fire');
  const first = await sample(page);
  const p1 = baseline.players[0];
  const p2 = baseline.players[1];
  if (p1 === undefined || p2 === undefined) {
    throw new Error('Co-op players missing');
  }
  expect(first.players[0]?.x).toBeLessThan(p1.x);
  expect(poses(first)[1]).toEqual(poses(baseline)[1]);
  expect(first.shots).toBe(1);
  expect(first.shells.map((shell) => shell.owner)).toEqual(['p1']);
  await signal(page, 'input-neutral');
  await signal(page, 'input-1-move');
  await signal(page, 'input-1-fire');
  const second = await sample(page);
  expect(poses(second)[0]).toEqual(poses(first)[0]);
  expect(second.players[1]?.x).toBeGreaterThan(p2.x);
  expect(second.shots).toBe(2);
  expect(second.shells.map((shell) => shell.owner).sort()).toEqual(['p1', 'p2']);
});

test('switching mixed co-op to two pads discards old touch and gates held controller input', async ({
  page,
}) => {
  await start(page, true);
  const session = await touchSession(page);
  const held = await holdBoth(page, session);
  await signal(page, 'input-0-move');
  await signal(page, 'input-0-fire');
  await sample(page, 2);
  await page.locator('#touchToggle').uncheck();
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#device2')).toContainText('Pad 2');
  await frames(page);
  const paused = await sample(page, 0);
  expect(paused.state).toBe('paused');
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: held.map((point) => ({ ...point, x: point.x + 10 })),
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const gated = await sample(page, 3);
  expect(poses(gated)).toEqual(poses(paused));
  expect(gated.shots).toBe(paused.shots);
  await signal(page, 'input-neutral');
  await sample(page);
  await signal(page, 'input-0-move');
  await signal(page, 'input-0-fire');
  const fresh = await sample(page);
  const player = gated.players[0];
  if (player === undefined) {
    throw new Error('P1 missing');
  }
  expect(fresh.players[0]?.x).toBeLessThan(player.x);
  expect(poses(fresh)[1]).toEqual(poses(gated)[1]);
  expect(fresh.shots).toBe(gated.shots + 1);
  expect(fresh.shells.some((shell) => shell.owner === 'p1')).toBe(true);
  await session.detach();
});

for (const interruption of ['pause', 'restart', 'cancel']) {
  test(`interrupted gestures stay inactive after ${interruption} until a fresh touch`, async ({
    page,
  }) => {
    await start(page, false);
    const session = await touchSession(page);
    const held = await holdBoth(page, session);
    await sample(page, 3);
    if (interruption === 'cancel') {
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    } else {
      await page.keyboard.press('Escape');
      await expect(page.locator('#overlay')).toBeVisible();
      const name = interruption === 'restart' ? 'Restart this room' : 'Resume';
      await page.getByRole('button', { name, exact: true }).click();
      await frames(page);
    }
    const cleared = await sample(page, 0);
    expect(cleared.state).toBe('playing');
    if (interruption !== 'cancel') {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: held.map((point) => ({ ...point, x: point.x + 10 })),
      });
    }
    const stale = await sample(page, 3);
    expect(poses(stale)).toEqual(poses(cleared));
    expect(stale.shots).toBe(cleared.shots);
    if (interruption !== 'cancel') {
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    expect((await sample(page)).shots).toBe(cleared.shots);
    await holdBoth(page, session);
    const fresh = await sample(page, 2);
    const player = stale.players[0];
    if (player === undefined) {
      throw new Error('Solo player missing');
    }
    expect(fresh.players[0]?.x).toBeGreaterThan(player.x);
    expect(fresh.players[0]?.angle).toBeGreaterThan(player.angle);
    expect(fresh.shots).toBe(cleared.shots);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await tapAim(page, session);
    expect((await sample(page)).shots).toBe(cleared.shots + 1);
    await session.detach();
  });
}

test('an unsampled tap is discarded by pause rather than firing after resume', async ({ page }) => {
  await start(page, false);
  const session = await touchSession(page);
  await tapAim(page, session);
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect((await sample(page, 10)).shots).toBe(0);
  await tapAim(page, session);
  expect((await sample(page)).shots).toBe(1);
  await session.detach();
});
