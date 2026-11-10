import { CONFIG } from '../config';
import { canHit, firstTerrain, rayCircle, reflect } from './collision';
import type { TerrainHit, WallHit } from './collision';
import { poof, record } from './feedback';
import type { Shell, Tank, World } from './types';

export function activeShells(world: World, owner: string): number {
  return world.shells.filter((shell) => !shell.dead && shell.owner === owner).length;
}

export function damage(world: World, tank: Tank): boolean {
  if (!tank.alive || tank.invuln > 0) {
    return false;
  }

  tank.hp = Math.max(0, tank.hp - 1);
  record(world, `Hit · ${tank.id} · HP ${String(tank.hp)}`);
  poof(world, tank.x, tank.y, 'poof');

  if (tank.hp <= 0) {
    tank.alive = false;
    tank.charge = 0;
    record(world, `Disabled · ${tank.id}`);
  } else {
    tank.invuln = CONFIG.postHitInvulnerability;
  }

  return true;
}

export function shoot(world: World, tank: Tank): boolean {
  if (!tank.alive || tank.cooldown > 1e-8) {
    return false;
  }

  if (tank.faction === 'player' && activeShells(world, tank.id) >= CONFIG.activeShellLimit) {
    return false;
  }

  const speed = CONFIG.shellSpeed * (tank.faction === 'enemy' ? CONFIG.enemyShellSpeedFactor : 1);
  world.nextShell += 1;
  const shell: Shell = {
    id: world.nextShell,
    owner: tank.id,
    faction: tank.faction,
    x: tank.x,
    y: tank.y,
    vx: Math.cos(tank.angle) * speed,
    vy: Math.sin(tank.angle) * speed,
    bounces: 0,
    dead: false,
  };

  const spawnX = tank.x;
  const spawnY = tank.y;
  world.shells.push(shell);
  tank.cooldown = tank.faction === 'player' ? CONFIG.firingCooldown : CONFIG.enemyFiringInterval;
  world.shots += 1;
  // Sweep all the way out of the barrel, never spawn beyond nearby terrain.
  advanceShell(world, shell, 23);
  muzzleShellContact(world, shell, spawnX, spawnY);
  return true;
}

function segmentPointDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared < 1e-12) {
    return Math.hypot(apx, apy);
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lengthSquared));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

// The muzzle sweep is short (23 px) and other shells have not advanced yet in
// this step, so a segment-to-point check against their current position is a
// bounded, conservative approximation of the swept interaction.
function muzzleShellContact(world: World, shell: Shell, spawnX: number, spawnY: number): void {
  if (shell.dead) {
    return;
  }
  for (const other of world.shells) {
    if (other === shell || other.dead) {
      continue;
    }
    const distance = segmentPointDistance(spawnX, spawnY, shell.x, shell.y, other.x, other.y);
    if (distance <= CONFIG.shellRadius * 2) {
      shell.dead = true;
      other.dead = true;
      poof(world, (shell.x + other.x) / 2, (shell.y + other.y) / 2, 'spark');
      record(world, 'Shells collided');
      return;
    }
  }
}

