import type { World } from '../sim/types';
import { REVIEW_BRIEF, REVIEW_PROMPTS, REVIEW_SCOPES } from './review-context';
import { findSource, getSourceFiles } from './source-index';

export interface ReviewPanel {
  recordFrame(timestamp: number, world: World, simulationSteps: number): void;
}

interface ReviewPanelOptions {
  readonly canvas: HTMLCanvasElement;
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
</div>
<h3>Runtime diagnostics</h3>
<pre class="diagnostics" id="review-diagnostics">Waiting for frames…</pre>
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

  const open = new URLSearchParams(window.location.search).has('review');
  panel.classList.toggle('open', open);
  toggle.addEventListener('click', () => panel.classList.toggle('open'));
  panel.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.reviewAction;
    if (action === 'close') panel.classList.remove('open');
    if (action === 'copy-brief') void copyText(REVIEW_BRIEF);
    if (action === 'copy-source') {
      const source = findSource(sourceSelect?.value ?? '');
      if (source !== undefined) void copyText(source.content);
    }
    if (action === 'copy-markdown') void copyText(buildMarkdownReport());
    if (action === 'copy-json') void copyText(buildJsonReport());
  });

  let previousTimestamp: number | null = null;
  let smoothedFps = 0;
  let worstFrameMs = 0;
  let lastFrameMs = 0;
  let lastSteps = 0;
  let lastWorld: World | undefined;

  const readField = (id: string): string =>
    panel.querySelector<HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? '';

  function buildMarkdownReport(): string {
    const scope = readField('review-scope');
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
        sourceSnapshot: true,
      },
      null,
      2,
    );
  }

  function describeRuntime(): string {
    const world = lastWorld;
    const rect = options.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    return [
      `FPS: ${smoothedFps.toFixed(1)}`,
      `Last frame: ${lastFrameMs.toFixed(1)} ms`,
      `Worst recent frame: ${worstFrameMs.toFixed(1)} ms`,
      `Simulation steps: ${String(lastSteps)}`,
      `Canvas: ${Math.round(rect.width)} x ${Math.round(rect.height)} CSS px`,
      `DPR: ${dpr.toFixed(2)}`,
      world === undefined
        ? 'World: unavailable'
        : `World: room ${String(world.room + 1)}, state ${world.state}, shells ${String(world.shells.length)}, enemies ${String(world.enemies.length)}`,
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

  return {
    recordFrame(timestamp, world, simulationSteps) {
      lastWorld = world;
      lastSteps = simulationSteps;
      const seconds = timestamp / 1000;
      if (previousTimestamp !== null) {
        const frameMs = Math.max(0, (seconds - previousTimestamp) * 1000);
        lastFrameMs = frameMs;
        worstFrameMs = Math.max(worstFrameMs * 0.98, frameMs);
        const fps = frameMs > 0 ? 1000 / frameMs : 0;
        smoothedFps = smoothedFps === 0 ? fps : smoothedFps * 0.9 + fps * 0.1;
      }
      previousTimestamp = seconds;
      if (diagnostics !== null) diagnostics.textContent = describeRuntime();
    },
  };
}
