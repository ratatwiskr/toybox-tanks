import { CONFIG } from '../config';
import { canHit, firstTerrain, hasLineOfSight, rayCircle, reflect } from './collision';
import type { TerrainHit, WallHit } from './collision';
import { poof, record } from './feedback';
import { KINDS, MINE } from './kinds';
import { cellOf, passable } from './nav';
import { firstShellContact } from './shell-contact';
import type { Mine, Shell, SimulationEvent, Tank, World } from './types';

const MINE_OFFSET = 20;
const MINE_RECHARGE = 1.2;
const MINE_CHAIN_FUSE = 0.12;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function activeShells(world: World, owner: string): number {
  return world.shells.filter((shell) => !shell.dead && shell.owner === owner).length;
}

export function damage(world: World, tank: Tank, events?: SimulationEvent[]): boolean {
  if (!tank.alive || tank.invuln > 0) {
    return false;
  }

  tank.hp = Math.max(0, tank.hp - 1);
  tank.hurt = 0.25;
  record(world, `Hit · ${tank.id} · HP ${String(tank.hp)}`);
  poof(world, tank.x, tank.y, 'poof');

  if (tank.hp <= 0) {
    tank.alive = false;
    tank.charge = 0;
    record(world, `Disabled · ${tank.id}`);
  } else if (tank.faction === 'player') {
    tank.invuln = CONFIG.postHitInvulnerability;
  } else {
    tank.invuln = 0.2;
    tank.stun = 0.3;
    tank.charge = 0;
  }

  events?.push({ type: 'damage', faction: tank.faction, destroyed: !tank.alive });
  return true;
}

export function layMine(world: World, owner: Tank, x = owner.x, y = owner.y): Mine {
  let mineX = x;
  let mineY = y;
  // A placement inside terrain falls back to the owner's current position.
  if (!passable(world, cellOf(mineX, mineY))) {
    mineX = owner.x;
    mineY = owner.y;
  }

  world.nextMine += 1;
  const mine: Mine = {
    id: world.nextMine,
    owner,
    x: mineX,
    y: mineY,
    faction: owner.faction,
    armed: 0,
    dead: false,
  };
  world.mines.push(mine);
  return mine;
}

export function boom(world: World, mine: Mine, events?: SimulationEvent[]): void {
  if (mine.dead) {
    return;
  }

  mine.dead = true;
  poof(world, mine.x, mine.y, 'jack');
  poof(world, mine.x, mine.y, 'confetti');

  if (mine.owner.faction === 'player') {
    mine.owner.mineCooldown = MINE_RECHARGE;
  }

  for (const tank of [...world.players, ...world.enemies]) {
    if (!tank.alive || tank.faction === mine.faction) {
      continue;
    }
    if (Math.hypot(tank.x - mine.x, tank.y - mine.y) >= MINE.blast + tank.r * 0.4) {
      continue;
    }
    // The ground blast is blocked by permanent walls and solid corks.
    if (!hasLineOfSight(world, mine.x, mine.y, tank.x, tank.y)) {
      continue;
    }
    damage(world, tank, events);
  }

  for (const cork of world.corks) {
    if (cork.destroyed || cork.hitsRemaining <= 0) {
      continue;
    }
    const qx = clamp(mine.x, cork.x, cork.x + cork.w);
    const qy = clamp(mine.y, cork.y, cork.y + cork.h);
    if (Math.hypot(mine.x - qx, mine.y - qy) >= MINE.blast * 0.8) {
      continue;
    }
    cork.hitsRemaining = Math.max(0, cork.hitsRemaining - 1);
    cork.destroyed = cork.hitsRemaining === 0;
  }

  for (const other of world.mines) {
    if (other.dead || other === mine) {
      continue;
    }
    if (Math.hypot(other.x - mine.x, other.y - mine.y) >= MINE.blast) {
      continue;
    }
    other.fuse = other.fuse === undefined ? MINE_CHAIN_FUSE : Math.min(other.fuse, MINE_CHAIN_FUSE);
  }
}

export function updateMines(world: World, dt: number, events?: SimulationEvent[]): void {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }

  for (const mine of world.mines) {
    if (mine.dead) {
      continue;
    }

    mine.armed += dt;
    if (mine.fuse !== undefined) {
      mine.fuse -= dt;
      if (mine.fuse <= 0) {
        boom(world, mine, events);
        continue;
      }
    }

    const arm = mine.faction === 'player' ? MINE.armPlayer : MINE.arm;
    if (mine.armed < arm) {
      continue;
    }

    for (const tank of [...world.players, ...world.enemies]) {
      if (!tank.alive || tank.faction === mine.faction) {
        continue;
      }
      if (Math.hypot(tank.x - mine.x, tank.y - mine.y) < tank.r + MINE.r - 2) {
        boom(world, mine, events);
        break;
      }
    }
  }
}

export function altWeapon(world: World, player: Tank): void {
  if (!player.alive) {
    return;
  }

  const mine = world.mines.find((candidate) => candidate.owner === player && !candidate.dead);
  if (mine !== undefined) {
    boom(world, mine);
    return;
  }

  if (player.mineCooldown > 0) {
    return;
  }

  layMine(
    world,
    player,
    player.x - Math.cos(player.angle) * MINE_OFFSET,
    player.y - Math.sin(player.angle) * MINE_OFFSET,
  );
}

export function shoot(world: World, tank: Tank, events?: SimulationEvent[]): boolean {
  if (!tank.alive || tank.cooldown > 1e-8) {
    return false;
  }

  if (tank.faction === 'player' && activeShells(world, tank.id) >= CONFIG.activeShellLimit) {
    return false;
  }

  const kind = tank.faction === 'enemy' ? (tank.kind ?? 'sentry') : null;
  const shellFactor = kind === null ? 1 : KINDS[kind].shell;
  if (kind !== null && shellFactor <= 0) {
    return false;
  }
  const speed = CONFIG.shellSpeed * shellFactor;
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
  tank.cooldown = tank.faction === 'player' ? CONFIG.firingCooldown : KINDS[kind ?? 'sentry'].cd;
  world.shots += 1;
  events?.push({ type: 'shot', faction: tank.faction });
  // Sweep all the way out of the barrel, never spawn beyond nearby terrain.
  advanceShell(world, shell, 23, events);
  return true;
}

export function resolveShellCollisions(world: World, dt: number, events?: SimulationEvent[]): void {
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
    for (const mine of world.mines) {
      if (mine.dead || mine.faction === shell.faction) {
        continue;
      }
      const hit = rayCircle(shell.x, shell.y, dx, dy, { x: mine.x, y: mine.y, r: MINE.r });
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

    let hitMine: Mine | null = null;
    let mineHitT = Infinity;
    for (const mine of world.mines) {
      if (mine.dead || mine.faction === shell.faction) {
        continue;
      }
      const hit = rayCircle(shell.x, shell.y, dx, dy, { x: mine.x, y: mine.y, r: MINE.r });
      if (hit !== null && hit < mineHitT) {
        mineHitT = hit;
        hitMine = mine;
      }
    }

    if (
      hitMine !== null &&
      mineHitT < tankHitT - 1e-7 &&
      (terrain === null || mineHitT < terrain.t - 1e-7)
    ) {
      shell.x += dx * mineHitT;
      shell.y += dy * mineHitT;
      shell.dead = true;
      boom(world, hitMine, events);
      break;
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
