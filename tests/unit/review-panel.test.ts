import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/review/review-context', () => ({
  REVIEW_BRIEF: 'brief',
  REVIEW_PROMPTS: { menu: 'menu prompt' },
  REVIEW_SCOPES: ['Menu and onboarding', 'Other'],
}));

vi.mock('../../src/review/source-index', () => ({
  getSourceFiles: () => [{ path: '/src/main.ts', content: 'src', lines: 1 }],
  findSource: () => ({ path: '/src/main.ts', content: 'src', lines: 1 }),
}));

vi.mock('../../src/review/frame-sampler', () => {
  return {
    createFrameSampler: () => ({
      record: () => undefined,
      summary: () => ({
        samples: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0,
        over20ms: 0,
        over33ms: 0,
        clampHits: 0,
      }),
      reset: () => undefined,
      startCapture: () => undefined,
      captureSummary: () => null,
    }),
  };
});

import { installReviewPanel } from '../../src/review/review-panel';
import type { World } from '../../src/sim/types';

class FakeClassList {
  private readonly values = new Set<string>();
  add(...tokens: string[]): void {
    for (const token of tokens) this.values.add(token);
  }
  remove(...tokens: string[]): void {
    for (const token of tokens) this.values.delete(token);
  }
  contains(token: string): boolean {
    return this.values.has(token);
  }
  toggle(token: string, force?: boolean): boolean {
    const next = force ?? !this.values.has(token);
    if (next) this.values.add(token);
    else this.values.delete(token);
    return next;
  }
}

class FakeElement {
  readonly classList = new FakeClassList();
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  id = '';
  type = '';
  value = '';
  private _innerHTML = '';
  private _textContent = '';
  textContentWrites = 0;
  private readonly listeners = new Map<string, Array<(event: unknown) => void>>();

  get textContent(): string {
    return this._textContent;
  }
  set textContent(value: string) {
    this._textContent = value;
    this.textContentWrites += 1;
  }

  get innerHTML(): string {
    return this._innerHTML;
  }
  set innerHTML(value: string) {
    this._innerHTML = value;
    // Minimal stub: create elements for ids referenced by review panel.
    for (const match of value.matchAll(/id="([^"]+)"/g)) {
      const id = match[1];
      if (id === undefined) continue;
      if (this.querySelector(`#${id}`) !== null) continue;
      const child = new FakeElement();
      child.id = id;
      this.children.push(child);
    }
  }
  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }
  addEventListener(type: string, listener: (event: unknown) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }
  dispatch(type: string, target: unknown = this): void {
    for (const listener of this.listeners.get(type) ?? []) listener({ target });
  }
  querySelector(selector: string): FakeElement | null {
    const id = selector.startsWith('#') ? selector.slice(1) : '';
    const visit = (node: FakeElement): FakeElement | null => {
      if (id !== '' && node.id === id) return node;
      for (const child of node.children) {
        const found = visit(child);
        if (found !== null) return found;
      }
      return null;
    };
    for (const child of this.children) {
      const found = visit(child);
      if (found !== null) return found;
    }
    return null;
  }
}

class FakeButton extends FakeElement {}

class FakeCanvas {
  width = 1280;
  height = 720;
  getBoundingClientRectCalls = 0;
  getBoundingClientRect(): { width: number; height: number } {
    this.getBoundingClientRectCalls += 1;
    return { width: 640, height: 360 };
  }
}

function createWorld(): World {
  return { room: 0, state: 'playing', shells: [], enemies: [] } as unknown as World;
}

function installFakeDom(search = '') {
  const body = new FakeElement();
  const head = new FakeElement();
  vi.stubGlobal('document', {
    head,
    body,
    createElement(tag: string): FakeElement {
      return tag === 'button' ? new FakeButton() : new FakeElement();
    },
  });
  vi.stubGlobal('window', { location: { search }, devicePixelRatio: 2 });
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: () => Promise.resolve(),
    },
  });

  let nowMs = 0;
  vi.stubGlobal('performance', { now: () => nowMs });

  const canvas = new FakeCanvas();
  const panelApi = installReviewPanel({ canvas: canvas as unknown as HTMLCanvasElement });
  const panel = body.children.find((node) => node.id === 'agent-review-panel');
  const toggle = body.children.find((node) => node.id === 'agent-review-toggle');
  if (!(panel instanceof FakeElement) || !(toggle instanceof FakeButton)) {
    throw new Error('Review panel not installed');
  }

  const diagnostics = panel.querySelector('#review-diagnostics');
  if (diagnostics === null) throw new Error('Missing diagnostics');

  return {
    canvas,
    panel,
    toggle,
    diagnostics,
    panelApi,
    setNow: (ms: number) => {
      nowMs = ms;
    },
  };
}

