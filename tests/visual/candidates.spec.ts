import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { expect, test } from '@playwright/test';

// Candidate captures only. These screenshots are NOT approved baselines and are
// not compared against committed snapshots. A human/vision review must approve
// them before any visual regression suite can be introduced.
const outputDir = 'test-results/visual-candidates';

test.describe('visual candidates (unapproved)', () => {
  test('captures the menu and a frozen gameplay frame', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
    await page.waitForTimeout(150);

    const menuPath = `${outputDir}/01-menu.png`;
    await mkdir(dirname(menuPath), { recursive: true });
    await page.screenshot({ path: menuPath, animations: 'disabled' });

    await page.getByRole('button', { name: 'Start two-player co-op' }).click();
    await expect(page.locator('#overlay')).toBeHidden();
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');

    const pausedPath = `${outputDir}/02-gameplay-paused.png`;
    await page.screenshot({ path: pausedPath, animations: 'disabled' });

    expect(menuPath).toContain('01-menu.png');
    expect(pausedPath).toContain('02-gameplay-paused.png');
  });
});
