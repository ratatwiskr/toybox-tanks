import { expect, test } from '@playwright/test';

test.describe('context review panel', () => {
  test('opens with ?review, records, and copies bundle JSON', async ({ page }) => {
    await page.goto('/?review=1');
    await expect(page.locator('#agent-review-panel')).toHaveClass(/open/);
    await expect(page.locator('#review-diagnostics')).toContainText('Frame p50/p95/p99/max');
    await page.waitForTimeout(5_100);

    const bundleText = await page.evaluate(async () => {
      const panel = document.getElementById('agent-review-panel');
      const button = panel?.querySelector<HTMLButtonElement>(
        '[data-review-action="copy-bundle-json"]',
      );
      const original = navigator.clipboard.writeText.bind(navigator.clipboard);
      let copied = '';
      navigator.clipboard.writeText = async (value: string) => {
        copied = value;
        return original(value).catch(() => undefined);
      };
      button?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return copied;
    });

    expect(bundleText).toContain('"schemaVersion": 1');
    const bundle = JSON.parse(bundleText) as Record<string, unknown>;
    expect(bundle).toHaveProperty('prompt');
    expect(bundle).toHaveProperty('diagnostics');
    expect(bundle).toHaveProperty('eventLog');
    expect(bundle).toHaveProperty('fields');
    expect(bundle).toHaveProperty('selectedSource');
  });
});
