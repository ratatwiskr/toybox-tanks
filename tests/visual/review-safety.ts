import { readFileSync } from 'node:fs';

import { imageHash } from './catalogue-support';

export function assertReadOnlyComparison(updateSnapshots: string, args: readonly string[]): void {
  const unsafe = args.some(
    (arg) =>
      arg.startsWith('-u') ||
      /^--(update-snapshots|update-source-method|ignore-snapshots)(=|$)/.test(arg),
  );
  if (updateSnapshots !== 'none' || unsafe) {
    throw new Error(
      'Visual comparison is read-only: snapshot update/ignore overrides are forbidden.',
    );
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sameEnvironment(
  actual: unknown,
  expected: Readonly<Record<string, string | number>>,
): boolean {
  if (!isObject(actual)) return false;
  const ordered = (value: Readonly<Record<string, unknown>>): string =>
    JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  return ordered(actual) === ordered(expected);
}

export function validateReference(
  png: string,
  approval: string,
  file: string,
  environment: Readonly<Record<string, string | number>>,
): void {
  const metadata: unknown = JSON.parse(readFileSync(approval, 'utf8'));
  if (!isObject(metadata) || metadata.schema !== 1 || metadata.file !== file) {
    throw new Error(`Missing or invalid owner-approval metadata for ${file}`);
  }
  if (!sameEnvironment(metadata.environment, environment)) {
    throw new Error(
      `Incompatible reference environment for ${file}; no comparison or refresh performed.`,
    );
  }
  if (metadata.sha256 !== imageHash(readFileSync(png))) {
    throw new Error(`Approved reference hash mismatch for ${file}; review required.`);
  }
}
