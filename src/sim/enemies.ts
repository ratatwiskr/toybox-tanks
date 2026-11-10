import { CONFIG } from '../config';
import { moveTank } from './collision';
import { advanceShell, resolveShellCollisions, shoot } from './combat';
import { turnToward, updateEnemy } from './enemies';
import { record } from './feedback';
import { addMapBorder, MAPS, validateMap } from './maps';
import type { Command, Faction, Mode, SimulationEvent, Tank, World } from './types';

export { activeShells, damage, shoot } from './combat';

const NEUTRAL_COMMAND: Command = { x: 0, y: 0, turn: 0, fire: false };

export function updateEnemy(world: World, enemy: Tank, dt: number, events?: SimulationEvent[]): void {
  if (!enemy.alive) {
    return;
  }

  enemy.cooldown = Math.max(0, enemy.cooldown - dt);

  let target: Tank | null = null;
  let best = Infinity;
  for (const player of world.players) {
    if (!player.alive) {
      continue;
    }
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance < best) {
      best = distance;
      target = player;
    }
  }

  if (target === null) {
    enemy.charge = 0;
    return;
  }

  enemy.targetId = target.id;
  const wanted = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  enemy.angle = turnToward(enemy.angle, wanted, CONFIG.enemyTurnSpeed * dt);

  if (enemy.cooldown > 0) {
    enemy.charge = 0;
    return;
  }

  enemy.charge += dt;
  if (enemy.charge >= CONFIG.enemyChargeTime) {
    // Require actual barrel alignment and unobstructed shell-radius clearance
    // at the firing instant. No prediction and no planned ricochets.
    if (hasLOS(world, enemy, target)) {
      shoot(world, enemy, events);
    }
    enemy.charge = 0;
  }
}
