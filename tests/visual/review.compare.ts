import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

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
import { assertReadOnlyComparison, validateReference } from './review-safety';

const records = pendingRecords();
const selection = process.env.TOYBOX_REVIEW_SCENES;
const requested = selection === undefined ? null : selection.split(',');
if (
  requested !== null &&
  (new Set(requested).size !== requested.length ||
    requested.some((id) => !records.some((record) => record.scene.id === id)))
) {
  throw new Error('TOYBOX_REVIEW_SCENES must contain unique, known, comma-separated scene IDs.');
}

test('reference-path-contract', () => {
  assertReadOnlyComparison(test.info().config.updateSnapshots, process.argv);
  for (const record of records) {
    for (const kind of imageKinds(record.scene)) {
      const file = `${record.scene.id}.${kind}.png`;
      expect(basename(test.info().snapshotPath('.', file)), file).toBe(file);
    }
  }
});

for (const record of records.filter(
  (entry) => requested === null || requested.includes(entry.scene.id),
)) {
  test(record.scene.id, async ({ context, browser }, testInfo) => {
    assertReadOnlyComparison(testInfo.config.updateSnapshots, process.argv);
    expect(
      testInfo.project.use.headless,
      'Use the documented headless Chromium environment',
    ).not.toBe(false);
    const source = await sourceProvenance();
    const environment = captureEnvironment(browser.version());
    const save =
      (target: CaptureRecord, suffix: string) =>
      async (kind: string, bytes: Buffer): Promise<void> => {
        const file = `${record.scene.id}.${kind}${suffix}.png`;
        const path = testInfo.outputPath(file);
        await writeFile(path, bytes);
        target.images.push({ file, sha256: imageHash(bytes) });
        await testInfo.attach(file, { path, contentType: 'image/png' });
      };
    try {
      await captureScene(context, record, save(record, ''));
      record.status = 'captured';
      if (record.scene.id === 'ui-menu') {
        const repeated: CaptureRecord = { ...record, images: [] };
        try {
          await captureScene(context, repeated, save(repeated, '.repeat'));
        } finally {
          await testInfo.attach('menu-repeat-context', {
            body: JSON.stringify({ first: record, second: repeated }, null, 2),
            contentType: 'application/json',
          });
        }
        expect(
          repeated.images.map((image) => image.sha256),
          'Menu varies across fresh pages: inspect both PNG sets and context before approving references',
        ).toEqual(record.images.map((image) => image.sha256));
      }
      expect(await sourceProvenance(), 'Source changed during capture').toEqual(source);
      const manifest = {
        schema: 1,
        role: 'visual-review-candidate',
        complete: true,
        scene: record.scene.id,
        source,
        environment,
        images: record.images,
        state: record.state,
        renderContext: record.renderContext,
      };
      const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
      const manifestPath = testInfo.outputPath('manifest.json');
      await writeFile(manifestPath, manifestBytes);
      await testInfo.attach(`manifest-sha256-${imageHash(manifestBytes)}`, {
        path: manifestPath,
        contentType: 'application/json',
      });
      for (const image of record.images) {
        await test.step(image.file, async () => {
          // Explicit segments preserve the dotted filename used by promotion.
          const reference = testInfo.snapshotPath('.', image.file);
          expect(basename(reference), 'Reference filename must match the promotion manifest').toBe(
            image.file,
          );
          try {
            validateReference(reference, `${reference}.approval.json`, image.file, environment);
          } catch (error) {
            expect.soft(
              false,
              `UNAPPROVED / INCOMPATIBLE ${image.file}: ${error instanceof Error ? error.message : String(error)}`,
            ).toBe(true);
            return;
          }
          const actual = await readFile(testInfo.outputPath(image.file));
          expect.soft(actual, image.file).toMatchSnapshot(['.', image.file], {
            threshold: 0,
            maxDiffPixels: 0,
          });
        });
      }
    } finally {
      await testInfo.attach('capture-context', {
        body: JSON.stringify(record, null, 2),
        contentType: 'application/json',
      });
    }
  });
}
