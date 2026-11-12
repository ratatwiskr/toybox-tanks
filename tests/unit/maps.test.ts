import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import {
  addMapBorder,
  MAP_INTERIOR_COLUMNS,
  MAP_INTERIOR_ROWS,
  MAPS,
  validateMap,
} from '../../src/sim/maps';
import type { Wall } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

// Full 24 × 13 grids from before the border was generated automatically. These
// are the authoritative geometry fixtures for the map-format refactor. They are
// keyed by name because campaign insertion can move a room's index.
const LEGACY_GRIDS: Readonly<Record<string, string>> = {
  'First Bounce': `########################
#......................#
#......................#
#...S..##.....##...S...#
#......##.....##.......#
#......................#
#......................#
#.........####.........#
#......................#
#......................#
#...1..............2...#
#......................#
########################`,
  'Block Party': `########################
#......................#
#..S......#..S.........#
#....#....#........#...#
#....#....#....#...#...#
#....#....#....#...#...#
#....#.........#...#...#
#....#.........#.......#
#........###...#.....S.#
#......................#
#..1..............2....#
#......................#
########################`,
  'Together Through': `########################
#......................#
#..S..........S........#
#.........#.....###..S.#
#...###...#............#
#.........#............#
#.........#............#
#..................#...#
#.....###.....###..#...#
#...........S......#...#
#..1.................2.#
#......................#
########################`,
  'Cork Keep': `########################
#......................#
#..S................S..#
#......................#
#...##..........##.....#
#...##...CCC....##.....#
#........CSC...........#
#...##...CCC....##.....#
#...##..........##.....#
#..S................S..#
#......................#
#...1..............2...#
########################`,
};

function replaceCell(grid: string, x: number, y: number, cell: string): string {
  const rows = grid.split('\n');
  const row = rows[y];
  if (row === undefined) {
    throw new Error(`No row ${String(y)}`);
  }
  rows[y] = `${row.slice(0, x)}${cell}${row.slice(x + 1)}`;
  return rows.join('\n');
}

function rowsOf(grid: string): string[] {
  return grid.split('\n');
}

function wallsFor(rows: readonly string[]): Wall[] {
  const walls: Wall[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') {
        walls.push({
          x: x * CONFIG.tile,
          y: CONFIG.gridY + y * CONFIG.tile,
          w: CONFIG.tile,
          h: CONFIG.tile,
        });
      }
    }
  });
  return walls;
}

function positionsFor(rows: readonly string[], cell: string): Array<readonly [number, number]> {
  const positions: Array<readonly [number, number]> = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === cell) {
        positions.push([
          x * CONFIG.tile + CONFIG.tile / 2,
          CONFIG.gridY + y * CONFIG.tile + CONFIG.tile / 2,
        ]);
      }
    }
  });
  return positions;
}

