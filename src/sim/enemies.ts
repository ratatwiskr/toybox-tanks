import { CONFIG } from '../config';
import { hasLOS, moveTank } from './collision';
import { shoot } from './combat';
import { KINDS } from './kinds';
import { cellOf, planPatrol, pathTo } from './nav';
import type { Point, SimulationEvent, Tank, World } from './types';

export function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

export function turnToward(a: number, b: number, max: number): number {
  const delta = angleDelta(a, b);
  return a + Math.max(-max, Math.min(max, delta));
}

export function followPath(
  world: World,
  tank: Tank,
  path: Point[],
  speed: number,
  dt: number,
): void {
  if (path.length === 0) return;
  const next = path[0];
  if (next === undefined) return;
  const dx = next.x - tank.x;
  const dy = next.y - tank.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    path.shift();
    if (path.length === 0) return;
  }
  const n = path[0];
  if (n === undefined) return;
  const vx = n.x - tank.x;
  const vy = n.y - tank.y;
  const d = Math.hypot(vx, vy);
  if (d < 1e-6) return;
  const mx = (vx / d) * speed * dt;
  const my = (vy / d) * speed * dt;
  const px = tank.x;
  const py = tank.y;
  moveTank(world, tank, mx, my);
  tank.vx = (tank.x - px) / Math.max(dt, 1e-6);
  tank.vy = (tank.y - py) / Math.max(dt, 1e-6);
  tank.heading = Math.atan2(vy, vx);
  tank.angle = turnToward(
    tank.angle,
    tank.heading,
    (tank.kind ? KINDS[tank.kind].hullTurn : 0) * dt,
  );
  tank.track += Math.hypot(mx, my) * 0.08;
}

function updateSentry(world: World, enemy: Tank, dt: number, events?: SimulationEvent[]): void {
  const visible = world.players
    .filter((player) => player.alive && hasLOS(world, enemy, player))
    .sort(
      (a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y),
    );
  const target = visible[0];

  if (target === undefined) {
    enemy.charge = 0;
    enemy.targetId = null;
    return;
  }

  if (enemy.targetId !== target.id) {
    enemy.charge = 0;
    enemy.targetId = target.id;
  }

  const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  enemy.angle = turnToward(enemy.angle, aim, CONFIG.enemyTurnSpeed * dt);

  if (enemy.cooldown <= 0 && Math.abs(angleDelta(enemy.angle, aim)) < 0.09) {
    enemy.charge += dt;

    if (enemy.charge >= CONFIG.enemyTelegraph) {
      // Require actual barrel alignment and unobstructed shell-radius clearance
      // at the firing instant. No prediction and no planned ricochets.
      if (hasLOS(world, enemy, target)) {
        shoot(world, enemy, events);
      }
      enemy.charge = 0;
    }
  } else {
    enemy.charge = 0;
  }
}

function updateRoamer(world: World, enemy: Tank, dt: number, events?: SimulationEvent[]): void {
  const spec = KINDS.roamer;
  enemy.ai.lost += dt;
  const visible = world.players
    .filter(
      (player) => player.alive && Math.hypot(player.x - enemy.x, player.y - enemy.y) <= spec.vision,
    )
    .filter((player) => hasLOS(world, enemy, player))
    .sort(
      (a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y),
    );
  const target = visible[0];
  if (target !== undefined) {
    enemy.ai.mode = 'chase';
    enemy.ai.lost = 0;
    enemy.ai.last = { x: target.x, y: target.y };
    enemy.targetId = target.id;
    const lead = spec.hunt;
    const tx = target.x + target.vx * lead;
    const ty = target.y + target.vy * lead;
    const aim = Math.atan2(ty - enemy.y, tx - enemy.x);
    enemy.angle = turnToward(enemy.angle, aim, spec.turn * dt);
    const to = cellOf(target.x, target.y);
    enemy.ai.path = pathTo(world, cellOf(enemy.x, enemy.y), to);
    if (enemy.ai.path.length <= 1) {
      enemy.ai.path = [];
    }
    followPath(world, enemy, enemy.ai.path, spec.speed, dt);
    if (
      enemy.cooldown <= 0 &&
      Math.abs(angleDelta(enemy.angle, aim)) < 0.12 &&
      hasLOS(world, enemy, target)
    ) {
      enemy.charge += dt;
      if (enemy.charge >= spec.tele) {
        if (hasLOS(world, enemy, target)) {
          shoot(world, enemy, events);
        }
        enemy.charge = 0;
      }
    } else {
      enemy.charge = 0;
    }
    return;
  }

  enemy.charge = 0;
  enemy.targetId = null;
  if (enemy.ai.mode === 'chase' && enemy.ai.lost < 2 && enemy.ai.last !== null) {
    enemy.ai.path = pathTo(
      world,
      cellOf(enemy.x, enemy.y),
      cellOf(enemy.ai.last.x, enemy.ai.last.y),
    );
    if (enemy.ai.path.length > 0) {
      followPath(world, enemy, enemy.ai.path, spec.speed, dt);
      return;
    }
  }
  enemy.ai.mode = 'patrol';
  if (enemy.ai.path.length === 0) {
    enemy.ai.wait -= dt;
    if (enemy.ai.wait <= 0) {
      enemy.ai.path = planPatrol(world, enemy);
      enemy.ai.wait = 0.4;
    }
  } else {
    followPath(world, enemy, enemy.ai.path, spec.speed, dt);
  }
}

export function updateEnemy(
  world: World,
  enemy: Tank,
  dt: number,
  events?: SimulationEvent[],
): void {
  if (!enemy.alive) {
    return;
  }
  enemy.hurt = Math.max(0, enemy.hurt - dt);
  enemy.stun = Math.max(0, enemy.stun - dt);
  if (enemy.stun > 0) {
    enemy.vx = 0;
    enemy.vy = 0;
    return;
  }

  const kind = enemy.kind ?? 'sentry';
  if (kind === 'sentry') {
    updateSentry(world, enemy, dt, events);
    return;
  }
  if (kind === 'roamer') {
    updateRoamer(world, enemy, dt, events);
    return;
  }
  if (kind === 'bruiser') {
    updateRoamer(world, enemy, dt, events);
    return;
  }
  // lobber/prankster implemented in later scopes
  enemy.vx = 0;
  enemy.vy = 0;
}
