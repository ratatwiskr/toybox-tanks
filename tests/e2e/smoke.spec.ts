import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface Point {
  readonly x: number;
  readonly y: number;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  return errors;
}

async function readTank(page: Page, id: string): Promise<Point> {
  const text = await page.locator('#debug').innerText();
  const match = new RegExp(`${id} \\((-?[\\d.]+), (-?[\\d.]+)\\)`).exec(text);
  const x = match?.[1];
  const y = match?.[2];
  if (x === undefined || y === undefined) {
    throw new Error(`Could not read ${id} position from debug output:\n${text}`);
  }
  return { x: Number(x), y: Number(y) };
}

test.describe('Toybox Tanks smoke', () => {
  test('menu, real keyboard movement, pause, resume, and retry', async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto('/');
    await expect(page).toHaveTitle(/Toybox Tanks/);
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
    await expect(page.getByRole('button', { name: 'Start two-player co-op' })).toBeVisible();
    await expect(page.locator('#game')).toBeVisible();

    const painted = await page.locator('#game').evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (context === null) {
        return false;
      }
      const pixel = context.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
      ).data;
      return (pixel[3] ?? 0) > 0;
    });
    expect(painted).toBe(true);

    // The first overlay action is focused, so Enter must start the game without
    // the game-key handler swallowing the native button activation.
    await page.keyboard.press('Enter');
    await expect(page.locator('#overlay')).toBeHidden();

    await page.keyboard.press('Backquote');
    await expect(page.locator('#debug')).toBeVisible();

    const start = await readTank(page, 'P1');
    await page.keyboard.down('d');
    try {
      await expect
        .poll(async () => (await readTank(page, 'P1')).x, { timeout: 5_000 })
        .toBeGreaterThan(start.x + 10);
    } finally {
      await page.keyboard.up('d');
    }
    const moved = await readTank(page, 'P1');
    expect(moved.y).toBeCloseTo(start.y, 0);

    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');

    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay')).toBeVisible();
    await page.getByRole('button', { name: 'Restart this room' }).click();
    await expect(page.locator('#overlay')).toBeHidden();

    const restarted = await readTank(page, 'P1');
    expect(restarted.x).toBeCloseTo(start.x, 0);
    expect(restarted.y).toBeCloseTo(start.y, 0);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('solo practice starts with one real player', async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Solo practice' }).click();
    await expect(page.locator('#overlay')).toBeHidden();
    await expect(page.locator('#hp2')).toHaveText('— SOLO');
    await expect(page.locator('#modeInfo')).toContainText('Solo practice');

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
