import { describe, expect, it, vi } from 'vitest';

import { CONFIG } from '../../src/config';
import { firstWall, moveTank } from '../../src/sim/collision';
import { addMapBorder, MAPS, validateMap } from '../../src/sim/maps';
import type { Wall } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

const edges = vi.hoisted(() => [
  { name: 'top left', x: 0, y: 0 },
  { name: 'top right', x: 21, y: 0 },
  { name: 'bottom left', x: 0, y: 10 },
  { name: 'bottom right', x: 21, y: 10 },
  { name: 'top', x: 10, y: 0 },
  { name: 'bottom', x: 10, y: 10 },
  { name: 'left', x: 0, y: 5 },
  { name: 'right', x: 21, y: 5 },
]);

// Replace authored data only in this test module. Keep the real validation,
// border construction, world loading, and collision implementations.
vi.mock('../../src/sim/maps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/maps')>();

  return {
    ...actual,
    MAPS: edges.map((edge) => ({
      name: edge.name,
      hint: 'Automatic border loading fixture',
      expectedEnemies: 1,
      grid: Array.from({ length: 11 }, (_, y) =>
        Array.from({ length: 22 }, (_, x) => {
          if (x === edge.x && y === edge.y) {
            return '1';
          }
          if (x === 10 && y === 5) {
            return '2';
          }
          if (x === 15 && y === 7) {
            return 'S';
          }
          return '.';
        }).join(''),
      ).join('\n'),
    })),
  };
});

describe('automatic border world loading', () => {
  it.each(edges.map((edge, index) => ({ ...edge, index })))(
    'loads and contains an outermost authored spawn: $name',
    ({ index, x, y }) => {
      const world = createWorld(index, 'coop');
      const clean = createWorld(index, 'coop');
      const player = world.players[0];
      if (player === undefined) {
        throw new Error('Player 1 was not loaded');
      }

      const expectedX = (x + 1) * CONFIG.tile + CONFIG.tile / 2;
      const expectedY = CONFIG.gridY + (y + 1) * CONFIG.tile + CONFIG.tile / 2;
      expect(player).toMatchObject({
        id: 'p1',
        x: expectedX,
        y: expectedY,
        spawnX: expectedX,
        spawnY: expectedY,
      });
      expect(world.players.map((tank) => tank.id)).toEqual(['p1', 'p2']);
      expect(world.enemies.map((tank) => tank.id)).toEqual(['s0']);

      // Independent row-major perimeter oracle: no call to addMapBorder.
      const expectedWalls: Wall[] = [];
      for (let row = 0; row < CONFIG.rows; row += 1) {
        for (let column = 0; column < CONFIG.columns; column += 1) {
          if (
            row === 0 ||
            row === CONFIG.rows - 1 ||
            column === 0 ||
            column === CONFIG.columns - 1
          ) {
            expectedWalls.push({
              x: column * CONFIG.tile,
              y: CONFIG.gridY + row * CONFIG.tile,
              w: CONFIG.tile,
              h: CONFIG.tile,
            });
          }
        }
      }
      expect(world.walls).toEqual(expectedWalls);

      const distance = CONFIG.tile * 2;
      const dx = x === 0 ? -distance : x === 21 ? distance : 0;
      const dy = y === 0 ? -distance : y === 10 ? distance : 0;
      const hit = firstWall(world, player.x, player.y, dx, dy);
      expect(hit).not.toBeNull();
      if (hit === null) {
        throw new Error('Generated boundary did not intercept the swept path');
      }
      expect(hit.t).toBeGreaterThan(0);
      expect(hit.t).toBeLessThan(1);

      moveTank(world, player, dx, dy);
      const minX = CONFIG.tile + player.r;
      const maxX = (CONFIG.columns - 1) * CONFIG.tile - player.r;
      const minY = CONFIG.gridY + CONFIG.tile + player.r;
      const maxY = CONFIG.gridY + (CONFIG.rows - 1) * CONFIG.tile - player.r;
      expect(player.x).toBeCloseTo(Math.max(minX, Math.min(expectedX + dx, maxX)), 6);
      expect(player.y).toBeCloseTo(Math.max(minY, Math.min(expectedY + dy, maxY)), 6);

      const solo = createWorld(index, 'solo');
      expect(solo.players.map((tank) => tank.id)).toEqual(['p1']);
      expect(solo.players[0]).toMatchObject({ x: expectedX, y: expectedY });
      expect(solo.walls).toEqual(expectedWalls);
      expect(solo.enemies).toEqual(clean.enemies);

      // Loading again must not reuse dirty wall, entity, or event state.
      world.walls.length = 0;
      world.events.length = 0;
      world.nextShell = 42;
      player.hp = 0;
      player.alive = false;
      expect(createWorld(index, 'coop')).toEqual(clean);
      expect(clean.walls).toEqual(expectedWalls);
      expect(clean.players[0]).toMatchObject({ hp: CONFIG.playerHealth, alive: true });
    },
  );

  it('does not mutate authored rows or reuse the returned border array', () => {
    const map = MAPS[0];
    if (map === undefined) {
      throw new Error('Edge fixture missing');
    }

    const rows = Object.freeze(map.grid.split('\n'));
    const before = [...rows];
    const first = addMapBorder(rows);
    const second = addMapBorder(rows);
    expect(rows).toEqual(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);

    first[0] = '';
    expect(addMapBorder(rows)).toEqual(second);
  });

  it('does not let reachability escape around an isolated interior corner', () => {
    const map = MAPS[0];
    if (map === undefined) {
      throw new Error('Top-left fixture missing');
    }

    const grid = map.grid
      .split('\n')
      .map((row, y) => {
        if (y === 0) {
          return `${row.slice(0, 1)}#${row.slice(2)}`;
        }
        if (y === 1) {
          return `#${row.slice(1)}`;
        }
        return row;
      })
      .join('\n');

    const checked = validateMap({ ...map, grid });
    expect(checked.ok).toBe(false);
    expect(checked.errors.some((error) => error.includes('Unreachable floor'))).toBe(true);
  });
});
