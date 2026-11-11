import { CONFIG } from '../config';
import { hasLOS } from './collision';
import { shoot } from './combat';
import type { SimulationEvent, Tank, World } from './types';

export function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

export function turnToward(a: number, b: number, max: number): number {
  const delta = angleDelta(a, b);
  return a + Math.max(-max, Math.min(max, delta));
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