describe('authored maps', () => {
  it('uses only the 22 × 11 interior and preserves room metadata', () => {
    expect(MAPS.map((map) => map.name)).toEqual([
      'First Bounce',
      'The Courtyard',
      'Block Party',
      'Together Through',
      'Cork Keep',
      'Crossfire Alley',
      'Pillars of Salt',
      'Choke Point',
      'Cork Sieve',
      'The Fortress',
      'Spiral',
      'Double Bunker',
      'The Labyrinth',
      'The Gauntlet',
      'Ring of Fire',
    ]);
    expect(MAPS.map((map) => map.hint)).toEqual([
      'Try the outer rails: every shell gets one bounce.',
      'Use the staggered cork blocks for soft cover before advancing.',
      'Take different routes. Corners are cover, not dead ends.',
      'Cover each other. Either surviving player can finish.',
      'Break the cork to reach the guarded tower.',
      'Coordinate with your partner to cross-fire across parallel corridors.',
      'Use the isolated blocks to set up steep ricochet angles.',
      'Control the central gap before breaking into the enemy side.',
      'Carve your own firing lanes through the destructible wall.',
      'Chip away at the multi-hit cork walls to force open a breach.',
      'Work your way inward, or bank a shell over the cork core.',
      'Clear the cork guards to safely breach each flank.',
      'Bounce shots around outer walls to hit enemies safely tucked inside.',
      'Divide forces: one clears the wings, the other holds the middle.',
      'Enemies completely surround you. Stay mobile and use minimal cover.',
    ]);
    expect(MAPS.map((map) => map.expectedEnemies)).toEqual([
      2, 2, 3, 4, 5, 4, 6, 4, 4, 6, 4, 6, 4, 5, 9,
    ]);

    for (const map of MAPS) {
      const checked = validateMap(map);
      expect(checked.ok, `${map.name}: ${checked.errors.join('; ')}`).toBe(true);
      expect(checked.rows).toHaveLength(MAP_INTERIOR_ROWS);
      expect(checked.rows.every((row) => row.length === MAP_INTERIOR_COLUMNS)).toBe(true);

      const legacy = LEGACY_GRIDS[map.name];
      if (legacy !== undefined) {
        expect(checked.rows, map.name).toEqual(
          rowsOf(legacy)
            .slice(1, -1)
            .map((row) => row.slice(1, -1)),
        );
      }
    }
  });

  it('loads every campaign room with its declared enemy count', () => {
    for (const [index, map] of MAPS.entries()) {
      const world = createWorld(index, 'coop');
      expect(world.room, map.name).toBe(index);
      expect(world.players, map.name).toHaveLength(2);
      expect(world.enemies, map.name).toHaveLength(map.expectedEnemies);
    }
  });

  it('adds the closed border outside the authored interior for every room', () => {
    for (const map of MAPS) {
      const checked = validateMap(map);
      const bordered = addMapBorder(checked.rows);

      expect(bordered).toHaveLength(CONFIG.rows);
      expect(bordered.every((row) => row.length === CONFIG.columns)).toBe(true);

      for (let x = 0; x < CONFIG.columns; x += 1) {
        expect(bordered[0]?.[x]).toBe('#');
        expect(bordered[CONFIG.rows - 1]?.[x]).toBe('#');
      }
      for (let y = 0; y < CONFIG.rows; y += 1) {
        expect(bordered[y]?.[0]).toBe('#');
        expect(bordered[y]?.[CONFIG.columns - 1]).toBe('#');
      }

      // The outermost authored tile stays interior; the wall is placed outside it.
      expect(bordered[1]?.[1]).toBe(checked.rows[0]?.[0]);
      expect(bordered[1]?.[CONFIG.columns - 2]).toBe(checked.rows[0]?.[MAP_INTERIOR_COLUMNS - 1]);
      expect(bordered[CONFIG.rows - 2]?.[1]).toBe(checked.rows[MAP_INTERIOR_ROWS - 1]?.[0]);
      expect(bordered[CONFIG.rows - 2]?.[CONFIG.columns - 2]).toBe(
        checked.rows[MAP_INTERIOR_ROWS - 1]?.[MAP_INTERIOR_COLUMNS - 1],
      );
    }
  });

  it('treats a spawn on the outermost authored row as interior', () => {
    const first = MAPS[0];
    if (first === undefined) {
      throw new Error('First map missing');
    }

    let grid = replaceCell(first.grid, 3, 9, '.');
    grid = replaceCell(grid, 0, 0, '1');

    const checked = validateMap({ grid });
    expect(checked.ok, checked.errors.join('; ')).toBe(true);

    const bordered = addMapBorder(checked.rows);
    expect(bordered[1]?.[1]).toBe('1');
    expect(bordered[0]?.[1]).toBe('#');
    expect(bordered[1]?.[0]).toBe('#');
    expect(bordered.every((row, y) => row[0] === '#' || y === 0)).toBe(true);
  });

  it('loads identical wall, player, and enemy geometry to the legacy grids', () => {
    for (const [name, legacyGrid] of Object.entries(LEGACY_GRIDS)) {
      const index = MAPS.findIndex((map) => map.name === name);
      expect(index, name).toBeGreaterThanOrEqual(0);
      const legacyRows = rowsOf(legacyGrid);
      const world = createWorld(index, 'coop');

      expect(world.walls, name).toEqual(wallsFor(legacyRows));

      const expectedPlayers = (['1', '2'] as const).map((cell) => {
        const position = positionsFor(legacyRows, cell)[0];
        if (position === undefined) {
          throw new Error(`Missing ${cell} spawn in legacy fixture`);
        }
        return [cell === '1' ? 'p1' : 'p2', position[0], position[1]] as const;
      });
      expect(world.players.map((player) => [player.id, player.x, player.y])).toEqual(
        expectedPlayers,
      );

      const expectedEnemies = positionsFor(legacyRows, 'S').map(
        (position, enemyIndex) => [`s${String(enemyIndex)}`, position[0], position[1]] as const,
      );
      expect(world.enemies.map((enemy) => [enemy.id, enemy.x, enemy.y])).toEqual(expectedEnemies);
    }
  });

  it('rejects malformed dimensions, symbols, spawns, borders, and enemy counts', () => {
    const first = MAPS[0];
    if (first === undefined) {
      throw new Error('First map missing');
    }

    const shortGrid = first.grid
      .split('\n')
      .map((row, index) => (index === 0 ? row.slice(1) : row))
      .join('\n');

    const tooShort = validateMap({ grid: '#' });
    expect(tooShort.ok).toBe(false);
    expect(tooShort.errors).toContain('Expected 11 interior rows, got 1.');

    const wrongWidth = validateMap({ grid: shortGrid });
    expect(wrongWidth.ok).toBe(false);
    expect(wrongWidth.errors).toContain('Row 1: expected 22 interior cells, got 21.');

    const unknown = validateMap({ grid: replaceCell(first.grid, 5, 5, '?') });
    expect(unknown.ok).toBe(false);
    expect(unknown.errors).toContain('Unknown symbol "?" at row 6, column 6.');

    const missingSpawn = validateMap({ grid: replaceCell(first.grid, 3, 9, '.') });
    expect(missingSpawn.ok).toBe(false);
    expect(missingSpawn.errors).toContain('Need exactly one player 1 spawn; found 0.');

    const duplicateSpawn = validateMap({ grid: replaceCell(first.grid, 0, 0, '1') });
    expect(duplicateSpawn.ok).toBe(false);
    expect(duplicateSpawn.errors).toContain('Need exactly one player 1 spawn; found 2.');

    const wrongSentryCount = validateMap({ grid: first.grid, expectedEnemies: 1 });
    expect(wrongSentryCount.ok).toBe(false);
    expect(wrongSentryCount.errors).toContain('Expected 1 sentries; found 2.');

    let noSentries = replaceCell(first.grid, 3, 2, '.');
    noSentries = replaceCell(noSentries, 18, 2, '.');
    const missingSentries = validateMap({ grid: noSentries });
    expect(missingSentries.ok).toBe(false);
    expect(missingSentries.errors).toContain('At least one sentry is required.');
  });

  it('rejects unreachable interior floor', () => {
    const first = MAPS[0];
    if (first === undefined) {
      throw new Error('First map missing');
    }

    let grid = replaceCell(first.grid, 8, 4, '#');
    grid = replaceCell(grid, 10, 4, '#');
    grid = replaceCell(grid, 9, 3, '#');
    grid = replaceCell(grid, 9, 5, '#');

    const checked = validateMap({ grid });
    expect(checked.ok).toBe(false);
    expect(checked.errors.some((error) => error.includes('Unreachable floor'))).toBe(true);
  });
});
