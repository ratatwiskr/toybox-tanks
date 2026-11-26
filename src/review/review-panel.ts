import type { World } from '../sim/types';
import { buildReviewBundleJson, buildReviewBundleMarkdown } from './review-bundle';
import { createReviewEventLog } from './review-events';
import { createFrameSampler, type FrameSamplerSummary } from './frame-sampler';
import { REVIEW_BRIEF, REVIEW_PROMPTS, REVIEW_SCOPES } from './review-context';
import { findSource, getSourceFiles } from './source-index';

interface ReviewBuildInfo {
  readonly commit: string;
  readonly builtAt: string;
  readonly mode: string;
}

export interface ReviewFrame {
  readonly timestamp: number;
  readonly world: World;
  readonly simulationSteps: number;
  readonly simMs: number;
  readonly renderMs: number;
  readonly hudMs: number;
  readonly clamped: boolean;
}

export interface ReviewPanel {
  recordFrame(frame: ReviewFrame): void;
  refreshLayout(): void;
  recordEvent(kind: string, detail: string): void;
  setPauseReason(reason: string): void;
}

interface ReviewPanelOptions {
  readonly canvas: HTMLCanvasElement;
  readonly buildInfo: ReviewBuildInfo;
  readonly getGamepads?: () => (Gamepad | null)[];
}

const PANEL_ID = 'agent-review-panel';
const TOGGLE_ID = 'agent-review-toggle';

