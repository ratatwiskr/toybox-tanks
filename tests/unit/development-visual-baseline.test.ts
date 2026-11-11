import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, test } from 'vitest';

import { FullscreenUnsupportedError } from '../visual/catalogue-fullscreen';
import { replaceDevelopmentBaseline, validateDevelopmentBaseline } from '../visual/development-cli';

const temporary: string[] = [];
afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'toybox-development-baseline-'));
  temporary.push(root);
  const baseline = join(root, 'current');
  const staging = join(root, 'staging');
  const previous = join(root, 'previous');
  mkdirSync(baseline);
  mkdirSync(staging);
  writeFileSync(join(baseline, 'old.full.png'), 'old');
  writeFileSync(join(baseline, 'notes.txt'), 'preserve owner file');
  const bytes = Buffer.from('new image bytes');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  writeFileSync(join(staging, 'ui-menu.full.png'), bytes);
  writeFileSync(join(staging, 'index.html'), 'gallery');
  const manifest = {
    schema: 2,
    role: 'revision-render-catalogue-not-approved-baselines',
    finished: true,
    complete: true,
    runError: null,
    environment: {},
    scenes: [
      {
        scene: { id: 'ui-menu' },
        status: 'captured',
        images: [{ file: 'ui-menu.full.png', sha256 }],
        expectedFiles: ['ui-menu.full.png'],
      },
    ],
  };
  writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest));
  return { baseline, staging, previous, manifest };
}

test('successful replacement removes obsolete owned images and preserves unrelated owner files', () => {
  const { baseline, staging, previous } = fixture();
  replaceDevelopmentBaseline(staging, baseline, previous);
  expect(existsSync(join(baseline, 'old.full.png'))).toBe(false);
  expect(readFileSync(join(baseline, 'notes.txt'), 'utf8')).toBe('preserve owner file');
  expect(validateDevelopmentBaseline(baseline).images.size).toBe(1);
  expect(existsSync(previous)).toBe(false);
});

test('incomplete or changed staging never replaces the previous checkpoint', () => {
  const { baseline, staging, previous, manifest } = fixture();
  manifest.complete = false;
  writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest));
  expect(() => {
    replaceDevelopmentBaseline(staging, baseline, previous);
  }).toThrow();
  expect(readFileSync(join(baseline, 'old.full.png'), 'utf8')).toBe('old');
  manifest.complete = true;
  writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest));
  writeFileSync(join(staging, 'ui-menu.full.png'), 'modified');
  expect(() => {
    replaceDevelopmentBaseline(staging, baseline, previous);
  }).toThrow();
  expect(readFileSync(join(baseline, 'old.full.png'), 'utf8')).toBe('old');
});

test('failed publish restores the old checkpoint', () => {
  const { baseline, staging, previous } = fixture();
  const move = (from: string, to: string): void => {
    if (from === staging) throw new Error('simulated publish failure');
    renameSync(from, to);
  };
  expect(() => {
    replaceDevelopmentBaseline(staging, baseline, previous, move);
  }).toThrow('simulated');
  expect(readFileSync(join(baseline, 'old.full.png'), 'utf8')).toBe('old');
  expect(existsSync(previous)).toBe(false);
});

test('baseline validation is read-only', () => {
  const { staging } = fixture();
  const before = readFileSync(join(staging, 'manifest.json'));
  validateDevelopmentBaseline(staging);
  expect(readFileSync(join(staging, 'manifest.json'))).toEqual(before);
});

test('fullscreen denial is an explicit unsupported-environment error', () => {
  const error = new FullscreenUnsupportedError(
    'FULLSCREEN_UNSUPPORTED: browser denied real fullscreen',
  );
  expect(error.name).toBe('FullscreenUnsupportedError');
  expect(error.message).toContain('FULLSCREEN_UNSUPPORTED');
  expect(error.message).not.toContain('CSS');
});
