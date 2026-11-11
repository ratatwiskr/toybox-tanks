import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync, cpSync, existsSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const developmentBaseline = 'docs/visual-catalogue/current';
export const developmentStaging = 'test-results/visual-baseline-staging';
const previousBaseline = 'test-results/visual-baseline-previous';
const reportDirectory = 'playwright-report/visual-review';
const lockFile = 'test-results/visual-workflow.lock';
const cli = 'node_modules/@playwright/test/cli.js';
const owned = /^[a-z0-9-]+\.(full|arena|detail)(\.attempt-[12])?\.png$/;

function isOwned(name: string): boolean {
  return owned.test(name) || ['index.html', 'manifest.json', 'index.html.tmp', 'manifest.json.tmp'].includes(name);
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid development catalogue metadata');
  }
  return value;
}

function hash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function prepareStaging(directory = developmentStaging): void {
  mkdirSync(directory, { recursive: true });
  if (lstatSync(directory).isSymbolicLink()) throw new Error('Refusing symlinked staging directory');
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !isOwned(entry.name)) {
      throw new Error(`Unexpected staging entry: ${entry.name}; preserve/inspect it before retrying`);
    }
    unlinkSync(join(directory, entry.name));
  }
}

export function validateDevelopmentBaseline(directory = developmentBaseline): {
  images: Map<string, string>;
  environment: Record<string, unknown>;
} {
  if (!existsSync(directory)) throw new Error('No development baseline. Run npm run capture:visual:baseline');
  if (lstatSync(directory).isSymbolicLink()) throw new Error('Refusing symlinked baseline directory');
  for (const file of ['manifest.json', 'index.html']) {
    const info = lstatSync(join(directory, file));
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Invalid catalogue file: ${file}`);
  }
  const manifest = object(JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')));
  if (manifest.schema !== 2 || manifest.role !== 'revision-render-catalogue-not-approved-baselines' || manifest.finished !== true || manifest.complete !== true || manifest.runError !== null || !Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    throw new Error('Development catalogue is incomplete or incompatible; recapture it');
  }
  const records: unknown[] = manifest.scenes;
  const images = new Map<string, string>();
  const scenes = new Set<string>();
  for (const value of records) {
    const record = object(value);
    const id = object(record.scene).id;
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id) || scenes.has(id) || record.status !== 'captured' || !Array.isArray(record.images) || !Array.isArray(record.expectedFiles)) {
      throw new Error('Invalid or incomplete catalogue scene');
    }
    scenes.add(id);
    const entries: unknown[] = record.images;
    const actualFiles: string[] = [];
    for (const entry of entries) {
      const image = object(entry);
      const file = image.file;
      const sha256 = image.sha256;
      if (typeof file !== 'string' || !/^[a-z0-9-]+\.(full|arena|detail)\.png$/.test(file) || !file.startsWith(`${id}.`) || images.has(file) || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) {
        throw new Error('Invalid or duplicate catalogue image');
      }
      const info = lstatSync(join(directory, file));
      if (!info.isFile() || info.isSymbolicLink() || hash(readFileSync(join(directory, file))) !== sha256) {
        throw new Error(`Missing or changed catalogue bytes: ${file}`);
      }
      images.set(file, sha256);
      actualFiles.push(file);
    }
    const expected: unknown[] = record.expectedFiles;
    if (expected.length === 0 || expected.some((file) => typeof file !== 'string') || JSON.stringify([...expected].sort()) !== JSON.stringify(actualFiles.sort())) {
      throw new Error(`Incomplete image set: ${id}`);
    }
  }
  return { images, environment: object(manifest.environment) };
}

export function replaceDevelopmentBaseline(
  staging = developmentStaging,
  baseline = developmentBaseline,
  previous = previousBaseline,
  move: (from: string, to: string) => void = renameSync,
): void {
  validateDevelopmentBaseline(staging);
  if (existsSync(previous)) throw new Error(`Recovery copy exists: ${previous}; inspect it before retrying`);
  mkdirSync(dirname(baseline), { recursive: true });
  mkdirSync(dirname(previous), { recursive: true });
  const hadBaseline = existsSync(baseline);
  if (hadBaseline) {
    if (lstatSync(baseline).isSymbolicLink()) throw new Error('Refusing symlinked baseline');
    for (const entry of readdirSync(baseline, { withFileTypes: true })) {
      if (isOwned(entry.name)) {
        if (!entry.isFile()) throw new Error(`Owned baseline entry is not a file: ${entry.name}`);
      } else {
        cpSync(join(baseline, entry.name), join(staging, entry.name), {
          recursive: true, dereference: false, force: false, errorOnExist: true,
        });
      }
    }
    move(baseline, previous);
  }
  try {
    move(staging, baseline);
  } catch (error) {
    if (hadBaseline) move(previous, baseline);
    throw error;
  }
  if (hadBaseline) rmSync(previous, { recursive: true });
}

function freePort(): Promise<number> {
  return new Promise((done, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate loopback port')));
        return;
      }
      server.close((error) => error ? reject(error) : done(address.port));
    });
  });
}

function playwright(args: readonly string[], port?: number): Promise<number> {
  if (!existsSync(cli)) throw new Error('Installed Playwright missing; no installation was attempted');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.TOYBOX_BROWSER_CACHE ?? join(homedir(), '.cache/ms-playwright'),
    PLAYWRIGHT_HTML_OPEN: 'never',
  };
  delete env.TOYBOX_REVIEW_SCENES;
  if (port !== undefined) {
    env.TOYBOX_CAPTURE_PORT = String(port);
    env.TOYBOX_REVIEW_PORT = String(port);
  }
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env, stdio: 'inherit' });
    const interrupt = (): void => { child.kill('SIGINT'); };
    process.on('SIGINT', interrupt);
    child.once('error', (error) => { process.off('SIGINT', interrupt); reject(error); });
    child.once('close', (code, signal) => {
      process.off('SIGINT', interrupt);
      done(code ?? (signal === 'SIGINT' ? 130 : 1));
    });
  });
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2);
  if (args.length !== 0 || !['capture', 'compare', 'report'].includes(command ?? '')) {
    throw new Error('Use capture:visual:baseline, test:visual:compare or test:visual:report without extra flags');
  }
  if (command === 'report') {
    if (!existsSync(join(reportDirectory, 'index.html'))) throw new Error('No comparison report. Run npm run test:visual:compare first');
    return playwright(['show-report', reportDirectory, '--host', '127.0.0.1', '--port', '0']);
  }
  mkdirSync('test-results', { recursive: true });
  let lock: number;
  try { lock = openSync(lockFile, 'wx'); } catch {
    throw new Error(`Visual operation active or interrupted. Inspect running processes and ${lockFile} before retrying; do not remove an active lock`);
  }
  try {
    writeFileSync(lock, JSON.stringify({ pid: process.pid, command }));
    if (existsSync(previousBaseline)) throw new Error(`Interrupted replacement: inspect ${previousBaseline}; restore it if current is missing before retrying`);
    const port = await freePort();
    const config = command === 'capture' ? 'playwright.catalogue.config.ts' : 'playwright.review.config.ts';
    const code = await playwright(['test', `--config=${config}`], port);
    if (command === 'capture') {
      if (code === 0) {
        replaceDevelopmentBaseline();
        process.stdout.write(`Development checkpoint replaced. Gallery: ${pathToFileURL(resolve(developmentBaseline, 'index.html')).href}\nThis records development state; it does not approve aesthetics or update formal regression references.\n`);
      } else {
        process.stderr.write(`Capture failed (${String(code)}); saved baseline unchanged. Diagnostics: ${developmentStaging}\n`);
      }
    } else {
      process.stdout.write(`Comparison exit: ${String(code)}. Inspect differences/errors with npm run test:visual:report. Baseline was not updated.\n`);
    }
    return code;
  } finally {
    closeSync(lock);
    unlinkSync(lockFile);
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  void main().then((code) => { process.exitCode = code; }).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
