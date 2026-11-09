import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { arch, platform, release } from 'node:os';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { CONFIG } from '../../src/config';
import { MAPS } from '../../src/sim/maps';
import type { ScenarioName, ScenarioOptions } from '../../src/test-bridge';
import { VISUAL_SCENES, type VisualSceneId } from '../../src/visual-scenes';

interface Scene {
  readonly id: string;
  readonly purpose: string;
  readonly scenario: ScenarioName;
  readonly options: ScenarioOptions;
  readonly fixture?: VisualSceneId;
  readonly viewport: { readonly width: number; readonly height: number };
}

const viewport = { width: 1440, height: 1000 };
const output = 'docs/visual-catalogue/current';
const sourcePaths = ['.', ':(exclude)docs/visual-catalogue/**'];

function hash(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function git(args: readonly string[]): string {
  return execFileSync('git', [...args], { encoding: 'utf8' }).trimEnd();
}

async function provenance(): Promise<{
  readonly revision: string;
  readonly sourceStatus: string;
  readonly sourceTreeSha256: string;
}> {
  const paths = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...sourcePaths]);
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
    digest.update('\0');
  }
  return {
    revision: git(['rev-parse', 'HEAD']),
    sourceStatus: git(['status', '--porcelain=v1', '--untracked-files=all', '--', ...sourcePaths]),
    sourceTreeSha256: digest.digest('hex'),
  };
}

