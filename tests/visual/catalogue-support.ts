import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { arch, platform, release } from 'node:os';
import { join } from 'node:path';

import { MAPS } from '../../src/sim/maps';
import type { ScenarioName, ScenarioOptions, TestSnapshot } from '../../src/test-bridge';
import { VISUAL_SCENES, type VisualSceneId } from '../../src/visual-scenes';

export const catalogueOutput = 'docs/visual-catalogue/current';
const sourcePaths = ['.', ':(exclude)docs/visual-catalogue/**'];

export interface CaptureScene {
  readonly id: string;
  readonly purpose: string;
  readonly scenario: ScenarioName;
  readonly options: ScenarioOptions;
  readonly fixture?: VisualSceneId;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly mobile?: 'landscape' | 'portrait';
  readonly fullscreen?: boolean;
  readonly views?: readonly ('full' | 'arena' | 'detail')[];
}

export interface CaptureRecord {
  readonly scene: CaptureScene;
  status: 'pending' | 'captured' | 'failed';
  error: string | null;
  state: TestSnapshot | null;
  renderContext: unknown;
  readonly images: Array<{ readonly file: string; readonly sha256: string }>;
}

export function captureScenes(): CaptureScene[] {
  const viewport = { width: 1440, height: 1000 };
  const ordinary: readonly ScenarioName[] = [
    'menu',
    'coop',
    'active-shot',
    'disabled-player',
    'paused',
    'cleared',
    'defeat',
    'completed',
  ];
  const scenes: CaptureScene[] = [
    ...ordinary.map((scenario) => ({
      id: `ui-${scenario}`,
      purpose: `Existing ${scenario} state through the application and production renderer.`,
      scenario,
      options: {},
      viewport,
    })),
    {
      id: 'ui-level-select',
      purpose: 'Corkboard level select after choosing co-op, with all campaign blueprints.',
      scenario: 'level-select',
      options: { mode: 'coop' },
      viewport,
      views: ['full'],
    },
    {
      id: 'ui-resized-gameplay',
      purpose: 'Gameplay at the existing resized viewport.',
      scenario: 'coop',
      options: {},
      viewport: { width: 1280, height: 720 },
    },
    ...MAPS.map((map, room) => ({
      id: `campaign-${map.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-start`,
      purpose: `${map.name}: real co-op room initialization, zero ticks and intact terrain.`,
      scenario: 'room' as const,
      options: { room, mode: 'coop' as const },
      viewport,
    })),
    ...VISUAL_SCENES.map((fixture) => ({
      id: fixture.id,
      purpose: `Synthetic fixture: ${fixture.purpose}`,
      scenario: 'coop' as const,
      options: {},
      fixture: fixture.id,
      viewport,
    })),
    {
      id: 'touch-landscape-gameplay',
      purpose: 'Real touch UI in compact landscape, whole arena between the pads.',
      scenario: 'solo',
      options: {},
      viewport: { width: 640, height: 300 },
      mobile: 'landscape',
      views: ['full', 'arena'],
    },
    {
      id: 'touch-portrait-paused',
      purpose: 'Rotate a clock-controlled landscape game into portrait; actual orientation guard.',
      scenario: 'solo',
      options: {},
      viewport: { width: 390, height: 844 },
      mobile: 'portrait',
      views: ['full'],
    },
    // Fullscreen catalogue coverage is deferred. Entering fullscreen currently
    // triggers the app's focus/pause behavior in the capture environment, and
    // the intended landscape-only touch behavior needs a separate decision.
  ];
  if (new Set(scenes.map((scene) => scene.id)).size !== scenes.length) {
    throw new Error('Duplicate catalogue scene IDs');
  }
  if (scenes.some((scene) => !/^[a-z0-9-]+$/.test(scene.id))) {
    throw new Error('Unsafe catalogue scene ID');
  }
  return scenes;
}

export function pendingRecords(): CaptureRecord[] {
  return captureScenes().map((scene) => ({
    scene,
    status: 'pending',
    error: null,
    state: null,
    renderContext: null,
    images: [],
  }));
}

