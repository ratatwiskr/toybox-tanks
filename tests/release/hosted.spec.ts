import { expect, test } from '@playwright/test';

test.describe('hosted release smoke', () => {
  test('serves the built bundle and runs the core loop', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(`pageerror: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/Toybox Tanks/);
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
    await expect(page.locator('#game')).toBeVisible();

    await page.getByRole('button', { name: 'Start two-player co-op' }).click();
    await expect(page.locator('#overlay')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');
    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay')).toBeHidden();

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('does not expose the test bridge even with a test-looking query', async ({ page }) => {
    await page.goto('/?test=1');
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');

    const exposed = await page.evaluate(() => '__TOYBOX_TEST__' in window);
    expect(exposed).toBe(false);
  });

  test('decodes an SVG data URI and rasterizes it onto a canvas', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="#ff0000"/></svg>';
      const image = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('SVG decode failed'));
      });
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context is unavailable.');
      }
      context.drawImage(image, 0, 0, 32, 32);

      const pixel = context.getImageData(0, 0, 1, 1).data;
      return { width: canvas.width, height: canvas.height, red: pixel[0], alpha: pixel[3] };
    });

    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    expect(result.red).toBe(255);
    expect(result.alpha).toBe(255);
  });
});