describe('review panel frame recording', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does no per-frame DOM writes or layout reads while closed', () => {
    const { canvas, diagnostics, panelApi } = installFakeDom('');
    const world = createWorld();
    const writesAfterInstall = diagnostics.textContentWrites;
    const rectCallsAfterInstall = canvas.getBoundingClientRectCalls;

    for (let i = 0; i < 120; i += 1) {
      panelApi.recordFrame({
        timestamp: i * 16.7,
        world,
        simulationSteps: 1,
        simMs: 1,
        renderMs: 1,
        hudMs: 0.1,
        clamped: false,
      });
    }

    expect(diagnostics.textContentWrites).toBe(writesAfterInstall);
    expect(canvas.getBoundingClientRectCalls).toBe(rectCallsAfterInstall);
  });

  it('throttles diagnostics DOM writes to 4 Hz when open', () => {
    const { diagnostics, panelApi } = installFakeDom('?review=1');
    const world = createWorld();
    panelApi.recordFrame({
      timestamp: 0,
      world,
      simulationSteps: 1,
      simMs: 1,
      renderMs: 1,
      hudMs: 0.1,
      clamped: false,
    }); // initial open render at t=0
    const writesAfterFirstRender = diagnostics.textContentWrites;

    for (const timestamp of [16, 100, 249]) {
      panelApi.recordFrame({
        timestamp,
        world,
        simulationSteps: 1,
        simMs: 1,
        renderMs: 1,
        hudMs: 0.1,
        clamped: false,
      });
    }
    expect(diagnostics.textContentWrites).toBe(writesAfterFirstRender);

    panelApi.recordFrame({
      timestamp: 250,
      world,
      simulationSteps: 1,
      simMs: 1,
      renderMs: 1,
      hudMs: 0.1,
      clamped: false,
    });
    expect(diagnostics.textContentWrites).toBe(writesAfterFirstRender + 1);

    panelApi.recordFrame({
      timestamp: 400,
      world,
      simulationSteps: 1,
      simMs: 1,
      renderMs: 1,
      hudMs: 0.1,
      clamped: false,
    });
    expect(diagnostics.textContentWrites).toBe(writesAfterFirstRender + 1);

    panelApi.recordFrame({
      timestamp: 500,
      world,
      simulationSteps: 1,
      simMs: 1,
      renderMs: 1,
      hudMs: 0.1,
      clamped: false,
    });
    expect(diagnostics.textContentWrites).toBe(writesAfterFirstRender + 2);
  });

  it('renders diagnostics immediately when opened and only reads layout on refresh', () => {
    const { canvas, toggle, diagnostics, panelApi, setNow } = installFakeDom('');
    const world = createWorld();
    const writesAfterInstall = diagnostics.textContentWrites;
    const rectCallsAfterInstall = canvas.getBoundingClientRectCalls;

    setNow(1234);
    toggle.dispatch('click');

    expect(diagnostics.textContentWrites).toBe(writesAfterInstall + 1);
    expect(canvas.getBoundingClientRectCalls).toBe(rectCallsAfterInstall);

    panelApi.recordFrame({
      timestamp: 1235,
      world,
      simulationSteps: 1,
      simMs: 1,
      renderMs: 1,
      hudMs: 0.1,
      clamped: false,
    });
    panelApi.recordFrame({
      timestamp: 1400,
      world,
      simulationSteps: 1,
      simMs: 1,
      renderMs: 1,
      hudMs: 0.1,
      clamped: false,
    });
    expect(canvas.getBoundingClientRectCalls).toBe(rectCallsAfterInstall);

    panelApi.refreshLayout();
    expect(canvas.getBoundingClientRectCalls).toBe(rectCallsAfterInstall + 1);
  });
});
