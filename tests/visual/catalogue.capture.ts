import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { captureScene } from './catalogue-page';
import {
  captureEnvironment,
  catalogueOutput,
  imageHash,
  pendingRecords,
  sourceProvenance,
  writeCatalogue,
} from './catalogue-support';

test('captures every catalogue scene once without image comparisons', async ({
  context,
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  const records = pendingRecords();
  const source = await sourceProvenance();
  const environment = {
    ...captureEnvironment(browser.version()),
    baseURL: testInfo.project.use.baseURL ?? 'unset',
    headless: String(testInfo.project.use.headless !== false),
  };
  await writeCatalogue(source, records, environment, false);
  for (const record of records) {
    try {
      await test.step(record.scene.id, async () => {
        await captureScene(context, record, async (kind, bytes) => {
          const file = `${record.scene.id}.${kind}.png`;
          await writeFile(join(catalogueOutput, file), bytes);
          record.images.push({ file, sha256: imageHash(bytes) });
        });
      });
      record.status = 'captured';
    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : String(error);
    }
    await writeCatalogue(source, records, environment, false);
  }
  const unchanged = JSON.stringify(await sourceProvenance()) === JSON.stringify(source);
  const runError = unchanged
    ? null
    : 'Source changed during capture; this is not a single-revision catalogue.';
  await writeCatalogue(source, records, environment, true, runError);
  const failed = records
    .filter((record) => record.status !== 'captured')
    .map((record) => record.scene.id);
  expect(
    failed,
    'Incomplete capture; inspect the catalogue gallery and manifest for per-scene errors',
  ).toEqual([]);
  expect(runError).toBeNull();
});
