import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TANK_WITH_LAYERS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
  '<defs><linearGradient id="paint"><stop stop-color="#fff"/></linearGradient></defs>' +
  '<g id="hull"><rect x="10" y="10" width="100" height="100" fill="url(#paint)"/></g>' +
  '<g id="turret"><circle cx="64" cy="64" r="20"/></g>' +
  '<g id="windup-key"><path d="M100 64h20"/></g>' +
  '</svg>';

const TANK_WITHOUT_OPTIONAL_LAYERS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
  '<g id="hull"><rect x="10" y="10" width="100" height="100"/></g>' +
  '</svg>';

interface SvgLoaderModule {
  splitTank(source: string): { hull: string; turret: string | null; key: string | null };
}

async function splitInBrowser(
  page: Page,
  source: string,
): Promise<{ hull: string; turret: string | null; key: string | null }> {
  return page.evaluate(async (svg) => {
    const moduleUrl = '/src/render/svg-loader.ts';
    const loader = (await import(/* @vite-ignore */ moduleUrl)) as SvgLoaderModule;
    return loader.splitTank(svg);
  }, source);
}

test.describe('svg loader DOM path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('splits direct tank layers and keeps shared defs in each one', async ({ page }) => {
    const layers = await splitInBrowser(page, TANK_WITH_LAYERS);

    expect(layers.hull).toContain('id="hull"');
    expect(layers.hull).not.toContain('id="turret"');
    expect(layers.hull).not.toContain('id="windup-key"');
    expect(layers.turret).toContain('id="turret"');
    expect(layers.turret).not.toContain('id="hull"');
    expect(layers.turret).not.toContain('id="windup-key"');
    expect(layers.key).toContain('id="windup-key"');
    expect(layers.key).not.toContain('id="hull"');
    expect(layers.key).not.toContain('id="turret"');

    expect(layers.hull).toContain('<defs');
    expect(layers.turret).toContain('<defs');
    expect(layers.key).toContain('<defs');
  });

  test('returns null layers when the optional groups are absent', async ({ page }) => {
    const layers = await splitInBrowser(page, TANK_WITHOUT_OPTIONAL_LAYERS);

    expect(layers.hull).toContain('id="hull"');
    expect(layers.turret).toBeNull();
    expect(layers.key).toBeNull();
  });
});
