import { expect, test } from '@playwright/test';

test('fullscreen button falls back to immersive mode without Element Fullscreen', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      get: () => false,
    });
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).requestFullscreen;
  });

  await page.goto('/');

  const app = page.locator('#app');
  const fullscreen = page.locator('#fullscreenBtn');
  const canvas = page.locator('#game');

  await expect(fullscreen).toBeVisible();
  await expect(fullscreen).toBeEnabled();
  await expect(app).not.toHaveClass(/immersive/);

  await fullscreen.click();

  await expect(app).toHaveClass(/immersive/);
  await expect(canvas).toBeVisible();
  await expect(fullscreen).toHaveText('Exit fullscreen');
  await expect(fullscreen).toBeEnabled();

  await fullscreen.click();

  await expect(app).not.toHaveClass(/immersive/);
  await expect(canvas).toBeVisible();
  await expect(fullscreen).toHaveText('Fullscreen');
  await expect(fullscreen).toBeEnabled();

  expect(pageErrors).toEqual([]);
});