export function imageKinds(scene: CaptureScene): readonly string[] {
  return (
    scene.views ?? (scene.fixture === undefined ? ['full', 'arena'] : ['full', 'arena', 'detail'])
  );
}

export function imageHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function git(args: readonly string[]): string {
  return execFileSync('git', [...args], { encoding: 'utf8' }).trimEnd();
}

export async function sourceProvenance(): Promise<{
  readonly revision: string;
  readonly sourceStatus: string;
  readonly sourceTreeSha256: string;
}> {
  const paths = git([
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    ...sourcePaths,
  ]);
  const digest = createHash('sha256');
  for (const path of [...new Set(paths.split('\0').filter(Boolean))].sort()) {
    digest.update(path).update('\0');
    try {
      digest.update(await readFile(path));
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
        throw error;
      }
      digest.update('<deleted>');
    }
  }
  return {
    revision: git(['rev-parse', 'HEAD']),
    sourceStatus: git(['status', '--porcelain=v1', '--untracked-files=all', '--', ...sourcePaths]),
    sourceTreeSha256: digest.digest('hex'),
  };
}

export function captureEnvironment(browser: string): Record<string, string | number> {
  return {
    os: platform(),
    osRelease: release(),
    architecture: arch(),
    node: process.version,
    playwright: execFileSync(
      process.execPath,
      ['node_modules/@playwright/test/cli.js', '--version'],
      { encoding: 'utf8' },
    ).trim(),
    browser,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  };
}

export async function resetCatalogue(): Promise<void> {
  await mkdir(catalogueOutput, { recursive: true });
  if ((await lstat(catalogueOutput)).isSymbolicLink()) {
    throw new Error('Refusing to clean a symlinked catalogue directory');
  }
  for (const entry of await readdir(catalogueOutput, { withFileTypes: true })) {
    const owned =
      /^[a-z0-9-]+\.(full|arena|detail)(\.attempt-[12])?\.png$/.test(entry.name) ||
      ['index.html', 'manifest.json', 'index.html.tmp', 'manifest.json.tmp'].includes(entry.name);
    if (!owned) {
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Refusing to remove non-file catalogue output: ${entry.name}`);
    }
    await unlink(join(catalogueOutput, entry.name));
  }
}

function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function writeCatalogue(
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
    .map((record) => {
      const heading = `<h2>${escape(record.scene.id)}: ${record.status.toUpperCase()}</h2>`;
      const purpose = `<p>${escape(record.scene.purpose)}</p>`;
      const error = record.error === null ? '' : `<pre>${escape(record.error)}</pre>`;
      const images = record.images
        .map(
          (image) =>
            `<h3>${escape(image.file)}</h3><img loading="lazy" src="${escape(image.file)}" alt="${escape(image.file)}"><p>SHA-256: <code>${image.sha256}</code></p>`,
        )
        .join('');
      return `<section>${heading}${purpose}${error}${images}</section>`;
    })
    .join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Toybox Tanks captures</title><style>body{font:16px system-ui;margin:2rem;background:#f3ebdc;color:#242424}section{margin:3rem 0}img{display:block;max-width:100%;height:auto;margin:1rem 0;border:1px solid #777}pre,code{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>${complete ? 'Complete capture' : 'INCOMPLETE capture'}</h1><p>No image comparisons or baseline approval performed.</p><p>Source: <code>${escape(source.revision)}</code>; ${source.sourceStatus === '' ? 'source clean' : 'source dirty; see manifest'}.</p><p>${String(records.filter((record) => record.status === 'captured').length)} captured; ${String(records.filter((record) => record.status === 'failed').length)} failed; ${String(records.filter((record) => record.status === 'pending').length)} pending.</p><pre>${escape(runError ?? '')}</pre>${sections}</html>\n`;
  await writeFile(join(catalogueOutput, 'index.html.tmp'), html);
  await rename(join(catalogueOutput, 'index.html.tmp'), join(catalogueOutput, 'index.html'));
  await writeFile(
    join(catalogueOutput, 'manifest.json.tmp'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await rename(join(catalogueOutput, 'manifest.json.tmp'), join(catalogueOutput, 'manifest.json'));
}
