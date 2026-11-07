import { expect, test } from '@playwright/test';

test('published revision loads, starts both modes, and keeps production hooks private', async ({
  page,
  request,
}, testInfo) => {
  const expectedSHA = process.env.PAGES_EXPECTED_SHA;
  const baseURL = testInfo.project.use.baseURL;
  if (!expectedSHA || !/^[a-f0-9]{40}$/.test(expectedSHA) || !baseURL) {
    throw new Error('The Pages smoke requires PAGES_EXPECTED_SHA and a configured base URL.');
  }

  const markerURL = new URL('deployed-commit.txt', baseURL);
  markerURL.searchParams.set('sha', expectedSHA);
  await expect
    .poll(
      async () => {
        const response = await request.get(markerURL.href, { timeout: 15_000 });
        return response.ok() ? (await response.text()).trim() : `HTTP ${String(response.status())}`;
      },
      { timeout: 120_000, message: 'Pages must serve the commit deployed by this workflow' },
    )
    .toBe(expectedSHA);

  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${String(response.status())}: ${response.url()}`);
    }
  });
  page.on('requestfailed', (failedRequest) => {
    errors.push(`requestfailed: ${failedRequest.url()}`);
  });

  const response = await page.goto('./');
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Toybox Tanks/);
  await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
  await expect(page.locator('#game')).toBeVisible();

  await page.getByRole('button', { name: 'Start two-player co-op', exact: true }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#modeInfo')).toContainText('Local co-op');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialogTitle')).toContainText('Tabletop timeout');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toBeHidden();

  await page.reload();
  await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#modeInfo')).toContainText('Solo practice');
  await expect(page.locator('#hp2')).toContainText('SOLO');

  await page.goto('./?test=1');
  await expect(page.locator('#dialogTitle')).toContainText('Small tanks.');
  const exposed = await page.evaluate(() => '__TOYBOX_TEST__' in window);
  expect(exposed).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});
