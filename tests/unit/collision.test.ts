import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { advanceShell } from '../../src/sim/combat';
import { firstWall, moveTank, reflect } from '../../src/sim/collision';
import type { Shell } from '../../src/sim/types';
import { createEmptyWorld, createTank } from '../../src/sim/world';

function makeShell(x = 80, y = 100, vx = 100, vy = 0): Shell {
  return {
    id: 1,
    owner: 'p1',
    faction: 'player',
    x,
    y,
    vx,
    vy,
    bounces: 0,
    dead: false,
  };
}

describe('collision and reflection', () => {
  it('flat-wall reflection preserves tangential velocity', () => {
    expect(reflect(120, 35, -1, 0)).toEqual({ x: -120, y: 35 });
  });

  it('swept contact catches a wall crossed in one step', () => {
    const world = createEmptyWorld('coop');
    world.walls = [{ x: 100, y: 0, w: 10, h: 200 }];
    const shell = makeShell();

    advanceShell(world, shell, 60);

    expect(shell.dead).toBe(false);
    expect(shell.bounces).toBe(1);
    expect(shell.vx).toBeLessThan(0);
    expect(shell.x).toBeLessThan(97);
    expect(world.bounces).toBe(1);
  });

  it('remaining distance travels after a bounce', () => {
    const world = createEmptyWorld('coop');
    world.walls = [{ x: 100, y: 0, w: 10, h: 200 }];
    const shell = makeShell();

    advanceShell(world, shell, 40);

    expect(Math.abs(shell.x - 74)).toBeLessThan(0.1);
    expect(shell.bounces).toBe(1);
  });

  it('removes a shell on its second wall contact', () => {
    const world = createEmptyWorld('coop');
    world.walls = [
      { x: 100, y: 0, w: 10, h: 200 },
      { x: 40, y: 0, w: 10, h: 200 },
    ];
    const shell = makeShell();

    advanceShell(world, shell, 100);

    expect(shell.dead).toBe(true);
    expect(shell.bounces).toBe(1);
  });

  it('removes a shell on an ambiguous corner contact', () => {
    const world = createEmptyWorld('coop');
    world.walls = [{ x: 100, y: 100, w: 40, h: 40 }];
    const shell = makeShell(80, 80, 100, 100);

    advanceShell(world, shell, 60);

    expect(shell.dead).toBe(true);
    expect(shell.bounces).toBe(0);
  });

  it('finds the earliest wall and reports corner ties as ambiguous', () => {
    const world = createEmptyWorld('coop');
    world.walls = [
      { x: 200, y: 0, w: 10, h: 300 },
      { x: 100, y: 0, w: 10, h: 300 },
    ];

    expect(firstWall(world, 80, 100, 200, 0)?.wall.x).toBe(100);

    world.walls = [{ x: 100, y: 100, w: 40, h: 40 }];
    expect(firstWall(world, 80, 80, 100, 100)?.ambiguous).toBe(true);
  });

  it('walls block tanks but tanks never block tanks', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 70, 100);
    const ally = createTank('p2', 'player', 70, 100);
    world.players = [player, ally];
    world.walls = [{ x: 100, y: 0, w: 40, h: 200 }];

    moveTank(world, player, 80, 0);

    expect(player.x).toBeLessThanOrEqual(85.001);

    world.walls = [];
    const freePlayer = createTank('p1', 'player', 70, 100);
    const freeAlly = createTank('p2', 'player', 70, 100);
    world.players = [freePlayer, freeAlly];
    moveTank(world, freePlayer, 80, 0);

    expect(freePlayer.x).toBeCloseTo(150, 8);
    expect(freeAlly.x).toBe(70);
  });

  it('keeps a moving shell inside the logical arena bounds', () => {
    const world = createEmptyWorld('coop');
    const shell = makeShell(CONFIG.width - 2, 100, 100, 0);

    advanceShell(world, shell, 10);

    expect(shell.dead).toBe(true);
  });
});
