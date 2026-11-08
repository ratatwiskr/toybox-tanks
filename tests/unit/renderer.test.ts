import { describe, expect, it } from 'vitest';

import { createRenderer } from '../../src/render/renderer';
import type { RenderCanvas, RenderContext } from '../../src/render/renderer';
import type { Cork, World } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

class StubContext implements RenderContext {
  globalAlpha = 1;
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'left';

  save(): void {}
  restore(): void {}
  beginPath(): void {}
  closePath(): void {}
  fill(): void {}
  stroke(): void {}
  fillRect(): void {}
  strokeRect(): void {}
  clearRect(): void {}
  moveTo(_x: number, _y: number): void {}
  lineTo(_x: number, _y: number): void {}
  bezierCurveTo(): void {}
  arc(): void {}
  ellipse(): void {}
  roundRect(_x: number, _y: number, _w: number, _h: number, _r?: number): void {}
  translate(): void {}
  rotate(): void {}
  setTransform(): void {}
  setLineDash(): void {}
  fillText(): void {}
}

class StubCanvas implements RenderCanvas {
  width = 960;
  height = 540;
  private readonly context = new StubContext();

  getContext(_contextId: '2d'): RenderContext | null {
    return this.context;
  }

  getBoundingClientRect(): { readonly width: number; readonly height: number } {
    return { width: 960, height: 540 };
  }
}

interface RecordedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface RecordedPath {
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly rect: RecordedRect | null;
  readonly style: string;
  readonly lineWidth: number;
}

class RecordingContext extends StubContext {
  readonly strokes: RecordedPath[] = [];
  readonly fills: RecordedPath[] = [];
  private points: Array<{ x: number; y: number }> = [];
  private rect: RecordedRect | null = null;

  override beginPath(): void {
    this.points = [];
    this.rect = null;
  }

  override moveTo(x: number, y: number): void {
    this.points.push({ x, y });
  }

  override lineTo(x: number, y: number): void {
    this.points.push({ x, y });
  }

  override roundRect(x: number, y: number, width: number, height: number): void {
    this.rect = { x, y, width, height };
  }

  override stroke(): void {
    this.strokes.push({
      points: [...this.points],
      rect: this.rect,
      style: typeof this.strokeStyle === 'string' ? this.strokeStyle : '',
      lineWidth: this.lineWidth,
    });
  }

  override fill(): void {
    this.fills.push({
      points: [...this.points],
      rect: this.rect,
      style: typeof this.fillStyle === 'string' ? this.fillStyle : '',
      lineWidth: this.lineWidth,
    });
  }
}

class RecordingCanvas extends StubCanvas {
  readonly recording = new RecordingContext();

  override getContext(_contextId: '2d'): RenderContext | null {
    return this.recording;
  }
}

function crackPaths(context: RecordingContext): readonly RecordedPath[] {
  return context.strokes.filter((path) => path.style === '#705a40');
}

function chipPaths(context: RecordingContext): readonly RecordedPath[] {
  return context.fills.filter((path) => path.style === '#a2875e');
}

function renderDamagedCork(hitsRemaining: 1 | 2): {
  readonly context: RecordingContext;
  readonly corkX: number;
  readonly corkY: number;
} {
  const world = createWorld(3, 'coop');
  const cork = world.corks[0];
  if (cork === undefined) {
    throw new Error('Cork Keep cork missing');
  }

  // Isolate one real Cork Keep tile so the recorded paths belong to it.
  world.corks = [cork];
  cork.hitsRemaining = hitsRemaining;

  const before = snapshot(world);
  const canvas = new RecordingCanvas();
  createRenderer(canvas).render(world);

  expect(snapshot(world)).toEqual(before);

  return { context: canvas.recording, corkX: cork.x, corkY: cork.y };
}

function snapshot(world: World): World {
  return {
    room: world.room,
    mode: world.mode,
    state: world.state,
    time: world.time,
    walls: world.walls.map((wall) => ({ ...wall })),
    corks: world.corks.map((cork) => ({ ...cork })),
    players: world.players.map((tank) => ({ ...tank })),
    enemies: world.enemies.map((tank) => ({ ...tank })),
    shells: world.shells.map((shell) => ({ ...shell })),
    effects: world.effects.map((effect) => ({ ...effect })),
    events: [...world.events],
    nextShell: world.nextShell,
    shots: world.shots,
    bounces: world.bounces,
  };
}

function corkKeepCorks(states: readonly (1 | 2 | 3)[]): Cork[] {
  const world = createWorld(3, 'coop');
  return world.corks.slice(0, states.length).map((cork, index) => ({
    ...cork,
    hitsRemaining: states[index] ?? 3,
  }));
}

function renderCorks(corks: readonly Cork[]): {
  readonly context: RecordingContext;
  readonly corks: readonly Cork[];
} {
  const world = createWorld(3, 'coop');
  world.corks = corks.map((cork) => ({ ...cork }));

  const before = snapshot(world);
  const canvas = new RecordingCanvas();
  createRenderer(canvas).render(world);

  expect(snapshot(world)).toEqual(before);

  return { context: canvas.recording, corks: world.corks };
}

