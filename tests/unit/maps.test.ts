import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import {
  addMapBorder,
  MAP_INTERIOR_COLUMNS,
  MAP_INTERIOR_ROWS,
  MAPS,
  validateMap,
} from '../../src/sim/maps';
import { createWorld } from '../../src/sim/world';

// Test-owned interior grid. Format and loader tests use copied fixtures so that
// adding, editing, or reordering campaign rooms cannot change their expectations.
const FIXTURE_GRID = `......................
......................
..S................S..
......................
.........##...........
......................
......................
......................
..S................S..
...1..............2...
......................`;

function replaceCell(grid: string, x: number, y: number, cell: string): string {
  const rows = grid.split('\n');
  const row = rows[y];
  if (row === undefined) {
    throw new Error(`No row ${String(y)}`);
  }
  rows[y] = `${row.slice(0, x)}${cell}${row.slice(x + 1)}`;
  return rows.join('\n');
}

describe('map validation', () => {
  it('accepts a well-formed interior and reports it as initially reachable', () => {
    const checked = validateMap({ grid: FIXTURE_GRID, expectedEnemies: 4 });

    expect(checked.ok, checked.errors.join('; ')).toBe(true);
    expect(checked.rows).toHaveLength(MAP_INTERIOR_ROWS);
    expect(checked.rows.every((row) => row.length === MAP_INTERIOR_COLUMNS)).toBe(true);
    expect(checked.initiallyReachable).toBe(true);
  });

  it('adds the closed border outside the authored interior', () => {
    const checked = validateMap({ grid: FIXTURE_GRID });
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
  });

  it('treats a spawn on the outermost authored row as interior', () => {
    let grid = replaceCell(FIXTURE_GRID, 3, 9, '.');
    grid = replaceCell(grid, 0, 0, '1');

    const checked = validateMap({ grid });
    expect(checked.ok, checked.errors.join('; ')).toBe(true);

    const bordered = addMapBorder(checked.rows);
    expect(bordered[1]?.[1]).toBe('1');
    expect(bordered[0]?.[1]).toBe('#');
    expect(bordered[1]?.[0]).toBe('#');
    expect(bordered.every((row, y) => row[0] === '#' || y === 0)).toBe(true);
  });

  it('rejects malformed dimensions, symbols, spawns, borders, and enemy counts', () => {
    const shortGrid = FIXTURE_GRID.split('\n')
      .map((row, index) => (index === 0 ? row.slice(1) : row))
      .join('\n');

    const tooShort = validateMap({ grid: '#' });
    expect(tooShort.ok).toBe(false);
    expect(tooShort.errors).toContain('Expected 11 interior rows, got 1.');

    const wrongWidth = validateMap({ grid: shortGrid });
    expect(wrongWidth.ok).toBe(false);
    expect(wrongWidth.errors).toContain('Row 1: expected 22 interior cells, got 21.');

    const unknown = validateMap({ grid: replaceCell(FIXTURE_GRID, 5, 5, '?') });
    expect(unknown.ok).toBe(false);
    expect(unknown.errors).toContain('Unknown symbol "?" at row 6, column 6.');

    const missingSpawn = validateMap({ grid: replaceCell(FIXTURE_GRID, 3, 9, '.') });
    expect(missingSpawn.ok).toBe(false);
    expect(missingSpawn.errors).toContain('Need exactly one player 1 spawn; found 0.');

    const duplicateSpawn = validateMap({ grid: replaceCell(FIXTURE_GRID, 0, 0, '1') });
    expect(duplicateSpawn.ok).toBe(false);
    expect(duplicateSpawn.errors).toContain('Need exactly one player 1 spawn; found 2.');

    const wrongSentryCount = validateMap({ grid: FIXTURE_GRID, expectedEnemies: 1 });
    expect(wrongSentryCount.ok).toBe(false);
    expect(wrongSentryCount.errors).toContain('Expected 1 sentries; found 4.');

    let noSentries = replaceCell(FIXTURE_GRID, 2, 2, '.');
    noSentries = replaceCell(noSentries, 19, 2, '.');
    noSentries = replaceCell(noSentries, 2, 8, '.');
    noSentries = replaceCell(noSentries, 19, 8, '.');
    const missingSentries = validateMap({ grid: noSentries });
    expect(missingSentries.ok).toBe(false);
    expect(missingSentries.errors).toContain('At least one sentry is required.');
  });

  it('rejects unreachable interior floor', () => {
    let grid = FIXTURE_GRID;
    grid = replaceCell(grid, 4, 5, '#');
    grid = replaceCell(grid, 6, 5, '#');
    grid = replaceCell(grid, 5, 4, '#');
    grid = replaceCell(grid, 5, 6, '#');

    const checked = validateMap({ grid });
    expect(checked.ok).toBe(false);
    expect(checked.errors.some((error) => error.includes('Unreachable floor'))).toBe(true);
  });
});

describe('campaign maps', () => {
  it('provides unique, well-formed metadata for every room', () => {
    const names = new Set<string>();

    for (const map of MAPS) {
      expect(map.name.trim(), 'room name').not.toBe('');
      expect(map.hint.trim(), `${map.name} hint`).not.toBe('');
      expect(Number.isInteger(map.expectedEnemies), map.name).toBe(true);
      expect(map.expectedEnemies, map.name).toBeGreaterThan(0);
      expect(names.has(map.name), `duplicate room name: ${map.name}`).toBe(false);
      names.add(map.name);
    }

    expect(MAPS.length).toBeGreaterThan(0);
    expect(names.size).toBe(MAPS.length);
  });

  it('validates every authored interior', () => {
    for (const map of MAPS) {
      const checked = validateMap(map);
      expect(checked.ok, `${map.name}: ${checked.errors.join('; ')}`).toBe(true);
      expect(checked.rows).toHaveLength(MAP_INTERIOR_ROWS);
      expect(checked.rows.every((row) => row.length === MAP_INTERIOR_COLUMNS)).toBe(true);
    }
  });

  it('loads every campaign room in both modes with its declared contents', () => {
    const borderWalls = CONFIG.columns * 2 + (CONFIG.rows - 2) * 2;

    for (const [index, map] of MAPS.entries()) {
      const coop = createWorld(index, 'coop');
      const checked = validateMap(map);
      const cells = checked.rows.join('');

      expect(coop.room, map.name).toBe(index);
      expect(coop.players, map.name).toHaveLength(2);
      expect(coop.enemies, map.name).toHaveLength(map.expectedEnemies);
      expect(coop.walls, map.name).toHaveLength(
        borderWalls + Array.from(cells).filter((cell) => cell === '#').length,
      );
      expect(coop.corks, map.name).toHaveLength(
        Array.from(cells).filter((cell) => cell === 'C').length,
      );

      const solo = createWorld(index, 'solo');
      expect(solo.room, map.name).toBe(index);
      expect(solo.players, map.name).toHaveLength(1);
      expect(solo.enemies, map.name).toHaveLength(map.expectedEnemies);
      expect(solo.walls, map.name).toEqual(coop.walls);
      expect(solo.corks, map.name).toEqual(coop.corks);
    }
  });
});
