import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';

test.describe('single-file release smoke', () => {
  test('opens the standalone HTML from file://', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(`pageerror: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });

    const url = pathToFileURL(resolve('dist-single/index.html')).href;
    await page.goto(url);
    await expect(page).toHaveTitle(/Toybox Tanks/);
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
    await expect(page.locator('#game')).toBeVisible();

    await page.getByRole('button', { name: 'Start two-player co-op' }).click();
    await expect(page.locator('#overlay')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('does not expose the test bridge from the single-file release', async ({ page }) => {
    const url = pathToFileURL(resolve('dist-single/index.html')).href;
    await page.goto(`${url}?test=1`);
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');

    const exposed = await page.evaluate(() => '__TOYBOX_TEST__' in window);
    expect(exposed).toBe(false);
  });
});
