import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { imageHash } from '../visual/catalogue-support';
import { assertReadOnlyComparison, sameEnvironment, validateReference } from '../visual/review-safety';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('manual visual comparison safety', () => {
  test('only permits non-updating comparison and rejects CLI bypasses', () => {
    expect(() => assertReadOnlyComparison('none', ['--grep', 'ui-menu'])).not.toThrow();
    for (const mode of ['all', 'changed', 'missing']) {
      expect(() => assertReadOnlyComparison(mode, [])).toThrow('read-only');
    }
    for (const flag of ['-u', '--update-snapshots', '--update-snapshots=all', '--ignore-snapshots', '--update-source-method=overwrite']) {
      expect(() => assertReadOnlyComparison('none', [flag])).toThrow('read-only');
    }
  });

  test('compares environment values independently of key ordering', () => {
    expect(sameEnvironment({ browser: 'A', os: 'B' }, { os: 'B', browser: 'A' })).toBe(true);
    expect(sameEnvironment({ browser: 'C', os: 'B' }, { os: 'B', browser: 'A' })).toBe(false);
    expect(sameEnvironment(null, {})).toBe(false);
  });

  test('reference validation is read-only for approved, missing, incompatible and modified images', () => {
    const directory = mkdtempSync(join(tmpdir(), 'toybox-review-'));
    directories.push(directory);
    const png = join(directory, 'ui-menu.full.png');
    const approval = `${png}.approval.json`;
    const bytes = Buffer.from('reference-byte-contract');
    const environment = { browser: 'local-chromium', deviceScaleFactor: 1 };
    const metadata = JSON.stringify({ schema: 1, file: 'ui-menu.full.png', sha256: imageHash(bytes), environment });
    writeFileSync(png, bytes);
    writeFileSync(approval, metadata);
    expect(() => validateReference(png, approval, 'ui-menu.full.png', environment)).not.toThrow();
    expect(() => validateReference(png, approval, 'ui-menu.full.png', { browser: 'other' })).toThrow('Incompatible');
    expect(() => validateReference(png, `${approval}.missing`, 'ui-menu.full.png', environment)).toThrow();
    expect(readFileSync(png)).toEqual(bytes);
    expect(readFileSync(approval, 'utf8')).toBe(metadata);
    writeFileSync(png, 'changed');
    expect(() => validateReference(png, approval, 'ui-menu.full.png', environment)).toThrow('hash mismatch');
    expect(readFileSync(png, 'utf8')).toBe('changed');
    expect(readFileSync(approval, 'utf8')).toBe(metadata);
  });
});
