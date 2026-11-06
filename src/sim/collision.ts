import { CONFIG } from '../config';
import type { Shell, Tank, Wall, World } from './types';

export interface RayHit {
  readonly t: number;
  readonly nx: number;
  readonly ny: number;
  ambiguous: boolean;
}

export interface WallHit extends RayHit {
  readonly wall: Wall;
}

// Ray against a shell-radius-expanded AABB. Corner ties are deliberately
// reported as ambiguous so the caller can remove the shell instead of choosing
// an unstable or repeated reflection axis.
export function rayBox(
  x: number,
  y: number,
  dx: number,
  dy: number,
  box: Wall,
  radius = 0,
): RayHit | null {
  const loX = box.x - radius;
  const hiX = box.x + box.w + radius;
  const loY = box.y - radius;
  const hiY = box.y + box.h + radius;

  let near = -Infinity;
  let far = Infinity;
  let nx = 0;
  let ny = 0;
  let ambiguous = false;

  const testAxis = (p: number, d: number, lo: number, hi: number, axis: 0 | 1): boolean => {
    if (Math.abs(d) < 1e-10) {
      return p >= lo && p <= hi;
    }

    let a = (lo - p) / d;
    let b = (hi - p) / d;
    const normal = d > 0 ? -1 : 1;

    if (a > b) {
      [a, b] = [b, a];
    }

    if (a > near + 1e-7) {
      near = a;
      nx = axis === 0 ? normal : 0;
      ny = axis === 1 ? normal : 0;
      ambiguous = false;
    } else if (Math.abs(a - near) < 1e-7) {
      ambiguous = true;
    }

    far = Math.min(far, b);
    return near <= far + 1e-8;
  };

  if (!testAxis(x, dx, loX, hiX, 0) || !testAxis(y, dy, loY, hiY, 1)) {
    return null;
  }

  if (far < 0 || near > 1 || near < -1e-7) {
    return null;
  }

  return { t: Math.max(0, near), nx, ny, ambiguous };
}

export function firstWall(
  world: World,
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius = CONFIG.shellRadius,
): WallHit | null {
  let best: WallHit | null = null;

  for (const wall of world.walls) {
    const hit = rayBox(x, y, dx, dy, wall, radius);
    if (hit === null) {
      continue;
    }

    if (best === null || hit.t < best.t - 1e-7) {
      best = { ...hit, wall };
    } else if (Math.abs(hit.t - best.t) < 1e-7) {
      if (hit.ambiguous || hit.nx !== best.nx || hit.ny !== best.ny) {
        best.ambiguous = true;
      }
    }
  }

  return best;
}

export function rayCircle(x: number, y: number, dx: number, dy: number, tank: Tank): number | null {
  const ox = x - tank.x;
  const oy = y - tank.y;
  const radius = tank.r + CONFIG.shellRadius;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) {
    return 0;
  }

  const a = dx * dx + dy * dy;
  if (a < 1e-12) {
    return null;
  }

  const b = ox * dx + oy * dy;
  const discriminant = b * b - a * c;
  if (discriminant < 0) {
    return null;
  }

  const hit = (-b - Math.sqrt(discriminant)) / a;
  return hit >= 0 && hit <= 1 ? hit : null;
}

export function canHit(shell: Shell, tank: Tank): boolean {
  return tank.alive && shell.faction !== tank.faction;
}

export function reflect(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
): { readonly x: number; readonly y: number } {
  const dot = vx * nx + vy * ny;
  return { x: vx - 2 * dot * nx, y: vy - 2 * dot * ny };
}

// Tanks use a circular collision shape; axis-separated movement slides along
// walls. Small fixed-time substeps keep overlap correction stable.
export function moveTank(world: World, tank: Tank, dx: number, dy: number): void {
  const pieces = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 5));

  for (let piece = 0; piece < pieces; piece += 1) {
    for (const axis of ['x', 'y'] as const) {
      const amount = (axis === 'x' ? dx : dy) / pieces;
      tank[axis] += amount;

      for (let iteration = 0; iteration < 3; iteration += 1) {
        let adjusted = false;

        for (const wall of world.walls) {
          const qx = Math.max(wall.x, Math.min(tank.x, wall.x + wall.w));
          const qy = Math.max(wall.y, Math.min(tank.y, wall.y + wall.h));
          const ox = tank.x - qx;
          const oy = tank.y - qy;
          const distance = Math.hypot(ox, oy);

          if (distance < tank.r - 1e-8) {
            if (distance > 1e-8) {
              const push = tank.r - distance;
              tank.x += (ox / distance) * push;
              tank.y += (oy / distance) * push;
            } else {
              tank[axis] -= amount;
            }
            adjusted = true;
          }
        }

        if (!adjusted) {
          break;
        }
      }
    }
  }
}

export function hasLOS(world: World, a: Tank, b: Tank): boolean {
  return firstWall(world, a.x, a.y, b.x - a.x, b.y - a.y, CONFIG.shellRadius) === null;
}
