import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { firstTerrain, hasLOS, moveTank } from '../../src/sim/collision';
import { activeShells, advanceShell, shoot } from '../../src/sim/combat';
import type { Cork, Faction, Shell, World } from '../../src/sim/types';
import { createEmptyWorld, createTank, stepWorld } from '../../src/sim/world';

function fixture(): World {
  const world = createEmptyWorld('coop');
  world.players = [createTank('p1', 'player', 60, 300)];
  const enemy = createTank('s0', 'enemy', 800, 400);
  enemy.cooldown = 999;
  world.enemies = [enemy];
  const cork: Cork = {
    id: 'c0',
    x: 120,
    y: 100,
    w: 40,
    h: 40,
    hitsRemaining: 3,
    destroyed: false,
  };
  world.corks = [cork];
  return world;
}

function projectile(id = 1, faction: Faction = 'player'): Shell {
  return {
    id,
    owner: faction === 'player' ? 'p1' : 's0',
    faction,
    x: 80,
    y: 120,
    vx: CONFIG.shellSpeed,
    vy: 0,
    bounces: 0,
    dead: false,
  };
}

function firstCork(world: World): Cork {
  const cork = world.corks[0];
  if (cork === undefined) {
    throw new Error('Cork fixture missing');
  }
  return cork;
}

