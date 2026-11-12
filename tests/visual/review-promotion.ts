import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

import { captureScenes, imageHash, imageKinds } from './catalogue-support';
import { isObject, sameEnvironment, validateReference } from './review-safety';

function object(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new Error('Expected a JSON object');
  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error('Expected a nonempty string');
  return value;
}

function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected a JSON array');
  return value;
}

function digest(value: unknown): string {
  const result = text(value);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error('Expected an exact SHA-256 hash');
  return result;
}

function noLinks(path: string): void {
  const full = resolve(path);
  let current = parse(full).root;
  for (const part of relative(current, full).split(sep)) {
    current = join(current, part);
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink() === true) {
      throw new Error(`Refusing symlinked path: ${current}`);
    }
  }
}

function readSafe(path: string): Buffer {
  noLinks(path);
  if (!lstatSync(path).isFile()) throw new Error(`Expected a regular file: ${path}`);
  return readFileSync(path);
}

function within(root: string, path: string): void {
  const rest = relative(resolve(root), resolve(path));
  if (rest === '' || rest === '..' || rest.startsWith(`..${sep}`) || isAbsolute(rest)) {
    throw new Error('Candidate manifest must be inside the comparison output directory');
  }
}

function environment(value: unknown): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, entry] of Object.entries(object(value))) {
    if (typeof entry !== 'string' && (typeof entry !== 'number' || !Number.isFinite(entry))) {
      throw new Error('Invalid capture environment');
    }
    result[key] = entry;
  }
  for (const key of ['os', 'osRelease', 'architecture', 'node', 'playwright', 'browser'])
    text(result[key]);
  if (
    result.deviceScaleFactor !== 1 ||
    result.colorScheme !== 'light' ||
    result.reducedMotion !== 'reduce' ||
    result.locale !== 'en-US' ||
    result.timezoneId !== 'UTC'
  ) {
    throw new Error('Unsupported capture environment');
  }
  return result;
}

export function promoteReferences(
  approvalPath: string,
  roots = {
    candidates: 'test-results/visual-review',
    references: 'docs/visual-references/chromium-local',
  },
): string[] {
  const approvalBytes = readSafe(approvalPath);
  const request = object(JSON.parse(approvalBytes.toString('utf8')));
  if (request.schema !== 1 || request.ownerApproved !== true) {
    throw new Error('Explicit ownerApproved:true and schema:1 are required');
  }
  const candidates = list(request.candidates);
  if (candidates.length === 0) throw new Error('Select at least one reviewed candidate');
  const plan: Array<{ file: string; bytes: Buffer; metadata: string }> = [];
  const selected = new Set<string>();
  let commonEnvironment: Record<string, string | number> | undefined;
  noLinks(roots.references);

  for (const value of candidates) {
    const candidate = object(value);
    const manifestPath = text(candidate.manifest);
    within(roots.candidates, manifestPath);
    const manifestBytes = readSafe(manifestPath);
    const manifestSha256 = digest(candidate.manifestSha256);
    if (imageHash(manifestBytes) !== manifestSha256)
      throw new Error('Reviewed manifest hash changed');
    const manifest = object(JSON.parse(manifestBytes.toString('utf8')));
    if (
      manifest.schema !== 1 ||
      manifest.role !== 'visual-review-candidate' ||
      manifest.complete !== true
    ) {
      throw new Error('Candidate capture is incomplete or unsupported');
    }
    const scene = captureScenes().find((entry) => entry.id === manifest.scene);
    if (scene === undefined) throw new Error('Unknown candidate scene');
    const expected = imageKinds(scene).map((kind) => `${scene.id}.${kind}.png`);
    const images = list(manifest.images).map((entry) => {
      const image = object(entry);
      return { file: text(image.file), sha256: digest(image.sha256) };
    });
    if (
      images.length !== expected.length ||
      new Set(images.map((image) => image.file)).size !== images.length ||
      images.some((image) => !expected.includes(image.file))
    ) {
      throw new Error('Candidate must contain every canonical scene view exactly once');
    }
    const source = object(manifest.source);
    const sourceRecord = {
      revision: text(source.revision),
      sourceStatus: source.sourceStatus,
      sourceTreeSha256: digest(source.sourceTreeSha256),
    };
    if (
      !/^[a-f0-9]{40}$/.test(sourceRecord.revision) ||
      typeof sourceRecord.sourceStatus !== 'string'
    ) {
      throw new Error('Invalid source provenance');
    }
    const capturedEnvironment = environment(manifest.environment);
    if (
      commonEnvironment !== undefined &&
      !sameEnvironment(capturedEnvironment, commonEnvironment)
    ) {
      throw new Error('Incompatible selected candidate environments');
    }
    commonEnvironment = capturedEnvironment;
    const chosen = list(candidate.images);
    if (chosen.length === 0)
      throw new Error('Select explicit scene/view filenames; no approve-all default');
    for (const entry of chosen) {
      const choice = object(entry);
      const file = text(choice.file);
      const sha256 = digest(choice.sha256);
      const image = images.find((item) => item.file === file);
      if (image === undefined || image.sha256 !== sha256 || selected.has(file)) {
        throw new Error('Unknown, duplicate or hash-mismatched selected image');
      }
      selected.add(file);
      const bytes = readSafe(join(dirname(manifestPath), file));
      if (imageHash(bytes) !== sha256) throw new Error(`Reviewed candidate bytes changed: ${file}`);
      if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
        throw new Error('Candidate is not PNG data');
      for (const destination of [
        join(roots.references, file),
        join(roots.references, `${file}.approval.json`),
      ]) {
        noLinks(destination);
        const existing = lstatSync(destination, { throwIfNoEntry: false });
        if (existing !== undefined && (!existing.isFile() || existing.nlink > 1)) {
          throw new Error('Refusing non-regular or hard-linked reference destination');
        }
      }
      const metadata = `${JSON.stringify({ schema: 1, file, sha256, scene: scene.id, source: sourceRecord, environment: capturedEnvironment, candidateManifestSha256: manifestSha256, approvalRequestSha256: imageHash(approvalBytes) }, null, 2)}\n`;
      plan.push({ file, bytes, metadata });
    }
  }

  if (commonEnvironment === undefined) throw new Error('No candidate environment');
  if (existsSync(roots.references)) {
    for (const entry of readdirSync(roots.references)) {
      const path = join(roots.references, entry);
      if (entry.endsWith('.png') && !existsSync(`${path}.approval.json`)) {
        throw new Error(`Orphan reference requires explicit investigation: ${entry}`);
      }
      if (!entry.endsWith('.png.approval.json')) continue;
      const file = entry.slice(0, -'.approval.json'.length);
      readSafe(path);
      readSafe(join(roots.references, file));
      validateReference(join(roots.references, file), path, file, commonEnvironment);
    }
  }
  mkdirSync(roots.references, { recursive: true });
  for (const item of plan) {
    writeFileSync(join(roots.references, item.file), item.bytes);
    writeFileSync(join(roots.references, `${item.file}.approval.json`), item.metadata);
  }
  return plan.map((item) => item.file);
}
