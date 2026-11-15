import { expect, test } from '@playwright/test';

test('expanded fallback enlarges the arena and restores the normal layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  const app = page.locator('#app');
  const button = page.locator('#fullscreenBtn');
  const stage = page.locator('#stage');
  await expect(app).toHaveClass(/compact/);
  const original = await stage.boundingBox();
  if (original === null) throw new Error('Missing arena');
  await button.click();
  await expect(app).toHaveClass(/immersive/);
  await expect(page.locator('.touch-setting')).toBeHidden();
  await expect(page.locator('.brand')).toBeHidden();

  async function assertGeometry(): Promise<void> {
    await expect(page.locator('.hud')).toBeVisible();
    await expect(button).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const rect = (selector: string): DOMRect => {
            const element = document.querySelector(selector);
            if (element === null) throw new Error(selector);
            return element.getBoundingClientRect();
          };
          const header = rect('header');
          const hud = rect('.hud');
          const arena = rect('#stage');
          const dialog = rect('#dialog');
          return (
            hud.right <= header.left + 1 &&
            Math.max(header.bottom, hud.bottom) <= arena.top + 1 &&
            arena.left >= -1 &&
            arena.top >= -1 &&
            arena.right <= innerWidth + 1 &&
            arena.bottom <= innerHeight + 1 &&
            arena.width > 0 &&
            arena.height > 0 &&
            Math.abs(arena.width / arena.height - 16 / 9) < 0.02 &&
            dialog.top >= arena.top - 1 &&
            dialog.bottom <= arena.bottom + 1
          );
        }),
      )
      .toBe(true);
  }

  await assertGeometry();
  await expect
    .poll(async () => {
      const expanded = await stage.boundingBox();
      return expanded === null ? 0 : expanded.height - original.height;
    })
    .toBeGreaterThan(10);
  await page.screenshot({ path: test.info().outputPath('expanded-touch-landscape.png') });
  await page.setViewportSize({ width: 932, height: 430 });
  await assertGeometry();
  await page.setViewportSize({ width: 844, height: 390 });
  await button.click();
  await expect(app).not.toHaveClass(/immersive/);
  await expect(page.locator('.touch-setting')).toBeVisible();
  await expect
    .poll(async () => {
      const restored = await stage.boundingBox();
      return restored === null ? Infinity : Math.abs(restored.height - original.height);
    })
    .toBeLessThan(1);
  await button.click();
  await expect(app).toHaveClass(/immersive/);
  await assertGeometry();
  expect(errors).toEqual([]);
});
