import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { resolveShellCollisions } from '../../src/sim/combat';
import type { Shell } from '../../src/sim/types';
import { createEmptyWorld, createTank, stepWorld } from '../../src/sim/world';

function shell(id: number, x: number, y: number, vx: number, vy: number): Shell {
  return { id, owner: 'p1', faction: 'player', x, y, vx, vy, bounces: 0, dead: false };
}

describe('projectile timing regressions', () => {
  it.each([0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 4])(
    'does not resolve a future same-owner collision at angle %s',
    (angle) => {
      const world = createEmptyWorld('solo');
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const a = shell(1, 400, 270, 330 * ux, 330 * uy);
      const b = shell(2, 400 + 100 * ux, 270 + 100 * uy, -237.6 * ux, -237.6 * uy);
      world.shells = [a, b];

      resolveShellCollisions(world, CONFIG.fixedStep);

      expect(a.dead).toBe(false);
      expect(b.dead).toBe(false);
      expect(world.effects).toEqual([]);
      expect(world.events).toEqual([]);
    },
  );

  it('does not collide paths that cross at different times', () => {
    const world = createEmptyWorld('solo');
    const a = shell(1, 100, 200, 330, 0);
    const b = shell(2, 200, 100, 0, 100);
    world.shells = [a, b];

    resolveShellCollisions(world, CONFIG.fixedStep);

    expect(a.dead).toBe(false);
    expect(b.dead).toBe(false);
  });

  it('uses the existing puffy cloud at first contact, not closest approach', () => {
    const world = createEmptyWorld('solo');
    const a = shell(1, 100, 200, 330, 0);
    const b = shell(2, 108, 200, -330, 0);
    world.shells = [a, b];

    resolveShellCollisions(world, CONFIG.fixedStep);

    expect(a.dead).toBe(true);
    expect(b.dead).toBe(true);
    expect(world.effects).toHaveLength(1);
    expect(world.effects[0]?.type).toBe('poof');
    expect(world.effects[0]?.x).toBeCloseTo(104, 8);
    expect(world.effects[0]?.y).toBeCloseTo(200, 8);
    expect(world.shots).toBe(0);
    expect(world.bounces).toBe(0);
  });

  it.each([1, 2, 10])('preserves charging until firing with %s ticks remaining', (ticks) => {
    const world = createEmptyWorld('solo');
    const player = createTank('p1', 'player', 100, 200);
    player.angle = 0;
    const enemy = createTank('s0', 'enemy', 700, 200);
    enemy.angle = Math.PI;
    enemy.targetId = player.id;
    enemy.charge = CONFIG.enemyTelegraph - (ticks - 0.5) * CONFIG.fixedStep;
    world.players = [player];
    world.enemies = [enemy];

    stepWorld(world, CONFIG.fixedStep, [{ x: 0, y: 0, turn: 0, fire: true }]);
    for (let tick = 1; tick < ticks; tick += 1) {
      expect(enemy.charge).toBeGreaterThan(0);
      expect(world.shots).toBe(1);
      stepWorld(world, CONFIG.fixedStep);
    }

    expect(enemy.alive).toBe(true);
    expect(enemy.hp).toBe(1);
    expect(enemy.charge).toBe(0);
    expect(enemy.cooldown).toBeGreaterThan(0);
    expect(world.shots).toBe(2);
    expect(world.nextShell).toBe(2);
    expect(world.shells.map((projectile) => projectile.owner).sort()).toEqual(['p1', 's0']);
    expect(world.effects).toEqual([]);
  });
});
