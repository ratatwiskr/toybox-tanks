import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { imageHash } from '../visual/catalogue-support';
import { promoteReferences } from '../visual/review-promotion';
import { validateReference } from '../visual/review-safety';

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'toybox-promotion-'));
  temporary.push(root);
  const roots = { candidates: join(root, 'candidates'), references: join(root, 'references') };
  const directory = join(roots.candidates, 'menu');
  mkdirSync(directory, { recursive: true });
  const png = (name: string) =>
    Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from(name)]);
  const fullBytes = png('full');
  const arenaBytes = png('arena');
  const full = { file: 'ui-menu.full.png', sha256: imageHash(fullBytes) };
  const arena = { file: 'ui-menu.arena.png', sha256: imageHash(arenaBytes) };
  writeFileSync(join(directory, full.file), fullBytes);
  writeFileSync(join(directory, arena.file), arenaBytes);
  const environment = {
    os: 'linux',
    osRelease: 'local',
    architecture: 'x64',
    node: 'local',
    playwright: 'local',
    browser: 'chromium-local',
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  };
  const manifest = {
    schema: 1,
    role: 'visual-review-candidate',
    complete: true,
    scene: 'ui-menu',
    source: { revision: 'a'.repeat(40), sourceStatus: '', sourceTreeSha256: 'b'.repeat(64) },
    environment,
    images: [full, arena],
  };
  const manifestPath = join(directory, 'manifest.json');
  const bytes = JSON.stringify(manifest);
  writeFileSync(manifestPath, bytes);
  const candidate = {
    manifest: manifestPath,
    manifestSha256: imageHash(Buffer.from(bytes)),
    images: [full],
  };
  const request = { schema: 1, ownerApproved: true, candidates: [candidate] };
  const approval = join(root, 'selection.json');
  const save = () => {
    writeFileSync(approval, JSON.stringify(request));
  };
  save();
  return {
    roots,
    directory,
    full,
    arena,
    fullBytes,
    environment,
    manifest,
    manifestPath,
    candidate,
    request,
    approval,
    save,
  };
}

describe('owner-selected visual reference promotion', () => {
  test('creates selected exact bytes and preserves unselected references on a later promotion', () => {
    const f = fixture();
    expect(promoteReferences(f.approval, f.roots)).toEqual([f.full.file]);
    const fullPath = join(f.roots.references, f.full.file);
    const metadata = readFileSync(`${fullPath}.approval.json`);
    expect(readFileSync(fullPath)).toEqual(f.fullBytes);
    expect(existsSync(join(f.roots.references, f.arena.file))).toBe(false);
    validateReference(fullPath, `${fullPath}.approval.json`, f.full.file, f.environment);
    f.candidate.images = [f.arena];
    f.save();
    expect(promoteReferences(f.approval, f.roots)).toEqual([f.arena.file]);
    expect(readFileSync(fullPath)).toEqual(f.fullBytes);
    expect(readFileSync(`${fullPath}.approval.json`)).toEqual(metadata);
  });

  test.each([
    'changed-bytes',
    'changed-manifest',
    'empty',
    'duplicate',
    'unknown',
    'traversal',
    'no-owner',
    'missing',
  ])('rejects %s before creating references', (failure) => {
    const f = fixture();
    if (failure === 'changed-bytes') {
      f.candidate.images = [f.full, f.arena];
      writeFileSync(join(f.directory, f.arena.file), 'changed');
    }
    if (failure === 'changed-manifest') writeFileSync(f.manifestPath, '{}');
    if (failure === 'empty') f.candidate.images = [];
    if (failure === 'duplicate') f.candidate.images = [f.full, f.full];
    if (failure === 'unknown')
      f.candidate.images = [{ file: '../escape.png', sha256: f.full.sha256 }];
    if (failure === 'traversal')
      f.candidate.manifest = join(f.directory, '..', '..', 'outside.json');
    if (failure === 'no-owner') f.request.ownerApproved = false;
    if (failure === 'missing') unlinkSync(join(f.directory, f.full.file));
    f.save();
    expect(() => promoteReferences(f.approval, f.roots)).toThrow();
    expect(existsSync(f.roots.references)).toBe(false);
  });

  test('rejects symlinked candidate paths before writing', () => {
    const f = fixture();
    unlinkSync(join(f.directory, f.full.file));
    symlinkSync(join(f.directory, f.arena.file), join(f.directory, f.full.file));
    expect(() => promoteReferences(f.approval, f.roots)).toThrow('symlink');
    expect(existsSync(f.roots.references)).toBe(false);
  });

  test('rejects an incompatible environment without replacing existing references', () => {
    const f = fixture();
    promoteReferences(f.approval, f.roots);
    const path = join(f.roots.references, f.full.file);
    const previous = readFileSync(path);
    f.manifest.environment.browser = 'different-chromium';
    const bytes = JSON.stringify(f.manifest);
    writeFileSync(f.manifestPath, bytes);
    f.candidate.manifestSha256 = imageHash(Buffer.from(bytes));
    f.save();
    expect(() => promoteReferences(f.approval, f.roots)).toThrow('Incompatible');
    expect(readFileSync(path)).toEqual(previous);
  });
});
