import { CONFIG } from '../config';

export interface MapData {
  readonly name: string;
  readonly hint: string;
  readonly expectedEnemies: number;
  readonly grid: string;
}

export interface MapValidation {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly rows: readonly string[];
  // Informational, not an error: destruction may be needed to open a route.
  readonly initiallyReachable: boolean;
}

export const MAP_INTERIOR_COLUMNS = CONFIG.columns - 2;
export const MAP_INTERIOR_ROWS = CONFIG.rows - 2;

// Authored grids contain only the interior. # = wood; C = three-hit cork;
// . = floor; 1/2 = player spawns; S = stationary sentry. The border is automatic.
// Cork appears in the fourth campaign room.
export const MAPS: readonly MapData[] = [
  {
    name: 'First Bounce',
    hint: 'Try the outer rails: every shell gets one bounce.',
    expectedEnemies: 2,
    grid: `......................
......................
...S..##.....##...S...
......##.....##.......
......................
......................
.........####.........
......................
......................
...1..............2...
......................`,
  },
  {
    name: 'Block Party',
    hint: 'Take different routes. Corners are cover, not dead ends.',
    expectedEnemies: 3,
    grid: `......................
..S......#..S.........
....#....#........#...
....#....#....#...#...
....#....#....#...#...
....#.........#...#...
....#.........#.......
........###...#.....S.
......................
..1..............2....
......................`,
  },
  {
    name: 'Together Through',
    hint: 'Cover each other. Either surviving player can finish.',
    expectedEnemies: 4,
    grid: `......................
..S..........S........
.........#.....###..S.
...###...#............
.........#............
.........#............
..................#...
.....###.....###..#...
...........S......#...
..1.................2.
......................`,
  },
  {
    name: 'Cork Keep',
    hint: 'Break the cork to reach the guarded tower.',
    expectedEnemies: 5,
    grid: `......................
..S................S..
......................
...##..........##.....
...##...CCC....##.....
........CSC...........
...##...CCC....##.....
...##..........##.....
..S................S..
......................
...1..............2...`,
  },
];

export function addMapBorder(rows: readonly string[]): string[] {
  const border = '#'.repeat(CONFIG.columns);
  return [border, ...rows.map((row) => `#${row}#`), border];
}

function reachableCells(rows: readonly string[], corkBlocks: boolean): Set<string> {
  const visited = new Set<string>();
  const stack: Array<readonly [number, number]> = [];

  rows.forEach((row, y) => {
    const x = row.indexOf('1');
    if (x >= 0) {
      stack.push([x, y]);
    }
  });

  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined) {
      break;
    }

    const [x, y] = next;
    const key = `${String(x)},${String(y)}`;
    const cell = rows[y]?.[x];
    if (
      visited.has(key) ||
      cell === undefined ||
      cell === '#' ||
      (corkBlocks && cell === 'C')
    ) {
      continue;
    }

    visited.add(key);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return visited;
}

export function validateMap(
  data: Pick<MapData, 'grid'> & Partial<Pick<MapData, 'expectedEnemies'>>,
): MapValidation {
  const errors: string[] = [];
  const rows = data.grid.trim().split(/\r?\n/);
  const counts = { '1': 0, '2': 0, S: 0 };
  let initiallyReachable = false;

  if (rows.length !== MAP_INTERIOR_ROWS) {
    errors.push(
      `Expected ${String(MAP_INTERIOR_ROWS)} interior rows, got ${String(rows.length)}.`,
    );
  }

  rows.forEach((row, y) => {
    if (row.length !== MAP_INTERIOR_COLUMNS) {
      errors.push(
        `Row ${String(y + 1)}: expected ${String(MAP_INTERIOR_COLUMNS)} interior cells, got ${String(row.length)}.`,
      );
    }

    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (cell === undefined) {
        continue;
      }

      if (!'#C.12S'.includes(cell)) {
        errors.push(`Unknown symbol "${cell}" at row ${String(y + 1)}, column ${String(x + 1)}.`);
      }
      if (cell === '1' || cell === '2' || cell === 'S') {
        counts[cell] += 1;
      }
    }
  });

  for (const spawn of ['1', '2'] as const) {
    if (counts[spawn] !== 1) {
      errors.push(`Need exactly one player ${spawn} spawn; found ${String(counts[spawn])}.`);
    }
  }

  if (counts.S < 1) {
    errors.push('At least one sentry is required.');
  }
  if (data.expectedEnemies !== undefined && counts.S !== data.expectedEnemies) {
    errors.push(`Expected ${String(data.expectedEnemies)} sentries; found ${String(counts.S)}.`);
  }

  if (errors.length === 0) {
    const initial = reachableCells(rows, true);
    initiallyReachable = rows.every((row, y) =>
      Array.from(row).every(
        (cell, x) => cell === '#' || cell === 'C' || initial.has(`${String(x)},${String(y)}`),
      ),
    );

    // Acceptance requires all non-wall cells, including cork cells, to be
    // reachable after destruction. An initial cork-blocked route is allowed.
    const cleared = reachableCells(rows, false);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const cell = row[x];
        if (
          cell !== undefined &&
          cell !== '#' &&
          !cleared.has(`${String(x)},${String(y)}`)
        ) {
          errors.push(`Unreachable floor at row ${String(y + 1)}, column ${String(x + 1)}.`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, rows, initiallyReachable };
}
