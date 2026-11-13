import { describe, expect, it, vi } from 'vitest';

import { CONFIG } from '../../src/config';
import { addMapBorder, MAPS, validateMap } from '../../src/sim/maps';
import type * as MapsModule from '../../src/sim/maps';
import { createEmptyWorld, createWorld, stepWorld } from '../../src/sim/world';

// Exercise the real loader with test-owned maps so campaign additions or edits
// cannot change the cork fixture or its room indices.
vi.mock('../../src/sim/maps', async (importOriginal) => {
  const actual = await importOriginal<typeof MapsModule>();
  const openGrid = `......................
......................
..S...................
......................
......................
......................
......................
......................
......................
...1..............2...
......................`;

  return {
    ...actual,
    MAPS: [
      {
        name: 'Cork Fixture',
        hint: 'Cork on the authored top-left edge.',
        expectedEnemies: 1,
        grid: `CC${openGrid.slice(2)}`,
      },
      {
        name: 'Open Fixture',
        hint: 'No cork, used to prove room state is independent.',
        expectedEnemies: 1,
        grid: openGrid,
      },
    ],
  };
});

function partitionGrid(material: 'C' | '#' | '.'): string {
  return Array.from({ length: 11 }, (_, y) =>
    Array.from({ length: 22 }, (_, x) => {
      if (x === 1 && y === 1) {
        return '1';
      }
      if (x === 20 && y === 1) {
        return '2';
      }
      if (x === 20 && y === 9) {
        return 'S';
      }
      return x === 10 ? material : '.';
    }).join(''),
  ).join('\n');
}

describe('cork map validation', () => {
  it('allows a cork-blocked initial route but verifies cleared reachability', () => {
    const checked = validateMap({ grid: partitionGrid('C'), expectedEnemies: 1 });
    expect(checked.errors).toEqual([]);
    expect(checked.ok).toBe(true);
    expect(checked.initiallyReachable).toBe(false);
    expect(addMapBorder(checked.rows)[0]).toBe('#'.repeat(CONFIG.columns));
    expect(addMapBorder(checked.rows)[1]?.[0]).toBe('#');
  });

  it('reports ordinary open maps as initially reachable', () => {
    const checked = validateMap({ grid: partitionGrid('.'), expectedEnemies: 1 });
    expect(checked.ok).toBe(true);
    expect(checked.initiallyReachable).toBe(true);
  });

  it('still rejects a permanently disconnected area', () => {
    const checked = validateMap({ grid: partitionGrid('#'), expectedEnemies: 1 });
    expect(checked.ok).toBe(false);
    expect(checked.initiallyReachable).toBe(false);
    expect(checked.errors).toContain('Unreachable floor at row 1, column 12.');
  });

  it('does not let cork bypass dimensions, symbols, spawns, or enemy counts', () => {
    const grid = partitionGrid('C');
    expect(validateMap({ grid: grid.slice(1) }).ok).toBe(false);
    expect(validateMap({ grid: grid.replace('C', '?') }).errors).toContain(
      'Unknown symbol "?" at row 1, column 11.',
    );
    expect(validateMap({ grid: grid.replace('1', '.') }).errors).toContain(
      'Need exactly one player 1 spawn; found 0.',
    );
    expect(validateMap({ grid, expectedEnemies: 2 }).errors).toContain(
      'Expected 2 sentries; found 1.',
    );
  });

  it('keeps generated borders solid when cork is on an authored edge', () => {
    const first = MAPS[0];
    if (first === undefined) {
      throw new Error('First map missing');
    }
    const checked = validateMap(first);
    expect(checked.ok).toBe(true);
    const bordered = addMapBorder(checked.rows);
    expect(bordered[1]?.slice(0, 4)).toBe('#CC.');
    expect(bordered[0]).toBe('#'.repeat(CONFIG.columns));
    expect(bordered[CONFIG.rows - 1]).toBe('#'.repeat(CONFIG.columns));
    expect(bordered.every((row) => row[0] === '#' && row[CONFIG.columns - 1] === '#')).toBe(true);
  });

  it('keeps a cork-blocked route unreachable until the cork is cleared', () => {
    const blocked = validateMap({ grid: partitionGrid('C'), expectedEnemies: 1 });
    expect(blocked.ok, blocked.errors.join('; ')).toBe(true);
    expect(blocked.initiallyReachable).toBe(false);

    const cleared = validateMap({
      grid: blocked.rows.map((row) => row.replaceAll('C', '.')).join('\n'),
      expectedEnemies: 1,
    });
    expect(cleared.ok, cleared.errors.join('; ')).toBe(true);
    expect(cleared.initiallyReachable).toBe(true);
  });
});

describe('resettable cork world state', () => {
  it('loads independent three-hit cork cells, separate from permanent walls', () => {
    const world = createWorld(0, 'coop');
    expect(world.corks).toEqual([
      {
        id: 'c1,1',
        x: CONFIG.tile,
        y: CONFIG.gridY + CONFIG.tile,
        w: CONFIG.tile,
        h: CONFIG.tile,
        hitsRemaining: 3,
        destroyed: false,
      },
      {
        id: 'c2,1',
        x: CONFIG.tile * 2,
        y: CONFIG.gridY + CONFIG.tile,
        w: CONFIG.tile,
        h: CONFIG.tile,
        hitsRemaining: 3,
        destroyed: false,
      },
    ]);
    for (const cork of world.corks) {
      expect(world.walls.some((wall) => wall.x === cork.x && wall.y === cork.y)).toBe(false);
    }
  });

  it('recreates pristine cork without leaking objects, damage, IDs, or removals', () => {
    const dirty = createWorld(0, 'coop');
    const pristine = structuredClone(dirty);
    const cork = dirty.corks[0];
    if (cork === undefined) {
      throw new Error('Cork fixture missing');
    }
    cork.hitsRemaining = 0;
    cork.destroyed = true;
    dirty.corks.pop();
    dirty.time = 99;
    dirty.state = 'defeat';

    const fresh = createWorld(0, 'coop');
    expect(fresh).toEqual(pristine);
    expect(fresh.corks).not.toBe(dirty.corks);
    expect(fresh.corks[0]).not.toBe(cork);
    expect(createWorld(1, 'coop').corks).toEqual([]);
    expect(createWorld(0, 'coop').corks).toEqual(pristine.corks);
  });

  it('loads the same terrain in solo and coop, with only real players present', () => {
    const solo = createWorld(0, 'solo');
    const coop = createWorld(0, 'coop');
    expect(solo.players).toHaveLength(1);
    expect(coop.players).toHaveLength(2);
    expect(solo.corks).toEqual(coop.corks);
    expect(solo.corks[0]).not.toBe(coop.corks[0]);
    expect(createEmptyWorld('solo').corks).toEqual([]);
  });

  it('does not mutate cork or other world state while paused', () => {
    const world = createWorld(0, 'coop');
    world.state = 'paused';
    const before = structuredClone(world);
    stepWorld(world, CONFIG.fixedStep, [{ x: 1, y: 1, turn: 1, fire: true }]);
    expect(world).toEqual(before);
  });
});
