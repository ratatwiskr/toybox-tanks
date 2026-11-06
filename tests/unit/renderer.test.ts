import { describe, expect, it } from 'vitest';

import { createRenderer } from '../../src/render/renderer';
import type { RenderCanvas, RenderContext } from '../../src/render/renderer';
import type { World } from '../../src/sim/types';
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
  moveTo(): void {}
  lineTo(): void {}
  bezierCurveTo(): void {}
  arc(): void {}
  ellipse(): void {}
  roundRect(): void {}
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

function snapshot(world: World): World {
  return {
    room: world.room,
    mode: world.mode,
    state: world.state,
    time: world.time,
    walls: world.walls.map((wall) => ({ ...wall })),
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

describe('renderer contract', () => {
  it('reads world state without mutating it', () => {
    const world = createWorld(0, 'coop');
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
});
