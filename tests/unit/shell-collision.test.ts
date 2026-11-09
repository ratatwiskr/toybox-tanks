import { describe, expect, it } from 'vitest';

import { resolveShellCollisions, shoot } from '../../src/sim/combat';
import type { Shell } from '../../src/sim/types';
import { createEmptyWorld, createTank } from '../../src/sim/world';

function makeShell(
  id: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  faction: Shell['faction'],
  owner: string,
): Shell {
  return { id, owner, faction, x, y, vx, vy, bounces: 0, dead: false };
}

describe('shell-shell collision', () => {
  it('pops head-on player and enemy shells', () => {
    const world = createEmptyWorld('coop');
    const a = makeShell(1, 120, 200, 100, 0, 'player', 'p1');
    const b = makeShell(2, 180, 200, -100, 0, 'enemy', 's0');
    world.shells = [a, b];

    resolveShellCollisions(world, 0.5);

    expect(a.dead).toBe(true);
    expect(b.dead).toBe(true);
    expect(world.effects.some((effect) => effect.type === 'spark')).toBe(true);
    expect(world.events.some((event) => event.includes('Shells collided'))).toBe(true);
  });

  it('pops same-faction player shells (P1 vs P2)', () => {
    const world = createEmptyWorld('coop');
    const a = makeShell(1, 120, 200, 100, 0, 'player', 'p1');
    const b = makeShell(2, 180, 200, -100, 0, 'player', 'p2');
    world.shells = [a, b];

    resolveShellCollisions(world, 0.5);

    expect(a.dead).toBe(true);
    expect(b.dead).toBe(true);
  });

  it('pops enemy vs enemy shells', () => {
    const world = createEmptyWorld('coop');
    const a = makeShell(1, 120, 200, 100, 0, 'enemy', 's0');
    const b = makeShell(2, 180, 200, -100, 0, 'enemy', 's1');
    world.shells = [a, b];

    resolveShellCollisions(world, 0.5);

    expect(a.dead).toBe(true);
    expect(b.dead).toBe(true);
  });

  it('does not pop shells that miss each other', () => {
    const world = createEmptyWorld('coop');
    const a = makeShell(1, 120, 200, 100, 0, 'player', 'p1');
    const b = makeShell(2, 180, 300, -100, 0, 'enemy', 's0');
    world.shells = [a, b];

    resolveShellCollisions(world, 0.5);

    expect(a.dead).toBe(false);
    expect(b.dead).toBe(false);
  });

  it('terrain contact earlier in the step wins over shell collision', () => {
    const world = createEmptyWorld('coop');
    world.walls = [{ x: 130, y: 150, w: 40, h: 100 }];
    const a = makeShell(1, 100, 200, 100, 0, 'player', 'p1');
    const b = makeShell(2, 160, 200, -100, 0, 'enemy', 's0');
    world.shells = [a, b];

    resolveShellCollisions(world, 0.5);

    expect(a.dead).toBe(false);
    expect(b.dead).toBe(false);
  });

  it('resolves the earliest contact first regardless of array order', () => {
    const buildWorld = (order: 'abc' | 'cba') => {
      const world = createEmptyWorld('coop');
      const a = makeShell(1, 120, 200, 100, 0, 'player', 'p1');
      const b = makeShell(2, 180, 200, -100, 0, 'enemy', 's0');
      const c = makeShell(3, 200, 205, -100, 0, 'enemy', 's1');
      world.shells = order === 'abc' ? [a, b, c] : [c, b, a];
      return world;
    };

    const first = buildWorld('abc');
    const second = buildWorld('cba');

    resolveShellCollisions(first, 0.5);
    resolveShellCollisions(second, 0.5);

    const firstById = new Map(first.shells.map((shell) => [shell.id, shell.dead]));
    const secondById = new Map(second.shells.map((shell) => [shell.id, shell.dead]));
    expect(firstById).toEqual(secondById);
    // A and B collide at t=0.6; C survives in both orders.
    expect(firstById.get(1)).toBe(true);
    expect(firstById.get(2)).toBe(true);
    expect(firstById.get(3)).toBe(false);
  });

  it('muzzle sweep pops an incoming shell', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 200, 200);
    player.angle = 0;
    world.players = [player];
    const incoming = makeShell(1, 225, 200, -100, 0, 'enemy', 's0');
    world.shells = [incoming];

    expect(shoot(world, player)).toBe(true);
    expect(world.shells.every((shell) => shell.dead)).toBe(true);
  });

  it('post-bounce shell still collides with an opposing shell', () => {
    const world = createEmptyWorld('coop');
    const a = makeShell(1, 120, 200, 100, 0, 'player', 'p1');
    a.bounces = 1;
    const b = makeShell(2, 180, 200, -100, 0, 'enemy', 's0');
    world.shells = [a, b];

    resolveShellCollisions(world, 0.5);

    expect(a.dead).toBe(true);
    expect(b.dead).toBe(true);
  });
});
