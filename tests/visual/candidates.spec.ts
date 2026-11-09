import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { ScenarioName } from '../../src/test-bridge';

// Candidate captures only. These screenshots are NOT approved baselines and are
// not compared against committed snapshots. A human/vision review must approve
// them before any visual regression suite can be introduced.
const outputDir = 'test-results/visual-candidates';

async function capture(page: Page, name: string): Promise<string> {
  const path = `${outputDir}/${name}.png`;
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, animations: 'disabled' });
  return path;
}

async function loadScene(page: Page, scenario: ScenarioName): Promise<void> {
  await page.evaluate((name) => {
    const bridge = window.__TOYBOX_TEST__;
    if (bridge === undefined) {
      throw new Error('Test bridge missing');
    }
    bridge.loadScenario(name);
    bridge.render();
  }, scenario);
  await page.waitForTimeout(50);
}

test.describe('visual candidates (unapproved)', () => {
  test('captures menu, gameplay, combat, disabled, outcomes, and resize', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
    await page.waitForTimeout(150);

    const paths = [await capture(page, '01-menu')];

    await loadScene(page, 'coop');
    paths.push(await capture(page, '02-gameplay'));

    await loadScene(page, 'active-shot');
    paths.push(await capture(page, '03-active-shot'));

    await loadScene(page, 'disabled-player');
    paths.push(await capture(page, '04-disabled-player'));

    await loadScene(page, 'paused');
    paths.push(await capture(page, '05-paused'));

    await loadScene(page, 'cleared');
    paths.push(await capture(page, '06-cleared'));

    await loadScene(page, 'defeat');
    paths.push(await capture(page, '07-defeat'));

    await loadScene(page, 'completed');
    paths.push(await capture(page, '08-completed'));

    await page.setViewportSize({ width: 1280, height: 720 });
    await loadScene(page, 'coop');
    paths.push(await capture(page, '09-resized-gameplay'));

    expect(paths).toHaveLength(9);
    for (const path of paths) {
      expect(path).toContain('.png');
    }
  });
});
