import { CONFIG } from '../config';
import { canHit, firstWall, rayCircle, reflect } from './collision';
import type { WallHit } from './collision';
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

  world.shells.push(shell);
  tank.cooldown = tank.faction === 'player' ? CONFIG.firingCooldown : CONFIG.enemyFiringInterval;
  world.shots += 1;
  // Sweep all the way out of the barrel, never spawn beyond a nearby wall.
  advanceShell(world, shell, 23);
  return true;
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
    const wall = firstWall(world, shell.x, shell.y, dx, dy);

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

    if (hitTank !== null && (wall === null || tankHitT < wall.t - 1e-7)) {
      shell.x += dx * tankHitT;
      shell.y += dy * tankHitT;
      damage(world, hitTank);
      shell.dead = true;
      break;
    }

    if (wall === null) {
      shell.x += dx;
      shell.y += dy;
      remaining = 0;
      break;
    }

    shell.x += dx * wall.t;
    shell.y += dy * wall.t;
    remaining *= 1 - wall.t;

    if (!shellWallContact(world, shell, wall)) {
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