function scenes(): Scene[] {
  const ordinary: readonly ScenarioName[] = [
    'menu', 'coop', 'active-shot', 'disabled-player', 'paused', 'cleared', 'defeat', 'completed',
  ];
  return [
    ...ordinary.map((scenario) => ({
      id: `ui-${scenario}`,
      purpose: `Existing ${scenario} scenario through the application and production renderer.`,
      scenario,
      options: {},
      viewport,
    })),
    { id: 'ui-resized-gameplay', purpose: 'Gameplay at the existing resized viewport.', scenario: 'coop', options: {}, viewport: { width: 1280, height: 720 } },
    ...MAPS.map((map, room) => ({
      id: `campaign-${map.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-start`,
      purpose: `${map.name}: real co-op room initialization, zero simulation ticks, original spawns and intact terrain.`,
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
  ];
}

function escape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

test('captures the local catalogue without approving visual baselines', async ({ context, browser }, testInfo) => {
  test.setTimeout(180_000);
  const catalogue = scenes();
  expect(new Set(catalogue.map((scene) => scene.id)).size).toBe(catalogue.length);
  const source = await provenance();
  const stage = testInfo.outputPath('catalogue');
  await mkdir(stage, { recursive: true });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
  });

  const records: Array<{
    readonly scene: Scene;
    readonly state: unknown;
    readonly images: readonly { readonly file: string; readonly sha256: string }[];
  }> = [];

  for (const scene of catalogue) {
    const captures: Array<Record<string, Buffer>> = [];
    const states: unknown[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(message.text());
        }
      });
      await page.setViewportSize(scene.viewport);
      await page.goto('/');
      await page.waitForFunction(() => window.__TOYBOX_TEST__ !== undefined);
      await page.mouse.move(0, 0);
      await page.evaluate(async (entry) => {
        const bridge = window.__TOYBOX_TEST__;
        if (bridge === undefined) {
          throw new Error('Test bridge missing');
        }
        if (entry.fixture === undefined) {
          bridge.loadScenario(entry.scenario, entry.options);
        } else {
          bridge.loadVisualScene(entry.fixture);
        }
        await document.fonts.ready;
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        bridge.render();
      }, scene);
      const state = await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot());
      expect(state).toBeDefined();
      if (scene.scenario === 'room') {
        expect(state?.ticks).toBe(0);
        expect(state?.shells).toHaveLength(0);
        expect(state?.effects).toHaveLength(0);
        expect(state?.corks.every((cell) => cell.hitsRemaining === 3 && !cell.destroyed)).toBe(true);
      }
      states.push(state);
      const canvas = page.locator('#game');
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      if (box === null) {
        throw new Error(`Canvas bounds missing: ${scene.id}`);
      }
      const settings = { animations: 'disabled', caret: 'hide' } as const;
      const images: Record<string, Buffer> = {
        full: await page.screenshot(settings),
        arena: await page.screenshot({ ...settings, clip: box }),
      };
      if (scene.fixture !== undefined) {
        images.detail = await page.screenshot({
          ...settings,
          clip: {
            x: box.x + (160 / CONFIG.width) * box.width,
            y: box.y + (120 / CONFIG.height) * box.height,
            width: (560 / CONFIG.width) * box.width,
            height: (300 / CONFIG.height) * box.height,
          },
        });
      }
      expect(await page.evaluate(() => window.__TOYBOX_TEST__?.snapshot())).toEqual(state);
      expect(errors, scene.id).toEqual([]);
      captures.push(images);
      await page.close();
    }
    expect(states[1], `${scene.id}: repeated fixture state`).toEqual(states[0]);
    const first = captures[0];
    const second = captures[1];
    if (first === undefined || second === undefined) {
      throw new Error('Repeated capture missing');
    }
    const images: Array<{ readonly file: string; readonly sha256: string }> = [];
    for (const [kind, bytes] of Object.entries(first)) {
      expect(hash(second[kind] ?? new Uint8Array()), `${scene.id}/${kind}: capture repeatability`).toBe(hash(bytes));
      const file = `${scene.id}.${kind}.png`;
      await writeFile(join(stage, file), bytes);
      images.push({ file, sha256: hash(bytes) });
    }
    records.push({ scene, state: states[0], images });
  }

  expect(await provenance(), 'Source changed during capture; do not publish mixed revisions').toEqual(source);
  const manifest = {
    schema: 1,
    role: 'revision-render-catalogue-not-approved-baselines',
    source,
    environment: {
      os: platform(), osRelease: release(), architecture: arch(), node: process.version,
      playwright: execFileSync(process.execPath, ['node_modules/@playwright/test/cli.js', '--version'], { encoding: 'utf8' }).trim(),
      browser: browser.version(), deviceScaleFactor: 1, colorScheme: 'light',
      reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC',
      headless: testInfo.project.use.headless !== false,
    },
    repeats: 2,
    scenes: records,
  };
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Toybox Tanks visual catalogue</title><style>body{font:16px system-ui;margin:2rem;background:#f3ebdc;color:#242424}section{margin:3rem 0}img{display:block;max-width:100%;height:auto;margin:1rem 0;border:1px solid #777}code{overflow-wrap:anywhere}</style><h1>Revision render catalogue</h1><p>Not approved automated-test baselines. Compare stable PNG paths with Git image tools.</p><p>Source: <code>${escape(source.revision)}</code>; ${source.sourceStatus === '' ? 'source clean' : 'source dirty (see manifest)'}. Two independent page loads matched for every capture.</p>${records.map((record) => `<section id="${escape(record.scene.id)}"><h2>${escape(record.scene.id)}</h2><p>${escape(record.scene.purpose)}</p>${record.images.map((image) => `<h3>${escape(image.file)}</h3><img loading="lazy" src="${escape(image.file)}" alt="${escape(image.file)}"><p>SHA-256: <code>${image.sha256}</code></p>`).join('')}</section>`).join('')}</html>\n`;
  await writeFile(join(stage, 'index.html'), html);
  await writeFile(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await mkdir(output, { recursive: true });
  const expected = new Set(records.flatMap((record) => record.images.map((image) => image.file)));
  const stale = (await readdir(output)).filter((file) => file.endsWith('.png') && !expected.has(file));
  expect(stale, 'Scene removal/rename needs explicit review; remove stale catalogue PNGs deliberately').toEqual([]);
  // Publish only after every scene is stable. A failed publication has no manifest.
  await rm(join(output, 'manifest.json'), { force: true });
  for (const file of [...expected, 'index.html', 'manifest.json']) {
    await copyFile(join(stage, file), join(output, file));
  }
});
