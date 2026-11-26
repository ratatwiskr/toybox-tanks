import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';

test.describe('context release artifact', () => {
  test('opens review panel and exports agent bundle with required keys', async ({ page }) => {
    const url = pathToFileURL(resolve('dist-context/index.html')).href;
    await page.goto(`${url}?review=1`);
    await expect(page.locator('#agent-review-panel')).toHaveClass(/open/);
    await expect(page.locator('#review-diagnostics')).toContainText('Frame p50/p95/p99/max');
    await page.waitForTimeout(5_100);

    const bundleText = await page.evaluate(() => {
      const panel = document.getElementById('agent-review-panel');
      const button = panel?.querySelector<HTMLButtonElement>(
        '[data-review-action="copy-bundle-json"]',
      );
      const original = navigator.clipboard.writeText.bind(navigator.clipboard);
      let copied = '';
      navigator.clipboard.writeText = (value: string) => {
        copied = value;
        return original(value).catch(() => undefined);
      };
      button?.click();
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          navigator.clipboard.writeText = original;
          resolve(copied);
        }, 50);
      });
    });

    const bundle = JSON.parse(bundleText) as Record<string, unknown>;
    expect(bundle.schemaVersion).toBe(1);
    expect(bundle).toHaveProperty('prompt');
    expect(bundle).toHaveProperty('diagnostics');
    expect(bundle).toHaveProperty('eventLog');
    expect(bundle).toHaveProperty('fields');
    expect(bundle).toHaveProperty('selectedSource');
  });

  test('release artifacts do not contain review panel markers', () => {
    const markers = ['Agent review workspace', 'agent-review-panel', 'Copy agent bundle'];
    const files = ['dist/index.html', 'dist-single/index.html'];
    const distAssets = resolve('dist/assets');
    for (const entry of readdirSync(distAssets)) {
      if (entry.endsWith('.js')) files.push(join('dist/assets', entry));
    }
    for (const file of files) {
      const text = readFileSync(resolve(file), 'utf8');
      for (const marker of markers) {
        expect(text, `${file} should not contain ${marker}`).not.toContain(marker);
      }
    }
  });
});