export function resolveShellCollisions(world: World, dt: number): void {
  const live = world.shells.filter((shell) => !shell.dead);
  if (live.length < 2) {
    return;
  }

  // Cap each shell's segment at its first terrain or tank contact so a wall,
  // cork, or tank hit earlier in the step wins over a shell-shell collision.
  const limits = new Map<number, number>();
  for (const shell of live) {
    const speed = Math.hypot(shell.vx, shell.vy);
    if (speed < 1e-7) {
      limits.set(shell.id, 0);
      continue;
    }
    const dx = shell.vx * dt;
    const dy = shell.vy * dt;
    let limit = 1;
    const terrain = firstTerrain(world, shell.x, shell.y, dx, dy);
    if (terrain !== null) {
      limit = Math.min(limit, terrain.t);
    }
    for (const tank of [...world.players, ...world.enemies]) {
      if (!canHit(shell, tank)) {
        continue;
      }
      const hit = rayCircle(shell.x, shell.y, dx, dy, tank);
      if (hit !== null) {
        limit = Math.min(limit, hit);
      }
    }
    limits.set(shell.id, limit);
  }

  interface Candidate {
    readonly a: Shell;
    readonly b: Shell;
    readonly t: number;
  }

  const candidates: Candidate[] = [];
  for (let i = 0; i < live.length; i += 1) {
    const a = live[i];
    if (a === undefined) {
      continue;
    }
    for (let j = i + 1; j < live.length; j += 1) {
      const b = live[j];
      if (b === undefined) {
        continue;
      }
      const limit = Math.min(limits.get(a.id) ?? 0, limits.get(b.id) ?? 0);
      if (limit <= 0) {
        continue;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const denom = rvx * rvx + rvy * rvy;
      let t = 0;
      if (denom > 1e-12) {
        t = -(dx * rvx + dy * rvy) / denom;
        t = Math.max(0, Math.min(1, t));
      }
      const closestX = dx + rvx * t;
      const closestY = dy + rvy * t;
      if (Math.hypot(closestX, closestY) <= CONFIG.shellRadius * 2 && (t < limit || limit >= 1)) {
        candidates.push({ a, b, t });
      }
    }
  }

  // Earliest contact first; shell id breaks ties so the result does not depend
  // on the shell array order.
  candidates.sort((left, right) => left.t - right.t || left.a.id - right.a.id);

  const collided = new Set<number>();
  for (const candidate of candidates) {
    if (collided.has(candidate.a.id) || collided.has(candidate.b.id)) {
      continue;
    }
    collided.add(candidate.a.id);
    collided.add(candidate.b.id);
    poof(
      world,
      candidate.a.x + candidate.a.vx * dt * candidate.t,
      candidate.a.y + candidate.a.vy * dt * candidate.t,
      'spark',
    );
    record(world, 'Shells collided');
  }

  for (const shell of live) {
    if (collided.has(shell.id)) {
      shell.dead = true;
    }
  }
}

export function shellWallContact(world: World, shell: Shell, hit: WallHit): boolean {
  if (hit.ambiguous || shell.bounces >= 1) {
    shell.dead = true;
    poof(world, shell.x, shell.y, 'spark');
    return false;
  }

  const velocity = reflect(shell.vx, shell.vy, hit.nx, hit.ny);
  shell.vx = velocity.x;
  shell.vy = velocity.y;
  shell.bounces += 1;
  world.bounces += 1;
  shell.x += hit.nx * CONFIG.separationEpsilon;
  shell.y += hit.ny * CONFIG.separationEpsilon;
  poof(world, shell.x, shell.y, 'spark');
  record(world, `Bounce · ${shell.owner}`);
  return true;
}

function shellTerrainContact(world: World, shell: Shell, hit: TerrainHit): boolean {
  if (hit.kind === 'wall') {
    return shellWallContact(world, shell, hit);
  }

  shell.dead = true;
  if (!hit.ambiguous) {
    hit.cork.hitsRemaining = Math.max(0, hit.cork.hitsRemaining - 1);
    hit.cork.destroyed = hit.cork.hitsRemaining === 0;
  }
  return false;
}

export function advanceShell(world: World, shell: Shell, distance: number): void {
  let remaining = distance;
  let contacts = 0;

  while (remaining > 1e-7 && !shell.dead && contacts < CONFIG.maxProjectileContacts) {
    contacts += 1;

    const speed = Math.hypot(shell.vx, shell.vy);
    if (speed < 1e-7) {
      shell.dead = true;
      break;
    }

    const dx = (shell.vx / speed) * remaining;
    const dy = (shell.vy / speed) * remaining;
    const terrain = firstTerrain(world, shell.x, shell.y, dx, dy);

    let hitTank: Tank | null = null;
    let tankHitT = Infinity;

    for (const tank of [...world.players, ...world.enemies]) {
      if (!canHit(shell, tank)) {
        continue;
      }

      const hit = rayCircle(shell.x, shell.y, dx, dy, tank);
      if (hit !== null && hit < tankHitT) {
        tankHitT = hit;
        hitTank = tank;
      }
    }

    if (hitTank !== null && (terrain === null || tankHitT < terrain.t - 1e-7)) {
      shell.x += dx * tankHitT;
      shell.y += dy * tankHitT;
      damage(world, hitTank);
      shell.dead = true;
      break;
    }

    if (terrain === null) {
      shell.x += dx;
      shell.y += dy;
      remaining = 0;
      break;
    }

    shell.x += dx * terrain.t;
    shell.y += dy * terrain.t;
    remaining *= 1 - terrain.t;

    if (!shellTerrainContact(world, shell, terrain)) {
      break;
    }
  }

  if (remaining > 1e-7 && !shell.dead) {
    shell.dead = true;
  }

  if (shell.x < 0 || shell.x > CONFIG.width || shell.y < 0 || shell.y > CONFIG.height) {
    shell.dead = true;
  }
}
