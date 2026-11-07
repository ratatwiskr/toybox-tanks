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
});