export function installReviewPanel(options: ReviewPanelOptions): ReviewPanel {
  const style = document.createElement('style');
  style.textContent = `
#${TOGGLE_ID} {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 1000;
  font: 12px/1.4 system-ui, sans-serif;
  padding: 8px 10px;
  border: 1px solid #7a5a34;
  border-radius: 6px;
  background: #fff6e0;
  color: #3c2a12;
  cursor: pointer;
}
#${PANEL_ID} {
  position: fixed;
  inset: 24px;
  z-index: 1001;
  display: none;
  overflow: auto;
  padding: 16px;
  border: 2px solid #7a5a34;
  border-radius: 8px;
  background: #fffaf0;
  color: #241a0d;
  font: 13px/1.45 system-ui, sans-serif;
}
#${PANEL_ID}.open { display: block; }
#${PANEL_ID} h2 { margin: 12px 0 6px; font-size: 16px; }
#${PANEL_ID} h3 { margin: 10px 0 4px; font-size: 14px; }
#${PANEL_ID} label { display: block; margin: 8px 0 3px; font-weight: 600; }
#${PANEL_ID} textarea,
#${PANEL_ID} select,
#${PANEL_ID} input {
  width: 100%;
  box-sizing: border-box;
  font: 12px/1.4 ui-monospace, monospace;
  padding: 6px;
  border: 1px solid #a58457;
  border-radius: 4px;
  background: #fff;
}
#${PANEL_ID} textarea { min-height: 70px; resize: vertical; }
#${PANEL_ID} pre {
  max-height: 300px;
  overflow: auto;
  padding: 8px;
  border: 1px solid #a58457;
  border-radius: 4px;
  background: #fff;
  white-space: pre-wrap;
}
#${PANEL_ID} .row { display: flex; gap: 8px; flex-wrap: wrap; }
#${PANEL_ID} button {
  font: 12px/1.4 system-ui, sans-serif;
  padding: 6px 10px;
  border: 1px solid #7a5a34;
  border-radius: 4px;
  background: #f3d9a4;
  color: #241a0d;
  cursor: pointer;
}
#${PANEL_ID} .diagnostics { font: 12px/1.4 ui-monospace, monospace; }
`;
  document.head.append(style);

  const toggle = document.createElement('button');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  toggle.textContent = 'Agent review';
  document.body.append(toggle);

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
<h2>Agent review workspace</h2>
<p>This panel is available only in the context build. Embedded sources are a
build-time snapshot, not live repository state.</p>
<div class="row">
  <button type="button" data-review-action="close">Close</button>
  <button type="button" data-review-action="copy-brief">Copy brief</button>
  <button type="button" data-review-action="copy-bundle-md">Copy agent bundle</button>
  <button type="button" data-review-action="copy-bundle-json">Copy bundle JSON</button>
</div>
<h3>Runtime diagnostics</h3>
<div class="row">
  <button type="button" data-review-action="reset-stats">Reset stats</button>
  <button type="button" data-review-action="record-10s">Record 10 s</button>
</div>
<pre class="diagnostics" id="review-diagnostics">Waiting for frames…</pre>
<pre class="diagnostics" id="review-capture">No 10 s capture recorded.</pre>
<h3>Review focus</h3>
<select id="review-prompt"></select>
<pre id="review-prompt-text"></pre>
<h3>Embedded source</h3>
<select id="review-source"></select>
<div class="row">
  <button type="button" data-review-action="copy-source">Copy selected source</button>
</div>
<pre id="review-source-view"></pre>
<h3>Observation</h3>
<label for="review-scope">Scope</label>
<select id="review-scope"></select>
<label for="review-observation">Observation</label>
<textarea id="review-observation"></textarea>
<label for="review-evidence">Evidence / reproduction</label>
<textarea id="review-evidence"></textarea>
<label for="review-proposal">Proposed minimal change</label>
<textarea id="review-proposal"></textarea>
<label for="review-risks">Risks to existing behavior</label>
<textarea id="review-risks"></textarea>
<label for="review-validation">Validation plan</label>
<textarea id="review-validation"></textarea>
<label for="review-confidence">Confidence</label>
<select id="review-confidence">
  <option>high</option>
  <option selected>medium</option>
  <option>low</option>
</select>
<div class="row">
  <button type="button" data-review-action="copy-markdown">Copy Markdown report</button>
  <button type="button" data-review-action="copy-json">Copy JSON report</button>
</div>
`;
  document.body.append(panel);

  const diagnostics = panel.querySelector<HTMLPreElement>('#review-diagnostics');
  const captureView = panel.querySelector<HTMLPreElement>('#review-capture');
  const promptSelect = panel.querySelector<HTMLSelectElement>('#review-prompt');
  const promptText = panel.querySelector<HTMLPreElement>('#review-prompt-text');
  const sourceSelect = panel.querySelector<HTMLSelectElement>('#review-source');
  const sourceView = panel.querySelector<HTMLPreElement>('#review-source-view');
  const scopeSelect = panel.querySelector<HTMLSelectElement>('#review-scope');

  for (const key of Object.keys(REVIEW_PROMPTS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    promptSelect?.append(option);
  }
  for (const scope of REVIEW_SCOPES) {
    const option = document.createElement('option');
    option.value = scope;
    option.textContent = scope;
    scopeSelect?.append(option);
  }
  for (const source of getSourceFiles()) {
    const option = document.createElement('option');
    option.value = source.path;
    option.textContent = `${source.path} (${String(source.lines)} lines)`;
    sourceSelect?.append(option);
  }

  const syncPrompt = (): void => {
    const key = promptSelect?.value ?? 'menu';
    if (promptText !== null) promptText.textContent = REVIEW_PROMPTS[key] ?? '';
  };
  const syncSource = (): void => {
    const source = findSource(sourceSelect?.value ?? '');
    if (sourceView !== null) sourceView.textContent = source?.content ?? '';
  };
  promptSelect?.addEventListener('change', syncPrompt);
  sourceSelect?.addEventListener('change', syncSource);
  syncPrompt();
  syncSource();

  const sampler = createFrameSampler();
  const events = createReviewEventLog();
  let previousTimestamp: number | null = null;
  let lastFrameMs = 0;
  let lastSteps = 0;
  let lastSimMs = 0;
  let lastRenderMs = 0;
  let lastHudMs = 0;
  let lastClamped = false;
  let lastWorld: World | undefined;
  let lastDiagnosticsUpdateMs = -Infinity;
  let captureStatus = 'No 10 s capture recorded.';
  let capturedSummary: FrameSamplerSummary | null = null;
  let captureEndsAtMs = 0;
  let cachedCssWidth = 0;
  let cachedCssHeight = 0;
  let cachedDpr = 1;
  let cachedEffectiveDpr = 1;
  let pauseReason = '';
  const getGamepads =
    options.getGamepads ??
    (() => (typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []));

  const isOpen = (): boolean => panel.classList.contains('open');

  const refreshLayout = (): void => {
    const rect = options.canvas.getBoundingClientRect();
    cachedCssWidth = Math.round(rect.width);
    cachedCssHeight = Math.round(rect.height);
    cachedDpr = window.devicePixelRatio || 1;
    cachedEffectiveDpr = rect.width > 0 ? options.canvas.width / rect.width : cachedDpr;
  };

  const renderCapture = (): void => {
    if (captureView === null) return;
    if (capturedSummary === null) {
      captureView.textContent = captureStatus;
      return;
    }
    captureView.textContent = [
      captureStatus,
      `samples ${String(capturedSummary.samples)}`,
      `p50 ${capturedSummary.p50.toFixed(1)} ms`,
      `p95 ${capturedSummary.p95.toFixed(1)} ms`,
      `p99 ${capturedSummary.p99.toFixed(1)} ms`,
      `max ${capturedSummary.max.toFixed(1)} ms`,
      `>20ms ${String(capturedSummary.over20ms)}`,
      `>33ms ${String(capturedSummary.over33ms)}`,
      `clamps ${String(capturedSummary.clampHits)}`,
    ].join('\n');
  };

  const renderDiagnostics = (nowMs: number): void => {
    if (diagnostics !== null) diagnostics.textContent = describeRuntime();
    renderCapture();
    lastDiagnosticsUpdateMs = nowMs;
  };

  const open = new URLSearchParams(window.location.search).has('review');
  panel.classList.toggle('open', open);
  refreshLayout();
  if (open) renderDiagnostics(performance.now());
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (isOpen()) renderDiagnostics(performance.now());
  });
  panel.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.reviewAction;
    if (action === 'close') panel.classList.remove('open');
    if (action === 'reset-stats') {
      sampler.reset();
      previousTimestamp = null;
      lastFrameMs = 0;
      lastSteps = 0;
      lastSimMs = 0;
      lastRenderMs = 0;
      lastHudMs = 0;
      lastClamped = false;
      captureStatus = 'No 10 s capture recorded.';
      capturedSummary = null;
      captureEndsAtMs = 0;
      renderDiagnostics(performance.now());
    }
    if (action === 'record-10s') {
      const nowMs = performance.now();
      sampler.startCapture(nowMs);
      captureEndsAtMs = nowMs + 10_000;
      capturedSummary = null;
      captureStatus = 'Recording 10 s capture…';
      renderDiagnostics(nowMs);
    }
    if (action === 'copy-brief') void copyText(REVIEW_BRIEF);
    if (action === 'copy-source') {
      const source = findSource(sourceSelect?.value ?? '');
      if (source !== undefined) void copyText(source.content);
    }
    if (action === 'copy-markdown') void copyText(buildMarkdownReport());
    if (action === 'copy-json') void copyText(buildJsonReport());
    if (action === 'copy-bundle-md') void copyText(buildReviewBundleMarkdown(buildBundleInput()));
    if (action === 'copy-bundle-json')
      void copyText(JSON.stringify(buildReviewBundleJson(buildBundleInput()), null, 2));
  });

  const readField = (id: string): string =>
    panel.querySelector<HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? '';

  function buildMarkdownReport(): string {
    const scope = readField('review-scope');
    const capture = capturedSummary;
    return [
      '# Toybox Tanks review',
      '',
      '## Scope',
      scope,
      '',
      '## Observation',
      readField('review-observation') || '_Not recorded._',
      '',
      '## Evidence',
      readField('review-evidence') || '_Not recorded._',
      '',
      '## Proposed minimal change',
      readField('review-proposal') || '_Not recorded._',
      '',
      '## Risks',
      readField('review-risks') || '_Not recorded._',
      '',
      '## Validation plan',
      readField('review-validation') || '_Not recorded._',
      '',
      '## Confidence',
      readField('review-confidence'),
      '',
      '## Runtime snapshot',
      describeRuntime(),
      '',
      '## 10s capture',
      capture === null
        ? '_Not recorded._'
        : [
            `samples ${String(capture.samples)}`,
            `p50 ${capture.p50.toFixed(1)} ms`,
            `p95 ${capture.p95.toFixed(1)} ms`,
            `p99 ${capture.p99.toFixed(1)} ms`,
            `max ${capture.max.toFixed(1)} ms`,
            `>20ms ${String(capture.over20ms)}`,
            `>33ms ${String(capture.over33ms)}`,
            `clamps ${String(capture.clampHits)}`,
          ].join('\n'),
    ].join('\n');
  }

  function buildJsonReport(): string {
    return JSON.stringify(
      {
        scope: readField('review-scope'),
        observation: readField('review-observation'),
        evidence: readField('review-evidence'),
        proposal: readField('review-proposal'),
        risks: readField('review-risks'),
        validation: readField('review-validation'),
        confidence: readField('review-confidence'),
        runtime: describeRuntime(),
        capture: capturedSummary,
        eventLog: events.entries(),
        sourceSnapshot: true,
      },
      null,
      2,
    );
  }

  function buildBundleInput() {
    const promptKey = promptSelect?.value ?? 'menu';
    const source = findSource(sourceSelect?.value ?? '');
    return {
      brief: REVIEW_BRIEF,
      promptKey,
      prompt: REVIEW_PROMPTS[promptKey] ?? '',
      diagnostics: describeRuntime(),
      capture: capturedSummary,
      eventLog: events.entries(),
      fields: {
        scope: readField('review-scope'),
        observation: readField('review-observation'),
        evidence: readField('review-evidence'),
        proposal: readField('review-proposal'),
        risks: readField('review-risks'),
        validation: readField('review-validation'),
        confidence: readField('review-confidence'),
      },
      selectedSourcePath: source?.path ?? '',
      selectedSource: source?.content ?? '',
    };
  }

  function describeEnvironment(): string {
    const dpr = window.devicePixelRatio || 1;
    const backingW = options.canvas.width;
    const backingH = options.canvas.height;
    const megapixels = (backingW * backingH) / 1_000_000;
    const orientation =
      typeof screen !== 'undefined' && typeof screen.orientation.type === 'string'
        ? screen.orientation.type
        : 'unknown';
    const coarse =
      typeof window.matchMedia === 'function'
        ? String(window.matchMedia('(pointer: coarse)').matches)
        : 'unknown';
    const concurrency = navigator.hardwareConcurrency;
    return [
      `Viewport: ${String(window.innerWidth)} x ${String(window.innerHeight)} CSS px`,
      `Canvas: ${String(cachedCssWidth)} x ${String(cachedCssHeight)} CSS px`,
      `DPR raw/effective: ${dpr.toFixed(2)} / ${cachedEffectiveDpr.toFixed(2)}`,
      `Backing store: ${String(backingW)} x ${String(backingH)} (${megapixels.toFixed(2)} MP)`,
      `Orientation: ${orientation}`,
      `Pointer coarse: ${coarse}`,
      `Hardware concurrency: ${typeof concurrency === 'number' ? String(concurrency) : 'unknown'}`,
      `User agent: ${navigator.userAgent}`,
      `Build: ${options.buildInfo.commit} @ ${options.buildInfo.builtAt} (${options.buildInfo.mode}) [snapshot, not live repo state]`,
    ].join('\n');
  }

  function describeGame(world: World | undefined): string {
    if (world === undefined) return 'World: unavailable';
    const pads = getGamepads()
      .filter((pad): pad is Gamepad => pad !== null)
      .map((pad) => `${String(pad.index)}:${pad.id}`);
    const players = world.players
      .map(
        (p, i) =>
          `P${String(i + 1)} hp=${String(p.hp)} alive=${String(p.alive)} shells=${String(world.shells.filter((s) => s.owner === p.id && !s.dead).length)}`,
      )
      .join('; ');
    const aliveEnemies = world.enemies.filter((e) => e.alive).length;
    const aliveMines = world.mines.filter((m) => !m.dead).length;
    const alivePoms = world.poms.filter((p) => !p.dead).length;
    return [
      `Room: ${String(world.room + 1)}`,
      `Mode: ${world.mode}`,
      `State: ${world.state}`,
      `Pause reason: ${pauseReason || 'none'}`,
      `Players: ${players || 'none'}`,
      `Shells: ${String(world.shells.filter((s) => !s.dead).length)} (total ${String(world.shells.length)})`,
      `Enemies alive: ${String(aliveEnemies)} / ${String(world.enemies.length)}`,
      `Mines: ${String(aliveMines)}`,
      `Poms: ${String(alivePoms)}`,
      `Effects: ${String(world.effects.length)}`,
      `Assigned gamepads: ${pads.length > 0 ? pads.join(', ') : 'none'}`,
    ].join('\n');
  }

  function describeRuntime(): string {
    const summary = sampler.summary();
    const captureLine =
      captureEndsAtMs > 0 && capturedSummary === null
        ? `Capture: recording ${Math.max(0, (captureEndsAtMs - performance.now()) / 1000).toFixed(1)} s left`
        : capturedSummary !== null
          ? `Capture: ${captureStatus}`
          : `Capture: ${captureStatus}`;
    return [
      `FPS: ${(lastFrameMs > 0 ? 1000 / lastFrameMs : 0).toFixed(1)}`,
      `Last frame: ${lastFrameMs.toFixed(1)} ms`,
      `Frame p50/p95/p99/max: ${summary.p50.toFixed(1)} / ${summary.p95.toFixed(1)} / ${summary.p99.toFixed(1)} / ${summary.max.toFixed(1)} ms`,
      `Frames >20ms/>33ms: ${String(summary.over20ms)} / ${String(summary.over33ms)}`,
      `Sim/render/HUD: ${lastSimMs.toFixed(2)} / ${lastRenderMs.toFixed(2)} / ${lastHudMs.toFixed(2)} ms`,
      `Simulation steps: ${String(lastSteps)}${lastClamped ? ' (clamped)' : ''}`,
      `Clamp hits: ${String(summary.clampHits)}`,
      captureLine,
      '',
      '== Environment ==',
      describeEnvironment(),
      '',
      '== Game ==',
      describeGame(lastWorld),
      '',
      '== Event log ==',
      events
        .entries()
        .slice(-30)
        .map((e) => `${e.at} [${e.kind}] ${e.detail}`)
        .join('\n') || 'No events.',
    ].join('\n');
  }

  async function copyText(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      if (sourceView !== null) {
        sourceView.textContent = 'Copy failed — select and copy manually.';
      }
    }
  }

  interface ListenerTarget {
    addEventListener(type: string, listener: (event: unknown) => void): void;
  }
  const addListener = (target: unknown, type: string, listener: (event: unknown) => void): void => {
    if (
      typeof target === 'object' &&
      target !== null &&
      'addEventListener' in target &&
      typeof (target as { addEventListener?: unknown }).addEventListener === 'function'
    ) {
      (target as ListenerTarget).addEventListener(type, listener);
    }
  };

  addListener(globalThis.window, 'error', (event) => {
    const message =
      typeof event === 'object' && event !== null && 'message' in event
        ? (event as { message?: unknown }).message
        : undefined;
    events.record('error', typeof message === 'string' ? message : 'error');
  });
  addListener(globalThis.document, 'visibilitychange', () => {
    events.record(
      'visibility',
      typeof document !== 'undefined' && document.hidden ? 'hidden' : 'visible',
    );
  });
  addListener(globalThis.window, 'blur', () => {
    events.record('focus', 'blur');
  });

  return {
    refreshLayout,
    recordEvent(kind: string, detail: string) {
      events.record(kind, detail);
    },
    setPauseReason(reason: string) {
      pauseReason = reason;
    },
    recordFrame(frame) {
      lastWorld = frame.world;
      lastSteps = frame.simulationSteps;
      lastSimMs = frame.simMs;
      lastRenderMs = frame.renderMs;
      lastHudMs = frame.hudMs;
      lastClamped = frame.clamped;
      const seconds = frame.timestamp / 1000;
      if (previousTimestamp !== null) {
        const frameMs = Math.max(0, (seconds - previousTimestamp) * 1000);
        lastFrameMs = frameMs;
        sampler.record({
          dt: frameMs,
          simMs: frame.simMs,
          renderMs: frame.renderMs,
          hudMs: frame.hudMs,
          steps: frame.simulationSteps,
          clamped: frame.clamped,
        });
        const capture = sampler.captureSummary(frame.timestamp);
        if (capture !== null) {
          capturedSummary = capture;
          captureStatus = 'Recorded 10 s capture.';
          captureEndsAtMs = 0;
        }
      }
      previousTimestamp = seconds;
      if (isOpen() && frame.timestamp - lastDiagnosticsUpdateMs >= 250) {
        renderDiagnostics(frame.timestamp);
      }
    },
  };
}
