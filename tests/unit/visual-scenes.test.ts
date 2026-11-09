import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { firstTerrain, reflect } from '../../src/sim/collision';
import { MAPS } from '../../src/sim/maps';
import { createWorld } from '../../src/sim/world';
import { snapshotWorld } from '../../src/test-bridge';
import { createVisualWorld, VISUAL_SCENES } from '../../src/visual-scenes';

describe('curated visual fixtures', () => {
  it('recreates independent deterministic state without changing campaign data', () => {
    const maps = JSON.stringify(MAPS);
    for (const scene of VISUAL_SCENES) {
      const first = createVisualWorld(scene.id);
      const second = createVisualWorld(scene.id);
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(first.time).toBe(0);
      expect(first.players).toHaveLength(2);
    }
    expect(JSON.stringify(MAPS)).toBe(maps);
    expect(createWorld(0, 'coop').events).not.toContain('Synthetic visual fixture');
  });

  it('covers all cork stages and reverses iteration without moving cells', () => {
    const atlas = createVisualWorld('cork-atlas');
    expect(atlas.corks.map((cell) => cell.hitsRemaining)).toEqual([3, 2, 1, 0]);
    expect(atlas.corks.map((cell) => cell.destroyed)).toEqual([false, false, false, true]);
    const forward = createVisualWorld('cork-adjacent');
    const reversed = createVisualWorld('cork-reversed');
    expect([...reversed.corks].reverse()).toEqual(forward.corks);
  });

  it('places primary and reflected aim targets on the production terrain queries', () => {
    const blocked = createVisualWorld('cork-aim-blocked');
    const cleared = createVisualWorld('cork-aim-cleared');
    expect(firstTerrain(blocked, 200, 270, 350, 0)?.kind).toBe('cork');
    expect(firstTerrain(cleared, 200, 270, 350, 0)).toBeNull();
    const world = createVisualWorld('cork-aim-reflected');
    const dx = Math.cos(Math.PI / 4);
    const dy = Math.sin(Math.PI / 4);
    const wall = firstTerrain(world, 300, 160, dx * 350, dy * 350);
    expect(wall?.kind).toBe('wall');
    if (wall === null) {
      throw new Error('Reflection wall missing');
    }
    expect(wall.ambiguous).toBe(false);
    const direction = reflect(dx, dy, wall.nx, wall.ny);
    const x = 300 + dx * 350 * wall.t + wall.nx * 0.05;
    const y = 160 + dy * 350 * wall.t + wall.ny * 0.05;
    expect(firstTerrain(world, x, y, direction.x * 130, direction.y * 130)?.kind).toBe('cork');
  });

  it('copies cork state into snapshots rather than exposing mutable cells', () => {
    const world = createVisualWorld('cork-atlas');
    const snapshot = snapshotWorld(world);
    const cell = world.corks[0];
    if (cell === undefined) {
      throw new Error('Atlas cork missing');
    }
    cell.hitsRemaining = 1;
    expect(snapshot.corks[0]?.hitsRemaining).toBe(3);
    expect(snapshot.corks).not.toBe(world.corks);
    expect(snapshot.time / CONFIG.fixedStep).toBe(0);
  });
});
