import { describe, expect, it } from 'vitest';

import { hasLineOfSight, solveBank, trace } from '../../src/sim/ballistics';
import { createEmptyWorld, createTank } from '../../src/sim/world';

function cornerWorld() {
  const world = createEmptyWorld('coop');
  world.walls = [
    { x: 40, y: 40, w: 880, h: 40 },
    { x: 40, y: 460, w: 880, h: 40 },
    { x: 40, y: 40, w: 40, h: 460 },
    { x: 880, y: 40, w: 40, h: 460 },
    { x: 400, y: 40, w: 40, h: 260 },
  ];
  const shooter = createTank('b0', 'enemy', 300, 200, 'bruiser');
  const target = createTank('p1', 'player', 520, 200);
  world.enemies = [shooter];
  world.players = [target];
  return { world, shooter, target };
}

describe('ballistics', () => {
  it('reports no straight line of sight across a divider', () => {
    const { world, shooter, target } = cornerWorld();
    expect(hasLineOfSight(world, shooter.x, shooter.y, target.x, target.y)).toBe(false);
  });

  it('traces a one-bounce path to the target as two segments', () => {
    const { world, shooter, target } = cornerWorld();
    const solution = solveBank(world, shooter, target);
    expect(solution).not.toBeNull();
    expect(solution?.segments).toHaveLength(2);
    expect(solution?.angle).toBeGreaterThanOrEqual(0);
    expect(solution?.angle).toBeLessThan(Math.PI * 2);
  });

  it('returns null when the target cannot be reached in one bounce', () => {
    const world = createEmptyWorld('coop');
    // Sealed box around the target: no path in or out.
    world.walls = [
      { x: 500, y: 100, w: 20, h: 120 },
      { x: 620, y: 100, w: 20, h: 120 },
      { x: 500, y: 100, w: 140, h: 20 },
      { x: 500, y: 200, w: 140, h: 20 },
    ];
    const shooter = createTank('b0', 'enemy', 200, 300, 'bruiser');
    const target = createTank('p1', 'player', 560, 160);
    expect(solveBank(world, shooter, target)).toBeNull();
  });

  it('reports the segments and a miss for an unobstructed trace past the target', () => {
    const { world, shooter } = cornerWorld();
    // Aim straight up: hits the top wall after one bounce but never the target.
    const result = trace(world, shooter.x, shooter.y, -Math.PI / 2, 1200, {
      x: 520,
      y: 200,
      r: 15,
    });
    expect(result.hit).toBe(false);
    expect(result.segments.length).toBeGreaterThan(0);
  });
});
