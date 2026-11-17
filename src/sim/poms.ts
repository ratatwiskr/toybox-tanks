import { CONFIG } from '../config';
import { hasLineOfSight } from './collision';
import { damage } from './combat';
import { poof } from './feedback';
import { KINDS } from './kinds';
import { cellOf, passable } from './nav';
import type { Pom, SimulationEvent, Tank, World } from './types';

// The prototype leads the target's velocity by 60% of the flight time; walls
// do not stop the lob itself, only the landing blast.
const POM_LEAD = 0.6;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function spawnPom(world: World, enemy: Tank, target: Tank): Pom {
  const spec = KINDS.lobber;
  const flight = spec.flight;
  let tx = target.x + target.vx * flight * POM_LEAD;
  let ty = target.y + target.vy * flight * POM_LEAD;

  // A landing inside terrain falls back to the target's current position.
  if (!passable(world, cellOf(tx, ty))) {
    tx = target.x;
    ty = target.y;
  }
  tx = clamp(tx, 24, CONFIG.width - 24);
  ty = clamp(ty, CONFIG.gridY + 24, CONFIG.gridY + CONFIG.rows * CONFIG.tile - 24);

  const pom: Pom = {
    id: world.poms.length + 1,
    faction: enemy.faction,
    sx: enemy.x,
    sy: enemy.y,
    x: enemy.x,
    y: enemy.y,
    tx,
    ty,
    flight,
    life: flight,
    blast: spec.blast,
    dead: false,
  };
  world.poms.push(pom);
  enemy.cooldown = spec.cd * (world.mode === 'coop' ? 0.85 : 1);
  return pom;
}

function chipCorks(world: World, pom: Pom): void {
  for (const cork of world.corks) {
    if (cork.destroyed || cork.hitsRemaining <= 0) {
      continue;
    }
    const qx = clamp(pom.tx, cork.x, cork.x + cork.w);
    const qy = clamp(pom.ty, cork.y, cork.y + cork.h);
    if (Math.hypot(pom.tx - qx, pom.ty - qy) >= pom.blast) {
      continue;
    }
    cork.hitsRemaining = Math.max(0, cork.hitsRemaining - 1);
    cork.destroyed = cork.hitsRemaining === 0;
  }
}

function explode(world: World, pom: Pom, events?: SimulationEvent[]): void {
  poof(world, pom.tx, pom.ty, 'confetti');

  for (const target of [...world.players, ...world.enemies]) {
    if (!target.alive || target.faction === pom.faction) {
      continue;
    }
    if (Math.hypot(target.x - pom.tx, target.y - pom.ty) >= pom.blast + target.r * 0.4) {
      continue;
    }
    // The ground blast is blocked by permanent walls and solid corks.
    if (!hasLineOfSight(world, pom.tx, pom.ty, target.x, target.y)) {
      continue;
    }
    damage(world, target, events);
  }

  chipCorks(world, pom);
}

export function updatePoms(world: World, dt: number, events?: SimulationEvent[]): void {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }

  for (const pom of world.poms) {
    if (pom.dead) {
      continue;
    }

    pom.flight = Math.max(0, pom.flight - dt);
    const progress = pom.life > 0 ? 1 - pom.flight / pom.life : 1;
    pom.x = pom.sx + (pom.tx - pom.sx) * progress;
    pom.y = pom.sy + (pom.ty - pom.sy) * progress;

    if (pom.flight > 0) {
      continue;
    }

    pom.x = pom.tx;
    pom.y = pom.ty;
    explode(world, pom, events);
    pom.dead = true;
  }
}
