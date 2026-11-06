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
}

// Exactly CONFIG.columns × CONFIG.rows. # = solid wooden block; . = floor;
// 1/2 = player spawns; S = stationary sentry. Every room has one 1 and one 2.
export const MAPS: readonly MapData[] = [
  {
    name: 'First Bounce',
    hint: 'Try the outer rails: every shell gets one bounce.',
    expectedEnemies: 2,
    grid: `########################
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
  },
  {
    name: 'Block Party',
    hint: 'Take different routes. Corners are cover, not dead ends.',
    expectedEnemies: 3,
    grid: `########################
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
  },
  {
    name: 'Together Through',
    hint: 'Cover each other. Either surviving player can finish.',
    expectedEnemies: 4,
    grid: `########################
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
  },
];

export function validateMap(
  data: Pick<MapData, 'grid'> & Partial<Pick<MapData, 'expectedEnemies'>>,
): MapValidation {
  const errors: string[] = [];
  const rows = data.grid.trim().split(/\r?\n/);
  const counts = { '1': 0, '2': 0, S: 0 };

  if (rows.length !== CONFIG.rows) {
    errors.push(`Expected ${String(CONFIG.rows)} rows, got ${String(rows.length)}.`);
  }

  rows.forEach((row, y) => {
    if (row.length !== CONFIG.columns) {
      errors.push(
        `Row ${String(y + 1)}: expected ${String(CONFIG.columns)} cells, got ${String(row.length)}.`,
      );
    }

    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (cell === undefined) {
        continue;
      }

      if (!'#.12S'.includes(cell)) {
        errors.push(`Unknown symbol "${cell}" at row ${String(y + 1)}, column ${String(x + 1)}.`);
      }

      if (cell === '1' || cell === '2' || cell === 'S') {
        counts[cell] += 1;
      }

      const isBorder = y === 0 || y === CONFIG.rows - 1 || x === 0 || x === CONFIG.columns - 1;
      if (isBorder && cell !== '#') {
        errors.push(`Open border at row ${String(y + 1)}, column ${String(x + 1)}.`);
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

  // Every non-wall tile must be reachable from player 1, including the other spawn.
  if (errors.length === 0) {
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
      const row = rows[y];
      if (visited.has(key) || row === undefined) {
        continue;
      }

      const cell = row[x];
      if (cell === undefined || cell === '#') {
        continue;
      }

      visited.add(key);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const cell = row[x];
        if (cell !== undefined && cell !== '#' && !visited.has(`${String(x)},${String(y)}`)) {
          errors.push(`Unreachable floor at row ${String(y + 1)}, column ${String(x + 1)}.`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, rows };
}
