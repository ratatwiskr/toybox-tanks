import { expect, test } from '@playwright/test';

test('fallback preserves toolbar, HUD and arena geometry after resize and re-entry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, value: undefined });
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  const button = page.locator('#fullscreenBtn');
  const app = page.locator('#app');
  await button.click();
  await expect(app).toHaveClass(/immersive/);

  async function assertGeometry(): Promise<void> {
    await expect(page.locator('.hud')).toBeVisible();
    await expect(button).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const rect = (selector: string): DOMRect => {
        const element = document.querySelector(selector);
        if (element === null) throw new Error(selector);
        return element.getBoundingClientRect();
      };
      const header = rect('header');
      const hud = rect('.hud');
      const stage = rect('#stage');
      const dialog = rect('#dialog');
      return stage.width > 0 && stage.height > 0
        && header.bottom <= hud.top + 1
        && hud.bottom <= stage.top + 1
        && stage.left >= -1 && stage.top >= -1
        && stage.right <= innerWidth + 1 && stage.bottom <= innerHeight + 1
        && Math.abs(stage.width / stage.height - 16 / 9) < 0.02
        && dialog.top >= stage.top - 1 && dialog.bottom <= stage.bottom + 1;
    })).toBe(true);
  }

  await assertGeometry();
  await page.setViewportSize({ width: 932, height: 430 });
  await assertGeometry();
  await button.click();
  await expect(app).not.toHaveClass(/immersive/);
  await button.click();
  await expect(app).toHaveClass(/immersive/);
  await assertGeometry();
  expect(errors).toEqual([]);
});
