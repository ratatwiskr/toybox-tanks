import { CONFIG } from '../config';
import { moveTank } from './collision';
import { advanceShell, resolveShellCollisions, shoot } from './combat';
import { turnToward, updateEnemy } from './enemies';
import { record } from './feedback';
import { addMapBorder, MAPS, validateMap } from './maps';
import type { Command, Faction, Mode, SimulationEvent, Tank, World } from './types';

export { activeShells, damage, shoot } from './combat';

const NEUTRAL_COMMAND: Command = { x: 0, y: 0, turn: 0, fire: false };

export function createTank(id: string, faction: Faction, x: number, y: number): Tank {
  return {
    id,
    faction,
    x,
    y,
    spawnX: x,
    spawnY: y,
    r: CONFIG.tankRadius,
    angle: -Math.PI / 2,
    hp: faction === 'player' ? CONFIG.playerHealth : 1,
    alive: true,
    invuln: 0,
    cooldown: 0,
    charge: 0,
    targetId: null,
    track: 0,
  };
}

export function createEmptyWorld(mode: Mode): World {
  return {
    room: 0,
    mode,
    state: 'playing',
    time: 0,
    walls: [],
    corks: [],
    players: [],
    enemies: [],
    shells: [],
    effects: [],
    events: [],
    nextShell: 0,
    shots: 0,
    bounces: 0,
  };
}

export function createWorld(index: number, mode: Mode): World {
  const data = MAPS[index];
  if (data === undefined) {
    throw new Error(`Unknown room ${String(index)}`);
  }

  const checked = validateMap(data);
  if (!checked.ok) {
    throw new Error(`${data.name}:\n${checked.errors.join('\n')}`);
  }

  const world = createEmptyWorld(mode);
  world.room = index;

  addMapBorder(checked.rows).forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (cell === undefined) {
        continue;
      }

      const px = x * CONFIG.tile;
      const py = CONFIG.gridY + y * CONFIG.tile;

      if (cell === '#') {
        world.walls.push({ x: px, y: py, w: CONFIG.tile, h: CONFIG.tile });
      } else if (cell === 'C') {
        world.corks.push({
          id: `c${String(x)},${String(y)}`,
          x: px,
          y: py,
          w: CONFIG.tile,
          h: CONFIG.tile,
          hitsRemaining: 3,
          destroyed: false,
        });
      } else if (cell === '1' || (cell === '2' && mode === 'coop')) {
        world.players.push(
          createTank(`p${cell}`, 'player', px + CONFIG.tile / 2, py + CONFIG.tile / 2),
        );
      } else if (cell === 'S') {
        const enemy = createTank(
          `s${String(world.enemies.length)}`,
          'enemy',
          px + CONFIG.tile / 2,
          py + CONFIG.tile / 2,
        );
        enemy.angle = Math.PI / 2;
        enemy.cooldown = 1.2 + world.enemies.length * 0.38;
        world.enemies.push(enemy);
      }
    }
  });

  world.players.sort((a, b) => a.id.localeCompare(b.id));
  record(world, `Room loaded: ${data.name}`);
  return world;
}

function commitOutcome(
  world: World,
  state: 'defeat' | 'cleared' | 'completed',
  events?: SimulationEvent[],
): void {
  if (world.state !== 'playing') {
    return;
  }

  world.state = state;
  events?.push({ type: 'outcome', state });
  world.shells.length = 0;
  for (const enemy of world.enemies) {
    enemy.charge = 0;
  }
  record(
    world,
    state === 'defeat'
      ? 'DEFEAT'
      : state === 'completed'
        ? 'VICTORY · all rooms'
        : 'VICTORY · room clear',
  );
}

export function evaluateOutcome(world: World, events?: SimulationEvent[]): void {
  if (world.state !== 'playing') {
    return;
  }

  if (world.players.every((player) => !player.alive)) {
    commitOutcome(world, 'defeat', events);
  } else if (world.enemies.every((enemy) => !enemy.alive)) {
    commitOutcome(world, world.room === MAPS.length - 1 ? 'completed' : 'cleared', events);
  }
}

export function stepWorld(
  world: World,
  dt: number,
  commands: readonly Command[] = [],
): SimulationEvent[] {
  if (world.state !== 'playing') {
    return [];
  }

  const events: SimulationEvent[] = [];
  world.time += dt;

  for (const tank of [...world.players, ...world.enemies]) {
    tank.cooldown = Math.max(0, tank.cooldown - dt);
    tank.invuln = Math.max(0, tank.invuln - dt);
  }

  world.players.forEach((player, index) => {
    if (!player.alive) {
      return;
    }

    const command = commands[index] ?? NEUTRAL_COMMAND;
    let mx = command.x;
    let my = command.y;
    const length = Math.hypot(mx, my);

    if (length > 1) {
      mx /= length;
      my /= length;
    }

    moveTank(world, player, mx * CONFIG.playerSpeed * dt, my * CONFIG.playerSpeed * dt);
    player.track += Math.hypot(mx, my) * dt * 12;

    if (command.aim !== undefined) {
      player.angle = turnToward(player.angle, command.aim, CONFIG.turretRotationSpeed * dt);
    } else {
      player.angle += command.turn * CONFIG.turretRotationSpeed * dt;
    }

    if (command.fire) {
      shoot(world, player, events);
    }
  });

  for (const enemy of world.enemies) {
    updateEnemy(world, enemy, dt, events);
  }

  resolveShellCollisions(world, dt, events);

  for (const shell of world.shells) {
    if (!shell.dead) {
      advanceShell(world, shell, Math.hypot(shell.vx, shell.vy) * dt, events);
    }
  }

  world.shells = world.shells.filter((shell) => !shell.dead);

  for (const effect of world.effects) {
    effect.age += dt;
  }
  world.effects = world.effects.filter((effect) => effect.age < effect.life);

  // Do not short-circuit during projectile processing: defeat has priority
  // when the last enemy and last player fall in the same simulation step.
  evaluateOutcome(world, events);
  return events;
}
