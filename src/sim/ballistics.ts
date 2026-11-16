import { CONFIG } from '../config';
import { firstTerrain, rayCircle } from './collision';
import { reflect } from './collision';
import type { BankSolution, Point, Tank, TraceSegment, TraceTarget, World } from './types';

export function hasLineOfSight(
  world: World,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return firstTerrain(world, ax, ay, bx - ax, by - ay, CONFIG.shellRadius) === null;
}

export function trace(
  world: World,
  x: number,
  y: number,
  angle: number,
  length: number,
  target?: TraceTarget,
): { segments: TraceSegment[]; hit: boolean } {
  let cx = x;
  let cy = y;
  let vx = Math.cos(angle);
  let vy = Math.sin(angle);
  let remaining = length;
  let bounces = 0;
  const segments: TraceSegment[] = [];
  for (let i = 0; i < 4 && remaining > 1e-6; i += 1) {
    const dx = vx * remaining;
    const dy = vy * remaining;
    const terrain = firstTerrain(world, cx, cy, dx, dy);
    let targetT = Infinity;
    if (target !== undefined) {
      const hit = rayCircle(cx, cy, dx, dy, target);
      if (hit !== null) targetT = hit;
    }
    if (terrain !== null && terrain.t < targetT - 1e-7) {
      const nx = cx + dx * terrain.t;
      const ny = cy + dy * terrain.t;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      if (terrain.kind !== 'wall' || terrain.ambiguous || bounces >= 1) {
        return { segments, hit: false };
      }
      const r = reflect(vx, vy, terrain.nx, terrain.ny);
      vx = r.x;
      vy = r.y;
      cx = nx + terrain.nx * CONFIG.separationEpsilon;
      cy = ny + terrain.ny * CONFIG.separationEpsilon;
      remaining *= 1 - terrain.t;
      bounces += 1;
      continue;
    }
    if (target !== undefined && targetT <= 1) {
      const nx = cx + dx * targetT;
      const ny = cy + dy * targetT;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      return { segments, hit: true };
    }
    segments.push({ x1: cx, y1: cy, x2: cx + dx, y2: cy + dy });
    remaining = 0;
  }
  return { segments, hit: false };
}

export function ghosts(_world: World, target: Point & { vx?: number; vy?: number }): Point[] {
  const lead = 0.35;
  const tx = target.x + (target.vx ?? 0) * lead;
  const ty = target.y + (target.vy ?? 0) * lead;
  return [{ x: tx, y: ty }];
}

export function solveBankAt(
  world: World,
  shooter: Tank,
  target: TraceTarget & { vx?: number; vy?: number },
  angle: number,
): BankSolution | null {
  const tr = trace(world, shooter.x, shooter.y, angle, 1200, target);
  if (!tr.hit || tr.segments.length !== 2) return null;
  return {
    angle,
    segments: tr.segments,
    score: tr.segments.reduce((s, seg) => s + Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1), 0),
  };
}

export function solveBank(world: World, shooter: Tank, target: Tank): BankSolution | null {
  let best: BankSolution | null = null;
  const leadTarget = { x: target.x, y: target.y, r: target.r, vx: target.vx, vy: target.vy };
  for (const g of ghosts(world, leadTarget)) {
    const t = { ...leadTarget, x: g.x, y: g.y };
    for (let i = 0; i < 72; i += 1) {
      const angle = (i / 72) * Math.PI * 2;
      const sol = solveBankAt(world, shooter, t, angle);
      if (sol !== null && (best === null || sol.score < best.score)) best = sol;
    }
  }
  return best;
}