describe('cork terrain', () => {
  it('blocks a circular tank until destroyed, then permits the same movement', () => {
    const world = fixture();
    const tank = createTank('p2', 'player', 80, 120);
    moveTank(world, tank, 80, 0);
    expect(tank.x).toBeCloseTo(120 - CONFIG.tankRadius, 8);
    expect(tank.y).toBe(120);
    firstCork(world).hitsRemaining = 0;
    firstCork(world).destroyed = true;
    tank.x = 80;
    moveTank(world, tank, 80, 0);
    expect(tank.x).toBeCloseTo(160, 8);
  });

  it('blocks sight while intact and opens it immediately when removed', () => {
    const world = fixture();
    const a = createTank('p2', 'player', 80, 120);
    const b = createTank('s1', 'enemy', 220, 120);
    expect(hasLOS(world, a, b)).toBe(false);
    firstCork(world).hitsRemaining = 0;
    firstCork(world).destroyed = true;
    expect(hasLOS(world, a, b)).toBe(true);
    expect(firstTerrain(world, 80, 120, 200, 0)).toBeNull();
  });

  it.each(['player', 'enemy'] as const)(
    'consumes %s shells and removes cork on exactly the third hit without feedback',
    (faction) => {
      const world = fixture();
      for (const remaining of [2, 1, 0]) {
        const shell = projectile(3 - remaining, faction);
        advanceShell(world, shell, 200);
        expect(shell.dead).toBe(true);
        expect(shell.x).toBeCloseTo(120 - CONFIG.shellRadius, 8);
        expect(shell.bounces).toBe(0);
        expect(firstCork(world).hitsRemaining).toBe(remaining);
        expect(firstCork(world).destroyed).toBe(remaining === 0);
      }
      expect(world.bounces).toBe(0);
      expect(world.effects).toEqual([]);
      expect(world.events).toEqual([]);
    },
  );

  it('lets an already-bounced shell damage cork rather than bouncing again', () => {
    const world = fixture();
    const shell = projectile();
    shell.bounces = 1;
    advanceShell(world, shell, 100);
    expect(shell.dead).toBe(true);
    expect(shell.bounces).toBe(1);
    expect(firstCork(world).hitsRemaining).toBe(2);
    expect(world.bounces).toBe(0);
  });

  it('counts a muzzle sweep, consumes its shell, and preserves shot/cooldown rules', () => {
    const world = fixture();
    const tank = createTank('p1', 'player', 100, 120);
    tank.angle = 0;
    world.players = [tank];
    expect(shoot(world, tank)).toBe(true);
    expect(firstCork(world).hitsRemaining).toBe(2);
    expect(world.shells[0]?.dead).toBe(true);
    expect(activeShells(world, tank.id)).toBe(0);
    expect(world.shots).toBe(1);
    expect(tank.cooldown).toBe(CONFIG.firingCooldown);
    expect(shoot(world, tank)).toBe(false);
    expect(firstCork(world).hitsRemaining).toBe(2);
    expect(world.effects).toEqual([]);
    expect(world.events).toEqual([]);
  });

  it('hits a nearer tank before cork and never damages cover behind that tank', () => {
    const world = fixture();
    const enemy = createTank('s1', 'enemy', 95, 120);
    world.enemies = [enemy];
    const shell = { ...projectile(), x: 60 };
    advanceShell(world, shell, 200);
    expect(enemy.alive).toBe(false);
    expect(firstCork(world).hitsRemaining).toBe(3);
    expect(shell.dead).toBe(true);
  });

  it('protects a tank behind cork and retains terrain priority on an exact tie', () => {
    for (const x of [200, 135]) {
      const world = fixture();
      const enemy = createTank('s1', 'enemy', x, 120);
      world.enemies = [enemy];
      const shell = projectile();
      advanceShell(world, shell, 300);
      expect(enemy.alive).toBe(true);
      expect(firstCork(world).hitsRemaining).toBe(2);
      expect(shell.dead).toBe(true);
    }
  });

  it('preserves a nearer solid-wall bounce without damaging farther cork', () => {
    const world = fixture();
    world.walls = [{ x: 90, y: 100, w: 10, h: 40 }];
    const shell = { ...projectile(), x: 60 };
    expect(firstTerrain(world, 60, 120, 60, 0)?.kind).toBe('wall');
    advanceShell(world, shell, 60);
    expect(shell.dead).toBe(false);
    expect(shell.vx).toBe(-CONFIG.shellSpeed);
    expect(shell.bounces).toBe(1);
    expect(firstCork(world).hitsRemaining).toBe(3);
  });

  it('consumes a shell at cork before a farther solid wall', () => {
    const world = fixture();
    world.walls = [{ x: 180, y: 100, w: 40, h: 40 }];
    const shell = projectile();
    expect(firstTerrain(world, 80, 120, 300, 0)?.kind).toBe('cork');
    advanceShell(world, shell, 300);
    expect(shell.dead).toBe(true);
    expect(shell.bounces).toBe(0);
    expect(firstCork(world).hitsRemaining).toBe(2);
  });

  it('removes an ambiguous single-cork corner shell without damage or feedback', () => {
    const world = fixture();
    const shell = { ...projectile(), x: 90, y: 70, vy: CONFIG.shellSpeed };
    advanceShell(world, shell, 200);
    expect(shell.dead).toBe(true);
    expect(firstCork(world).hitsRemaining).toBe(3);
    expect(world.effects).toEqual([]);
    expect(world.events).toEqual([]);
  });

  it('removes a mixed cork/wall corner contact without damage or reflection', () => {
    const world = fixture();
    world.walls = [{ x: 100, y: 140, w: 40, h: 40 }];
    world.corks = [{ ...firstCork(world), x: 140 }];
    const shell = { ...projectile(), x: 100, y: 100, vy: CONFIG.shellSpeed };
    const hit = firstTerrain(world, 100, 100, 200, 200);
    expect(hit?.ambiguous).toBe(true);
    advanceShell(world, shell, 200);
    expect(shell.dead).toBe(true);
    expect(shell.bounces).toBe(0);
    expect(firstCork(world).hitsRemaining).toBe(3);
    expect(world.effects).toEqual([]);
  });

  it('damages only the first stable cork cell at a same-normal cork seam', () => {
    const world = fixture();
    world.corks.push({ ...firstCork(world), id: 'c1', y: 140 });
    const shell = { ...projectile(), y: 140 };
    advanceShell(world, shell, 200);
    expect(shell.dead).toBe(true);
    expect(world.corks.map((cork) => cork.hitsRemaining)).toEqual([2, 3]);
  });

  it('lets later shells pass after the third contact destroys cork', () => {
    const world = fixture();
    for (let index = 0; index < 3; index += 1) {
      const shell = projectile(index + 1);
      advanceShell(world, shell, 200);
      expect(shell.dead).toBe(true);
    }
    expect(firstCork(world).hitsRemaining).toBe(0);
    expect(firstCork(world).destroyed).toBe(true);

    const fourth = projectile(4);
    advanceShell(world, fourth, 200);
    expect(fourth.dead).toBe(false);
    expect(fourth.x).toBeGreaterThan(120 - CONFIG.shellRadius);
    expect(world.effects).toEqual([]);
  });

  it('makes muzzle destruction visible to later movement and sight in that step', () => {
    const world = fixture();
    firstCork(world).hitsRemaining = 1;
    const p1 = createTank('p1', 'player', 100, 120);
    p1.angle = 0;
    const p2 = createTank('p2', 'player', 105, 120);
    world.players = [p1, p2];
    const enemy = createTank('s0', 'enemy', 220, 120);
    enemy.cooldown = 999;
    world.enemies = [enemy];
    stepWorld(world, CONFIG.fixedStep, [
      { x: 0, y: 0, turn: 0, fire: true },
      { x: 1, y: 0, turn: 0, fire: false },
    ]);
    expect(firstCork(world).destroyed).toBe(true);
    expect(p2.x).toBeGreaterThan(120 - CONFIG.tankRadius);
    expect(enemy.targetId).toBe('p2');
  });

  it('repeats simultaneous destruction deterministically', () => {
    const a = fixture();
    const b = fixture();
    for (let index = 0; index < 3; index += 1) {
      const shellA = projectile(index + 1);
      const shellB = projectile(index + 1);
      advanceShell(a, shellA, 200);
      advanceShell(b, shellB, 200);
    }
    expect(a).toEqual(b);
  });
});
