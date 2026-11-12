import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
import { developmentBaseline, validateDevelopmentBaseline } from './development-cli';
import { assertReadOnlyComparison } from './review-safety';

const records = pendingRecords();
const selection = process.env.TOYBOX_REVIEW_SCENES;
const requested = selection === undefined ? null : selection.split(',');
if (
  requested !== null &&
  (new Set(requested).size !== requested.length ||
    requested.some((id) => !records.some((record) => record.scene.id === id)))
) {
  throw new Error('TOYBOX_REVIEW_SCENES must contain unique, known scene IDs');
}

test('reference-path-contract', () => {
  assertReadOnlyComparison(test.info().config.updateSnapshots, process.argv);
  const baseline = validateDevelopmentBaseline();
  const expected = records.flatMap((record) =>
    imageKinds(record.scene).map((kind) => `${record.scene.id}.${kind}.png`),
  );
  expect(
    [...baseline.images.keys()].sort(),
    'Scene coverage changed; inspect actual captures before deliberately refreshing the development checkpoint',
  ).toEqual(expected.sort());
  for (const file of expected) {
    expect(resolve(test.info().snapshotPath('.', file))).toBe(resolve(developmentBaseline, file));
  }
});

for (const record of records.filter(
  (entry) => requested === null || requested.includes(entry.scene.id),
)) {
  test(record.scene.id, async ({ context, browser }, testInfo) => {
    assertReadOnlyComparison(testInfo.config.updateSnapshots, process.argv);
    expect(testInfo.project.use.headless, 'Use documented headless Chromium').not.toBe(false);
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
          'Menu varies across fresh pages; inspect both captures and context',
        ).toEqual(record.images.map((image) => image.sha256));
      }
      expect(await sourceProvenance(), 'Source changed during capture').toEqual(source);
      const manifest = {
        schema: 1,
        role: 'development-comparison-actual',
        complete: true,
        scene: record.scene.id,
        source,
        environment,
        images: record.images,
        state: record.state,
        renderContext: record.renderContext,
      };
      const manifestPath = testInfo.outputPath('manifest.json');
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      await testInfo.attach('actual-manifest', {
        path: manifestPath,
        contentType: 'application/json',
      });
      let baseline: ReturnType<typeof validateDevelopmentBaseline>;
      try {
        baseline = validateDevelopmentBaseline();
        for (const [key, value] of Object.entries(environment)) {
          if (baseline.environment[key] !== value)
            throw new Error(
              `Capture environment differs: ${key}; diagnose before refreshing checkpoint`,
            );
        }
      } catch (error) {
        expect.soft(false, error instanceof Error ? error.message : String(error)).toBe(true);
        return;
      }
      for (const image of record.images) {
        await test.step(image.file, async () => {
          const reference = testInfo.snapshotPath('.', image.file);
          expect(resolve(reference)).toBe(resolve(developmentBaseline, image.file));
          if (!baseline.images.has(image.file)) {
            expect
              .soft(
                false,
                `No saved development image for ${image.file}; actual attached for review`,
              )
              .toBe(true);
            return;
          }
          const actual = await readFile(testInfo.outputPath(image.file));
          expect
            .soft(actual, image.file)
            .toMatchSnapshot(['.', image.file], { threshold: 0, maxDiffPixels: 0 });
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
