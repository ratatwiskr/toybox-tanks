import { describe, expect, it } from 'vitest';

import { KINDS } from '../../src/sim/kinds';
import { spawnPom, updatePoms } from '../../src/sim/poms';
import { createEmptyWorld, createTank } from '../../src/sim/world';
import type { Pom } from '../../src/sim/types';

function pomAt(tx: number, ty: number): Pom {
  const flight = KINDS.lobber.flight;
  return {
    id: 1,
    faction: 'enemy',
    sx: tx,
    sy: ty,
    x: tx,
    y: ty,
    tx,
    ty,
    flight,
    life: flight,
    blast: KINDS.lobber.blast,
    dead: false,
  };
}

describe('lobber poms', () => {
  it('spawns at the predicted target position and damages a stationary player', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('l0', 'enemy', 100, 300, 'lobber');
    const player = createTank('p1', 'player', 300, 300);
    world.enemies = [enemy];
    world.players = [player];

    const pom = spawnPom(world, enemy, player);
    expect(pom.tx).toBeCloseTo(300, 8);
    expect(pom.ty).toBeCloseTo(300, 8);

    updatePoms(world, KINDS.lobber.flight / 2);
    expect(pom.dead).toBe(false);
    expect(player.hp).toBe(2);
    expect(pom.x).toBeCloseTo(200, 6);

    updatePoms(world, KINDS.lobber.flight / 2 + 1e-9);
    expect(pom.dead).toBe(true);
    expect(player.hp).toBe(1);
  });

  it('leads a moving target by 60% of the flight time', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('l0', 'enemy', 100, 300, 'lobber');
    const player = createTank('p1', 'player', 400, 300);
    player.vx = 100;
    world.enemies = [enemy];
    world.players = [player];

    const pom = spawnPom(world, enemy, player);

    expect(pom.tx).toBeCloseTo(400 + 100 * KINDS.lobber.flight * 0.6, 8);
    expect(pom.ty).toBeCloseTo(300, 8);
  });

  it('blocks blast damage when a wall separates the landing point from the player', () => {
    const open = createEmptyWorld('coop');
    const openPlayer = createTank('p1', 'player', 350, 300);
    open.players = [openPlayer];
    open.poms = [pomAt(300, 300)];
    updatePoms(open, KINDS.lobber.flight + 1e-9);
    expect(openPlayer.hp).toBe(1);

    const blocked = createEmptyWorld('coop');
    const blockedPlayer = createTank('p1', 'player', 350, 300);
    blocked.players = [blockedPlayer];
    blocked.walls = [{ x: 320, y: 260, w: 20, h: 80 }];
    blocked.poms = [pomAt(300, 300)];
    updatePoms(blocked, KINDS.lobber.flight + 1e-9);
    expect(blockedPlayer.hp).toBe(2);
  });

  it('chips a cork under the landing blast', () => {
    const world = createEmptyWorld('coop');
    world.corks = [{ id: 'c1', x: 280, y: 280, w: 40, h: 40, hitsRemaining: 3, destroyed: false }];
    world.poms = [pomAt(300, 300)];

    updatePoms(world, KINDS.lobber.flight + 1e-9);

    expect(world.corks[0]?.hitsRemaining).toBe(2);
    expect(world.corks[0]?.destroyed).toBe(false);
  });
});
