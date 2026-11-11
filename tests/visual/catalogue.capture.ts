import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { captureScene } from './catalogue-page';
import {
  captureEnvironment,
  imageHash,
  imageKinds,
  pendingRecords,
  sourceProvenance,
  type CaptureRecord,
} from './catalogue-support';
import { developmentStaging } from './development-cli';

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function writeCatalogue(
  source: Awaited<ReturnType<typeof sourceProvenance>>,
  records: readonly CaptureRecord[],
  environment: Readonly<Record<string, string | number>>,
  finished: boolean,
  runError: string | null = null,
): Promise<void> {
  const complete =
    finished && runError === null && records.every((record) => record.status === 'captured');
  const manifest = {
    schema: 2,
    role: 'revision-render-catalogue-not-approved-baselines',
    finished,
    complete,
    runError,
    source,
    environment,
    comparisonsPerformed: false,
    scenes: records.map((record) => ({
      ...record,
      expectedFiles: imageKinds(record.scene).map((kind) => `${record.scene.id}.${kind}.png`),
    })),
  };
  const sections = records
    .map(
      (record) =>
        `<section><h2>${escape(record.scene.id)}: ${record.status}</h2><p>${escape(record.scene.purpose)}</p><pre>${escape(record.error ?? '')}</pre>${record.images.map((image) => `<h3>${escape(image.file)}</h3><img loading="lazy" src="${escape(image.file)}" alt="${escape(image.file)}"><p>SHA-256: <code>${image.sha256}</code></p>`).join('')}</section>`,
    )
    .join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Development screenshot checkpoint</title><style>body{font:16px system-ui;margin:2rem;background:#f3ebdc;color:#242424}section{margin:3rem 0}img{display:block;max-width:100%;height:auto;border:1px solid #777}pre,code{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>${complete ? 'Complete development capture' : 'INCOMPLETE development capture'}</h1><p>Not aesthetic approval or formal regression references.</p><p>Source: <code>${escape(source.revision)}</code>; ${source.sourceStatus === '' ? 'source clean' : 'source dirty; see manifest'}.</p><pre>${escape(runError ?? '')}</pre>${sections}</html>\n`;
  for (const [file, bytes] of [
    ['index.html', html],
    ['manifest.json', `${JSON.stringify(manifest, null, 2)}\n`],
  ]) {
    if (file === undefined || bytes === undefined) throw new Error('Catalogue output missing');
    await writeFile(join(developmentStaging, `${file}.tmp`), bytes);
    await rename(join(developmentStaging, `${file}.tmp`), join(developmentStaging, file));
  }
}

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
          await writeFile(join(developmentStaging, file), bytes);
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
  expect(
    records.filter((record) => record.status !== 'captured').map((record) => record.scene.id),
    'Incomplete capture; inspect staging gallery and manifest',
  ).toEqual([]);
  expect(runError).toBeNull();
});