function corkOutlinePaths(context: RecordingContext, cork: Cork): readonly RecordedPath[] {
  return context.strokes.filter(
    (path) =>
      path.rect !== null &&
      path.rect.x >= cork.x &&
      path.rect.x <= cork.x + 3 &&
      path.rect.y >= cork.y &&
      path.rect.y <= cork.y + 2 &&
      (path.style === '#826c47' || path.style === '#e2cca0'),
  );
}

function outlineSignature(context: RecordingContext, cork: Cork): string {
  return corkOutlinePaths(context, cork)
    .map((path) =>
      JSON.stringify([path.style, path.lineWidth, path.rect?.width, path.rect?.height]),
    )
    .join('|');
}

describe('renderer contract', () => {
  it('reads world state without mutating it', () => {
    const world = createWorld(0, 'coop');
    world.corks.push({
      id: 'c-test',
      x: 400,
      y: 200,
      w: 40,
      h: 40,
      hitsRemaining: 2,
      destroyed: false,
    });
    world.shells.push({
      id: 7,
      owner: 'p1',
      faction: 'player',
      x: 200,
      y: 200,
      vx: 100,
      vy: 0,
      bounces: 1,
      dead: false,
    });
    world.effects.push({ x: 200, y: 200, type: 'spark', age: 0.1, life: 0.22, seed: 2.4 });

    const before = snapshot(world);
    const renderer = createRenderer(new StubCanvas());

    renderer.render(world, true);

    expect(snapshot(world)).toEqual(before);
  });

  it('renders an empty error world without mutating it', () => {
    const world = createWorld(0, 'solo');
    world.state = 'error';
    world.players = [];
    world.enemies = [];
    world.walls = [];

    const before = snapshot(world);
    const renderer = createRenderer(new StubCanvas());

    renderer.render(world);

    expect(snapshot(world)).toEqual(before);
  });

  it('keeps crack and chip paths inside the cork face at both damaged stages', () => {
    const twoHitsRemaining = renderDamagedCork(2);
    const oneHitRemaining = renderDamagedCork(1);

    for (const render of [twoHitsRemaining, oneHitRemaining]) {
      const left = render.corkX + 1;
      const top = render.corkY + 1;
      const right = render.corkX + 39;
      const bottom = render.corkY + 38;

      const cracks = crackPaths(render.context);
      expect(cracks.length).toBeGreaterThan(0);
      for (const path of cracks) {
        expect(path.points.length).toBeGreaterThan(1);
        const margin = path.lineWidth / 2;
        for (const point of path.points) {
          expect(point.x).toBeGreaterThanOrEqual(left + margin - 1e-9);
          expect(point.x).toBeLessThanOrEqual(right - margin + 1e-9);
          expect(point.y).toBeGreaterThanOrEqual(top + margin - 1e-9);
          expect(point.y).toBeLessThanOrEqual(bottom - margin + 1e-9);
        }
      }

      for (const path of chipPaths(render.context)) {
        expect(path.points.length).toBeGreaterThanOrEqual(3);
        for (const point of path.points) {
          expect(point.x).toBeGreaterThanOrEqual(left - 1e-9);
          expect(point.x).toBeLessThanOrEqual(right + 1e-9);
          expect(point.y).toBeGreaterThanOrEqual(top - 1e-9);
          expect(point.y).toBeLessThanOrEqual(bottom + 1e-9);
        }
      }
    }

    expect(crackPaths(oneHitRemaining.context).length).toBeGreaterThan(
      crackPaths(twoHitsRemaining.context).length,
    );
    expect(chipPaths(twoHitsRemaining.context)).toHaveLength(0);
    expect(chipPaths(oneHitRemaining.context).length).toBeGreaterThan(0);
  });

  it('draws both cork outlines with an explicit width of 1 in every damage state', () => {
    for (const hitsRemaining of [3, 2, 1] as const) {
      const { context, corks } = renderCorks(corkKeepCorks([hitsRemaining]));
      const cork = corks[0];
      if (cork === undefined) {
        throw new Error('Cork Keep cork missing');
      }

      const outlines = corkOutlinePaths(context, cork);
      expect(outlines.map((path) => path.style)).toEqual(['#826c47', '#e2cca0']);
      expect(outlines.map((path) => path.lineWidth)).toEqual([1, 1]);
    }
  });

  it('keeps cork outlines identical regardless of the preceding tile damage', () => {
    for (const targetHits of [3, 2, 1] as const) {
      const signatures = ([3, 2, 1] as const).map((previousHits) => {
        const { context, corks } = renderCorks(corkKeepCorks([previousHits, targetHits]));
        const target = corks[1];
        if (target === undefined) {
          throw new Error('Cork Keep target cork missing');
        }
        return outlineSignature(context, target);
      });

      expect(signatures[1]).toBe(signatures[0]);
      expect(signatures[2]).toBe(signatures[0]);
    }
  });

  it('keeps each cork outline independent of tile render order', () => {
    const corks = corkKeepCorks([3, 2, 1]);
    const forward = renderCorks(corks);
    const reversed = renderCorks([...corks].reverse());

    const forwardSignatures = new Map(
      forward.corks.map((cork) => [cork.id, outlineSignature(forward.context, cork)]),
    );
    for (const cork of reversed.corks) {
      expect(outlineSignature(reversed.context, cork)).toBe(forwardSignatures.get(cork.id));
    }
  });
});
