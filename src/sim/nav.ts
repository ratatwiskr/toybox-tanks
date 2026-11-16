import { CONFIG } from '../config';
import { isSolidCork } from './collision';
import type { Point, Tank, World } from './types';

export function cellOf(x: number, y: number): Point {
  return {
    x: Math.max(0, Math.min(CONFIG.columns - 1, Math.floor(x / CONFIG.tile))),
    y: Math.max(0, Math.min(CONFIG.rows - 1, Math.floor((y - CONFIG.gridY) / CONFIG.tile))),
  };
}

export function centerOf(cell: Point): Point {
  return {
    x: cell.x * CONFIG.tile + CONFIG.tile / 2,
    y: CONFIG.gridY + cell.y * CONFIG.tile + CONFIG.tile / 2,
  };
}

export function passable(world: World, cell: Point): boolean {
  const x = cell.x * CONFIG.tile;
  const y = CONFIG.gridY + cell.y * CONFIG.tile;
  if (x < 0 || y < 0 || x + CONFIG.tile > CONFIG.width || y + CONFIG.tile > CONFIG.height) {
    return false;
  }
  for (const wall of world.walls) {
    if (wall.x === x && wall.y === y) return false;
  }
  for (const cork of world.corks) {
    if (isSolidCork(cork) && cork.x === x && cork.y === y) return false;
  }
  return true;
}

function key(cell: Point): string {
  return `${String(cell.x)},${String(cell.y)}`;
}

export function bfs(world: World, start: Point, goal: (cell: Point) => boolean): Point[] | null {
  const queue: Point[] = [start];
  const came = new Map<string, Point | null>([[key(start), null]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (goal(current)) {
      const path: Point[] = [];
      let cur: Point | null = current;
      while (cur !== null) {
        path.push(centerOf(cur));
        cur = came.get(key(cur)) ?? null;
      }
      path.reverse();
      return path;
    }
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const next = { x: current.x + d.x, y: current.y + d.y };
      const k = key(next);
      if (came.has(k) || !passable(world, next)) continue;
      came.set(k, current);
      queue.push(next);
    }
  }
  return null;
}

export function pathTo(world: World, from: Point, to: Point): Point[] {
  const target = { x: to.x, y: to.y };
  if (!passable(world, target)) return [];
  return bfs(world, from, (cell) => cell.x === target.x && cell.y === target.y) ?? [];
}

export function planPatrol(world: World, tank: Tank): Point[] {
  const start = cellOf(tank.x, tank.y);
  const candidates: Point[] = [];
  for (let y = 0; y < CONFIG.rows; y += 1) {
    for (let x = 0; x < CONFIG.columns; x += 1) {
      const cell = { x, y };
      if (!passable(world, cell)) continue;
      if (Math.abs(x - start.x) + Math.abs(y - start.y) < 3) continue;
      candidates.push(cell);
    }
  }
  if (candidates.length === 0) return [];
  const pick =
    candidates[Math.floor(((tank.phase * 1000) % 1) * candidates.length)] ?? candidates[0];
  if (pick === undefined) return [];
  return pathTo(world, start, pick);
}

export function fleePath(world: World, tank: Tank, from: Point): Point[] {
  const start = cellOf(tank.x, tank.y);
  const threat = cellOf(from.x, from.y);
  const path = bfs(world, start, (cell) => {
    const d = Math.abs(cell.x - threat.x) + Math.abs(cell.y - threat.y);
    return d >= 6 && (cell.x !== start.x || cell.y !== start.y);
  });
  return path ?? [];
}
