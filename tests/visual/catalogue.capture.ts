import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { CONFIG } from '../../src/config';
import {
  captureEnvironment,
  catalogueOutput,
  imageHash,
  pendingRecords,
  sourceProvenance,
  writeCatalogue,
} from './catalogue-support';

test('captures every catalogue scene once without image comparisons', async ({ context, browser }, testInfo) => {
  test.setTimeout(300_000);
  const records = pendingRecords();
  const source = await sourceProvenance();
  const environment = {
    ...captureEnvironment(browser.version()),
    baseURL: testInfo.project.use.baseURL ?? 'unset',
    headless: String(testInfo.project.use.headless !== false),
  };
  await writeCatalogue(source, records, environment, false);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
  });

  for (const record of records) {
    const scene = record.scene;
    try {
      await test.step(scene.id, async () => {
        const page = await context.newPage();
        page.setDefaultTimeout(10_000);
        page.setDefaultNavigationTimeout(15_000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') {
            errors.push(message.text());
          }
        });
        try {
          await page.setViewportSize(scene.viewport);
          await page.goto('/');
          await page.bringToFront();
          await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
          await page.mouse.move(0, 0);
          // Establish keyboard focus modality before the application focuses its scene target.
          await page.keyboard.press('Tab');
          await page.evaluate(async (entry) => {
            const bridge = window.__TOYBOX_TEST__;
            if (bridge === undefined) {
              throw new Error('Test bridge missing');
            }
            if (entry.fixture === undefined) {
              bridge.loadScenario(entry.scenario, entry.options);
            } else {
              bridge.loadVisualScene(entry.fixture);
            }
            await document.fonts.ready;
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });
            bridge.render();
          }, scene);
          const state = await page.evaluate(() => {
            const bridge = window.__TOYBOX_TEST__;
            if (bridge === undefined) {
              throw new Error('Test bridge missing after fixture loading');
            }
            return bridge.snapshot();
          });
          record.state = state;
          if (scene.scenario === 'room') {
            expect(state.ticks).toBe(0);
            expect(state.shells).toHaveLength(0);
            expect(state.effects).toHaveLength(0);
            expect(state.corks.every((cell) => cell.hitsRemaining === 3 && !cell.destroyed)).toBe(true);
          }
          const canvas = page.locator('#game');
          await expect(canvas).toBeVisible();
          const box = await canvas.boundingBox();
          if (box === null) {
            throw new Error('Canvas bounds missing');
          }
          record.renderContext = await page.evaluate(() => ({
            deviceScaleFactor: window.devicePixelRatio,
            fonts: document.fonts.status,
            focusedElement: document.activeElement?.id ?? '',
            visible: document.visibilityState,
          }));
          const settings = { animations: 'disabled', caret: 'hide', timeout: 10_000 } as const;
          const save = async (kind: string, bytes: Buffer): Promise<void> => {
            const file = `${scene.id}.${kind}.png`;
            await writeFile(join(catalogueOutput, file), bytes);
            record.images.push({ file, sha256: imageHash(bytes) });
          };
          await save('full', await page.screenshot(settings));
          await save('arena', await page.screenshot({ ...settings, clip: box }));
          if (scene.fixture !== undefined) {
            await save('detail', await page.screenshot({
              ...settings,
              clip: {
                x: box.x + (160 / CONFIG.width) * box.width,
                y: box.y + (120 / CONFIG.height) * box.height,
                width: (560 / CONFIG.width) * box.width,
                height: (300 / CONFIG.height) * box.height,
              },
            }));
          }
          expect(await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot())).toEqual(state);
          expect(errors, scene.id).toEqual([]);
        } finally {
          await page.close();
        }
      });
      record.status = 'captured';
    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : String(error);
    }
    await writeCatalogue(source, records, environment, false);
  }

  const unchanged = JSON.stringify(await sourceProvenance()) === JSON.stringify(source);
  const runError = unchanged ? null : 'Source changed during capture; this is not a single-revision catalogue.';
  await writeCatalogue(source, records, environment, true, runError);
  const failed = records.filter((record) => record.status !== 'captured').map((record) => record.scene.id);
  expect(failed, 'Incomplete capture; inspect the catalogue gallery and manifest for per-scene errors').toEqual([]);
  expect(runError).toBeNull();
});
