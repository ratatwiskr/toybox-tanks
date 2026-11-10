import { CONFIG } from '../config';
import { canHit, firstTerrain, rayCircle, reflect } from './collision';
import type { TerrainHit, WallHit } from './collision';
import { poof, record } from './feedback';
import { firstShellContact } from './shell-contact';
import type { Shell, SimulationEvent, Tank, World } from './types';

export function activeShells(world: World, owner: string): number {
  return world.shells.filter((shell) => !shell.dead && shell.owner === owner).length;
}

export function damage(world: World, tank: Tank, events?: SimulationEvent[]): boolean {
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

  events?.push({ type: 'damage', faction: tank.faction, destroyed: !tank.alive });
  return true;
}

export function shoot(world: World, tank: Tank, events?: SimulationEvent[]): boolean {
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

  world.shells.push(shell);
  tank.cooldown = tank.faction === 'player' ? CONFIG.firingCooldown : CONFIG.enemyFiringInterval;
  world.shots += 1;
  events?.push({ type: 'shot', faction: tank.faction });
  // Sweep all the way out of the barrel, never spawn beyond nearby terrain.
  advanceShell(world, shell, 23, events);
  return true;
}

export function resolveShellCollisions(
  world: World,
  dt: number,
  events?: SimulationEvent[],
): void {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }

  const live = world.shells.filter((shell) => !shell.dead).sort((a, b) => a.id - b.id);
  if (live.length < 2) {
    return;
  }

  // Terrain/tank fractions and pair fractions use the same normalized step.
  // Infinity distinguishes no obstacle from an obstacle exactly at step end.
  const limits = new Map<number, number>();
  for (const shell of live) {
    const dx = shell.vx * dt;
    const dy = shell.vy * dt;
    let limit = Infinity;
    const terrain = firstTerrain(world, shell.x, shell.y, dx, dy);
    if (terrain !== null) {
      limit = terrain.t;
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
      const t = firstShellContact(a, b, dt);
      const limit = Math.min(limits.get(a.id) ?? 0, limits.get(b.id) ?? 0);
      // Preserve conservative terrain/tank priority for nearly equal times.
      if (t !== null && t < limit - 1e-7) {
        candidates.push({ a, b, t });
      }
    }
  }

  candidates.sort(
    (left, right) => left.t - right.t || left.a.id - right.a.id || left.b.id - right.b.id,
  );

  for (const { a, b, t } of candidates) {
    if (a.dead || b.dead) {
      continue;
    }
    a.dead = true;
    b.dead = true;
    events?.push({ type: 'terrain', kind: 'shellCollision' });
    poof(
      world,
      (a.x + a.vx * dt * t + b.x + b.vx * dt * t) / 2,
      (a.y + a.vy * dt * t + b.y + b.vy * dt * t) / 2,
      'poof',
    );
    record(world, 'Shells collided');
  }
}

export function shellWallContact(
  world: World,
  shell: Shell,
  hit: WallHit,
  events?: SimulationEvent[],
): boolean {
  if (hit.ambiguous || shell.bounces >= 1) {
    events?.push({ type: 'terrain', kind: 'wall' });
    shell.dead = true;
    poof(world, shell.x, shell.y, 'spark');
    return false;
  }

  const velocity = reflect(shell.vx, shell.vy, hit.nx, hit.ny);
  shell.vx = velocity.x;
  shell.vy = velocity.y;
  shell.bounces += 1;
  world.bounces += 1;
  events?.push({ type: 'terrain', kind: 'bounce' });
  shell.x += hit.nx * CONFIG.separationEpsilon;
  shell.y += hit.ny * CONFIG.separationEpsilon;
  poof(world, shell.x, shell.y, 'spark');
  record(world, `Bounce · ${shell.owner}`);
  return true;
}

function shellTerrainContact(
  world: World,
  shell: Shell,
  hit: TerrainHit,
  events?: SimulationEvent[],
): boolean {
  if (hit.kind === 'wall') {
    return shellWallContact(world, shell, hit, events);
  }

  shell.dead = true;
  events?.push({ type: 'terrain', kind: 'cork' });
  if (!hit.ambiguous) {
    hit.cork.hitsRemaining = Math.max(0, hit.cork.hitsRemaining - 1);
    hit.cork.destroyed = hit.cork.hitsRemaining === 0;
  }
  return false;
}

export function advanceShell(
  world: World,
  shell: Shell,
  distance: number,
  events?: SimulationEvent[],
): void {
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
      damage(world, hitTank, events);
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

    if (!shellTerrainContact(world, shell, terrain, events)) {
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
