import { CONFIG } from '../config';
import { moveTank } from './collision';
import { advanceShell, resolveShellCollisions, shoot } from './combat';
import { turnToward, updateEnemy } from './enemies';
import { record } from './feedback';
import { KINDS } from './kinds';
import { addMapBorder, MAPS, validateMap } from './maps';
import { nextRandom } from './rng';
import type { Command, EnemyKind, Faction, Mode, SimulationEvent, Tank, World } from './types';

export { activeShells, damage, shoot } from './combat';

const NEUTRAL_COMMAND: Command = { x: 0, y: 0, turn: 0, fire: false };

const ENEMY_SYMBOL_KIND: Record<string, EnemyKind> = {
  S: 'sentry',
  R: 'roamer',
  B: 'bruiser',
  L: 'lobber',
  M: 'prankster',
  s: 'sentry',
  r: 'roamer',
  b: 'bruiser',
  l: 'lobber',
  m: 'prankster',
};

export function createTank(
  id: string,
  faction: Faction,
  x: number,
  y: number,
  kind: EnemyKind | null = faction === 'enemy' ? 'sentry' : null,
): Tank {
  const spec = kind === null ? null : KINDS[kind];
  const hp = faction === 'player' ? CONFIG.playerHealth : (spec?.hp ?? 1);
  return {
    id,
    faction,
    kind,
    maxHp: hp,
    x,
    y,
    spawnX: x,
    spawnY: y,
    r: spec?.r ?? CONFIG.tankRadius,
    angle: -Math.PI / 2,
    heading: -Math.PI / 2,
    hp,
    alive: true,
    invuln: 0,
    cooldown: 0,
    charge: 0,
    hurt: 0,
    stun: 0,
    phase: 0,
    vx: 0,
    vy: 0,
    mineCooldown: 0,
    altPrev: false,
    targetId: null,
    track: 0,
    ai: {
      mode: 'patrol',
      path: [],
      wait: 0,
      last: null,
      lost: 99,
      scan: 0.1,
      plan: null,
      srch: null,
      stuck: 0,
    },
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
    mines: [],
    poms: [],
    effects: [],
    events: [],
    nextShell: 0,
    nextMine: 0,
    shots: 0,
    bounces: 0,
    rngState: 1234,
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
  world.rngState = 1234 + index;

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
      } else if (cell in ENEMY_SYMBOL_KIND) {
        const kind = ENEMY_SYMBOL_KIND[cell];
        if (kind === undefined) continue;
        const isUpper = cell === cell.toUpperCase();
        if (!isUpper && mode !== 'coop') {
          continue;
        }
        const indexInWorld = world.enemies.length;
        const enemy = createTank(
          `${cell.toLowerCase()}${String(indexInWorld)}`,
          'enemy',
          px + CONFIG.tile / 2,
          py + CONFIG.tile / 2,
          kind,
        );
        enemy.angle = Math.PI / 2;
        enemy.heading = Math.PI / 2;
        const baseCooldown: Partial<Record<EnemyKind, number>> = { bruiser: 2, lobber: 2.5 };
        enemy.cooldown = (baseCooldown[kind] ?? 1.2) + indexInWorld * 0.38;
        enemy.mineCooldown = 1.5;
        enemy.phase = nextRandom(world) * 6;
        enemy.ai.wait = nextRandom(world) * 0.8;
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
  world.mines.length = 0;
  world.poms.length = 0;
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

    const px = player.x;
    const py = player.y;
    moveTank(world, player, mx * CONFIG.playerSpeed * dt, my * CONFIG.playerSpeed * dt);
    player.vx = (player.x - px) / Math.max(dt, 1e-6);
    player.vy = (player.y - py) / Math.max(dt, 1e-6);
    player.track += Math.hypot(mx, my) * dt * 12;

    if (command.aim !== undefined) {
      player.angle = turnToward(player.angle, command.aim, CONFIG.turretRotationSpeed * dt);
    } else {
      player.angle += command.turn * CONFIG.turretRotationSpeed * dt;
    }

    if (command.fire) {
      shoot(world, player, events);
    }
    player.altPrev = command.alt === true;
  });

  for (const enemy of world.enemies) {
    updateEnemy(world, enemy, dt, events);
  }

  // mines/poms logic added in later scopes; placeholders keep step order
  resolveShellCollisions(world, dt, events);

  for (const shell of world.shells) {
    if (!shell.dead) {
      advanceShell(world, shell, Math.hypot(shell.vx, shell.vy) * dt, events);
    }
  }

  world.shells = world.shells.filter((shell) => !shell.dead);
  world.mines = world.mines.filter((mine) => !mine.dead);
  world.poms = world.poms.filter((pom) => !pom.dead);

  for (const effect of world.effects) {
    effect.age += dt;
  }
  world.effects = world.effects.filter((effect) => effect.age < effect.life);

  // Do not short-circuit during projectile processing: defeat has priority
  // when the last enemy and last player fall in the same simulation step.
  evaluateOutcome(world, events);
  return events;
}
