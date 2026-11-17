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

const TAU = Math.PI * 2;

function normalizeAngle(a: number): number {
  return ((a % TAU) + TAU) % TAU;
}

// Scan a full circle for one-bounce paths that reach the target, group adjacent
// firing angles, and aim at the centre of the widest group (shortest path wins
// ties). This is the prototype's bank search, re-expressed over the sim's
// structural terrain queries.
export function solveBank(world: World, shooter: Tank, target: Tank): BankSolution | null {
  const leadTarget = { x: target.x, y: target.y, r: target.r, vx: target.vx, vy: target.vy };
  const candidates: BankSolution[] = [];
  for (const g of ghosts(world, leadTarget)) {
    const t = { ...leadTarget, x: g.x, y: g.y };
    for (let i = 0; i < 360; i += 1) {
      const angle = (i / 360) * TAU;
      const sol = solveBankAt(world, shooter, t, angle);
      if (sol !== null) candidates.push(sol);
    }
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => normalizeAngle(a.angle) - normalizeAngle(b.angle));
  const gap = (TAU / 180) * 2.5;
  const groups: BankSolution[][] = [];
  let group: BankSolution[] = [];
  for (const sol of candidates) {
    const prev = group[group.length - 1];
    if (prev !== undefined && normalizeAngle(sol.angle) - normalizeAngle(prev.angle) > gap) {
      groups.push(group);
      group = [];
    }
    group.push(sol);
  }
  if (group.length > 0) groups.push(group);

  // Merge the first and last groups when the scan wraps past 2*pi.
  const firstGroup = groups[0];
  const lastGroup = groups[groups.length - 1];
  if (firstGroup !== undefined && lastGroup !== undefined && firstGroup !== lastGroup) {
    const firstAngle = firstGroup[0]?.angle;
    const lastAngle = lastGroup[lastGroup.length - 1]?.angle;
    if (firstAngle !== undefined && lastAngle !== undefined) {
      const wrapDiff = normalizeAngle(firstAngle) + TAU - normalizeAngle(lastAngle);
      if (wrapDiff <= gap) {
        groups[0] = [...lastGroup, ...firstGroup];
        groups.pop();
      }
    }
  }

  let bestGroup: BankSolution[] | null = null;
  let bestWidth = -Infinity;
  let bestScore = Infinity;
  for (const g of groups) {
    const angles = g.map((s) => normalizeAngle(s.angle)).sort((a, b) => a - b);
    const lo = angles[0];
    const hi = angles[angles.length - 1];
    if (lo === undefined || hi === undefined) continue;
    let width = hi - lo;
    if (g.length > 1 && width < 0) width += TAU;
    const score = Math.min(...g.map((s) => s.score));
    if (width > bestWidth + 1e-9 || (Math.abs(width - bestWidth) <= 1e-9 && score < bestScore)) {
      bestWidth = width;
      bestScore = score;
      bestGroup = g;
    }
  }
  if (bestGroup === null) return null;

  // Aim at the middle of the group's angular span.
  const sorted = [...bestGroup].sort((a, b) => normalizeAngle(a.angle) - normalizeAngle(b.angle));
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
}
