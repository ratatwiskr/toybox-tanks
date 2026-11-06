import { describe, expect, it } from 'vitest';

import { MAPS, validateMap } from '../../src/sim/maps';

function replaceCell(grid: string, x: number, y: number, cell: string): string {
  const rows = grid.split('\n');
  const row = rows[y];
  if (row === undefined) {
    throw new Error(`No row ${String(y)}`);
  }
  rows[y] = `${row.slice(0, x)}${cell}${row.slice(x + 1)}`;
  return rows.join('\n');
}

describe('authored maps', () => {
  it('validates all three rooms with the expected sentry counts', () => {
    expect(MAPS.map((map) => map.name)).toEqual([
      'First Bounce',
      'Block Party',
      'Together Through',
    ]);
    expect(MAPS.map((map) => map.expectedEnemies)).toEqual([2, 3, 4]);

    for (const map of MAPS) {
      const checked = validateMap(map);
      expect(checked.ok, `${map.name}: ${checked.errors.join('; ')}`).toBe(true);
      expect(checked.rows).toHaveLength(13);
      expect(checked.rows.every((row) => row.length === 24)).toBe(true);
    }
  });

  it('rejects malformed dimensions, symbols, spawns, borders, and enemy counts', () => {
    const first = MAPS[0];
    if (first === undefined) {
      throw new Error('First map missing');
    }

    expect(validateMap({ grid: '#' }).ok).toBe(false);
    expect(validateMap({ grid: replaceCell(first.grid, 5, 5, '?') }).ok).toBe(false);
    expect(validateMap({ grid: replaceCell(first.grid, 4, 10, '.') }).ok).toBe(false);
    expect(validateMap({ grid: replaceCell(first.grid, 0, 0, '.') }).ok).toBe(false);
    expect(validateMap({ grid: first.grid, expectedEnemies: 9 }).ok).toBe(false);
  });

  it('rejects unreachable floor', () => {
    const first = MAPS[0];
    if (first === undefined) {
      throw new Error('First map missing');
    }

    let grid = replaceCell(first.grid, 9, 5, '#');
    grid = replaceCell(grid, 11, 5, '#');
    grid = replaceCell(grid, 10, 4, '#');
    grid = replaceCell(grid, 10, 6, '#');

    const checked = validateMap({ grid });
    expect(checked.ok).toBe(false);
    expect(checked.errors.some((error) => error.includes('Unreachable floor'))).toBe(true);
  });
});
