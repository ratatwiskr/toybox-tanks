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
// Cork appears in several later campaign rooms.
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
    name: 'The Courtyard',
    hint: 'Use the staggered cork blocks for soft cover before advancing.',
    expectedEnemies: 2,
    grid: `......................
....S............S....
...CCC......CCC.......
...C........C.........
......................
.....########.........
......................
.....C......C.........
...CCC......CCC.......
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
  {
    name: 'Crossfire Alley',
    hint: 'Coordinate with your partner to cross-fire across parallel corridors.',
    expectedEnemies: 4,
    grid: `..S................S..
...##...##...##...##..
...##...##...##...##..
......................
..CCCC........CCCC....
......S......S........
..CCCC........CCCC....
......................
...##...##...##...##..
...1..............2...
......................`,
  },
  {
    name: 'Pillars of Salt',
    hint: 'Use the isolated blocks to set up steep ricochet angles.',
    expectedEnemies: 6,
    grid: `......................
....S...#....#...S....
........#....#........
..#........#........#.
......C........C......
......C...S.S..C......
......C........C......
..#........#........#.
........#....#........
....S...#....#...S....
...1..............2...`,
  },
  {
    name: 'Choke Point',
    hint: 'Control the central gap before breaking into the enemy side.',
    expectedEnemies: 4,
    grid: `..S................S..
......................
...####.........####..
...#...............#..
...#......S.S......#..
...#......CCC......#..
...#......CCC......#..
...#...............#..
...####.........####..
......................
...1..............2...`,
  },
  {
    name: 'Cork Sieve',
    hint: 'Carve your own firing lanes through the destructible wall.',
    expectedEnemies: 4,
    grid: `..S...S........S...S..
......................
......................
.CCCCCCCCCCCCCCCCCCCC.
.CCCCCCCCCCCCCCCCCCCC.
......................
......................
......##........##....
......##........##....
......................
...1..............2...`,
  },
  {
    name: 'The Fortress',
    hint: 'Chip away at the multi-hit cork walls to force open a breach.',
    expectedEnemies: 6,
    grid: `..S...S....S...S......
..CCCCCCCCCCCCCCCC....
..C..............C....
..C..CCCCCCCCCC..C....
.....#........#.......
.....#...S.S..#.......
.....#........#.......
..C..##########..C....
..C..............C....
...1..............2...
......................`,
  },
  {
    name: 'Spiral',
    hint: 'Work your way inward, or bank a shell over the cork core.',
    expectedEnemies: 4,
    grid: `......................
..S...############....
......#..........#....
..#...#...CCC....#...S
..#...#...CSC....#....
..#...#...CCC....#....
..#...#..........#....
..#...#####..#####....
..#...................
........S.............
...1..............2...`,
  },
  {
    name: 'Double Bunker',
    hint: 'Clear the cork guards to safely breach each flank.',
    expectedEnemies: 6,
    grid: `..S...S........S...S..
..CCCCC........CCCCC..
..C...C........C...C..
..C.S.C...##...C.S.C..
..CCCCC...##...CCCCC..
......................
........######........
......................
...##............##...
......................
...1..............2...`,
  },
  {
    name: 'The Labyrinth',
    hint: 'Bounce shots around outer walls to hit enemies safely tucked inside.',
    expectedEnemies: 4,
    grid: `..S................S..
...#.CCCC....CCCC.#...
...#.C..........C.#...
.....C.##.##.##.C.....
.####..#......#..####.
.......#.S..S.#.......
.####..#......#..####.
.....C.##.##.##.C.....
...#.C..........C.#...
...1..............2...
......................`,
  },
  {
    name: 'The Gauntlet',
    hint: 'Divide forces: one clears the wings, the other holds the middle.',
    expectedEnemies: 5,
    grid: `..S................S..
..#.....S.S.S......#..
..#...CCCCCCCCC....#..
..#...C.......C....#..
......C.......C.......
......C.......C.......
......C.......C.......
..#...CCCCCCCCC....#..
..#................#..
......................
...1..............2...`,
  },
  {
    name: 'Ring of Fire',
    hint: 'Enemies completely surround you. Stay mobile and use minimal cover.',
    expectedEnemies: 9,
    grid: `..S...S....S...S...S..
..C...#...C..C...#...C
......................
...##..............##.
...##...S......S...##.
........C......C......
...##...S......S...##.
...##..............##.
......................
..C...#...C..C...#...C
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
    if (visited.has(key) || cell === undefined || cell === '#' || (corkBlocks && cell === 'C')) {
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
    errors.push(`Expected ${String(MAP_INTERIOR_ROWS)} interior rows, got ${String(rows.length)}.`);
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
        if (cell !== undefined && cell !== '#' && !cleared.has(`${String(x)},${String(y)}`)) {
          errors.push(`Unreachable floor at row ${String(y + 1)}, column ${String(x + 1)}.`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, rows, initiallyReachable };
}
