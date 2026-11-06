import { CONFIG } from '../config';
import { MAPS, validateMap } from './maps';
import type { Command, Mode, Shell, Tank, Wall, World } from './types';

const NEUTRAL_COMMAND: Command = { x: 0, y: 0, turn: 0, fire: false };

interface WallHit {
  readonly t: number;
  readonly nx: number;
  readonly ny: number;
  readonly wall: Wall;
  ambiguous: boolean;
}

function makeTank(id: string, faction: Tank['faction'], x: number, y: number): Tank {
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
    players: [],
    enemies: [],
    shells: [],
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

  checked.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (cell === undefined) {
        continue;
      }

      const px = x * CONFIG.tile;
      const py = CONFIG.gridY + y * CONFIG.tile;

      if (cell === '#') {
        world.walls.push({ x: px, y: py, w: CONFIG.tile, h: CONFIG.tile });
      } else if (cell === '1' || (cell === '2' && mode === 'coop')) {
        world.players.push(
          makeTank(`p${cell}`, 'player', px + CONFIG.tile / 2, py + CONFIG.tile / 2),
        );
      } else if (cell === 'S') {
        const enemy = makeTank(
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
  return world;
}

export function activeShells(world: World, owner: string): number {
  return world.shells.filter((shell) => !shell.dead && shell.owner === owner).length;
}

export function damage(_world: World, tank: Tank): boolean {
  if (!tank.alive || tank.invuln > 0) {
    return false;
  }

  tank.hp = Math.max(0, tank.hp - 1);

  if (tank.hp <= 0) {
    tank.alive = false;
    tank.charge = 0;
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
  return true;
}

function rayBox(
  x: number,
  y: number,
  dx: number,
  dy: number,
  box: Wall,
  radius = 0,
): WallHit | null {
  const loX = box.x - radius;
  const hiX = box.x + box.w + radius;
  const loY = box.y - radius;
  const hiY = box.y + box.h + radius;

  let near = -Infinity;
  let far = Infinity;
  let nx = 0;
  let ny = 0;
  let ambiguous = false;

  const testAxis = (p: number, d: number, lo: number, hi: number, axis: 0 | 1): boolean => {
    if (Math.abs(d) < 1e-10) {
      return p >= lo && p <= hi;
    }

    let a = (lo - p) / d;
    let b = (hi - p) / d;
    const normal = d > 0 ? -1 : 1;

    if (a > b) {
      [a, b] = [b, a];
    }

    if (a > near + 1e-7) {
      near = a;
      nx = axis === 0 ? normal : 0;
      ny = axis === 1 ? normal : 0;
      ambiguous = false;
    } else if (Math.abs(a - near) < 1e-7) {
      ambiguous = true;
    }

    far = Math.min(far, b);
    return near <= far + 1e-8;
  };

  if (!testAxis(x, dx, loX, hiX, 0) || !testAxis(y, dy, loY, hiY, 1)) {
    return null;
  }

  if (far < 0 || near > 1 || near < -1e-7) {
    return null;
  }

  return { t: Math.max(0, near), nx, ny, wall: box, ambiguous };
}

function firstWall(
  world: World,
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius = CONFIG.shellRadius,
): WallHit | null {
  let best: WallHit | null = null;

  for (const wall of world.walls) {
    const hit = rayBox(x, y, dx, dy, wall, radius);
    if (hit === null) {
      continue;
    }

    if (best === null || hit.t < best.t - 1e-7) {
      best = hit;
    } else if (Math.abs(hit.t - best.t) < 1e-7) {
      if (hit.ambiguous || hit.nx !== best.nx || hit.ny !== best.ny) {
        best.ambiguous = true;
      }
    }
  }

  return best;
}

function rayCircle(x: number, y: number, dx: number, dy: number, tank: Tank): number | null {
  const ox = x - tank.x;
  const oy = y - tank.y;
  const radius = tank.r + CONFIG.shellRadius;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) {
    return 0;
  }

  const a = dx * dx + dy * dy;
  if (a < 1e-12) {
    return null;
  }

  const b = ox * dx + oy * dy;
  const discriminant = b * b - a * c;
  if (discriminant < 0) {
    return null;
  }

  const hit = (-b - Math.sqrt(discriminant)) / a;
  return hit >= 0 && hit <= 1 ? hit : null;
}

function moveTank(world: World, tank: Tank, dx: number, dy: number): void {
  const pieces = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 5));

  for (let piece = 0; piece < pieces; piece += 1) {
    for (const axis of ['x', 'y'] as const) {
      const amount = (axis === 'x' ? dx : dy) / pieces;
      tank[axis] += amount;

      for (let iteration = 0; iteration < 3; iteration += 1) {
        let adjusted = false;

        for (const wall of world.walls) {
          const qx = Math.max(wall.x, Math.min(tank.x, wall.x + wall.w));
          const qy = Math.max(wall.y, Math.min(tank.y, wall.y + wall.h));
          const ox = tank.x - qx;
          const oy = tank.y - qy;
          const distance = Math.hypot(ox, oy);

          if (distance < tank.r - 1e-8) {
            if (distance > 1e-8) {
              const push = tank.r - distance;
              tank.x += (ox / distance) * push;
              tank.y += (oy / distance) * push;
            } else {
              tank[axis] -= amount;
            }
            adjusted = true;
          }
        }

        if (!adjusted) {
          break;
        }
      }
    }
  }
}

function advanceShell(world: World, shell: Shell, distance: number): void {
  const speed = Math.hypot(shell.vx, shell.vy);
  if (speed < 1e-7) {
    shell.dead = true;
    return;
  }

  const dx = (shell.vx / speed) * distance;
  const dy = (shell.vy / speed) * distance;

  let hitTank: Tank | null = null;
  let tankHitT = Infinity;

  for (const tank of [...world.players, ...world.enemies]) {
    if (!tank.alive || tank.faction === shell.faction) {
      continue;
    }

    const hit = rayCircle(shell.x, shell.y, dx, dy, tank);
    if (hit !== null && hit < tankHitT) {
      tankHitT = hit;
      hitTank = tank;
    }
  }

  const wallHit = firstWall(world, shell.x, shell.y, dx, dy);

  if (hitTank !== null && (wallHit === null || tankHitT < wallHit.t - 1e-7)) {
    shell.x += dx * tankHitT;
    shell.y += dy * tankHitT;
    damage(world, hitTank);
    shell.dead = true;
    return;
  }

  if (wallHit !== null) {
    // Gate B skeleton: walls stop shells. Gate C replaces this with the
    // prototype's single-bounce, remaining-travel collision policy.
    shell.x += dx * wallHit.t;
    shell.y += dy * wallHit.t;
    shell.dead = true;
    return;
  }

  shell.x += dx;
  shell.y += dy;

  if (shell.x < 0 || shell.x > CONFIG.width || shell.y < 0 || shell.y > CONFIG.height) {
    shell.dead = true;
  }
}

function commitOutcome(world: World, state: 'defeat' | 'cleared' | 'completed'): void {
  if (world.state !== 'playing') {
    return;
  }

  world.state = state;
  world.shells.length = 0;
  for (const enemy of world.enemies) {
    enemy.charge = 0;
  }
}

export function evaluateOutcome(world: World): void {
  if (world.state !== 'playing') {
    return;
  }

  if (world.players.every((player) => !player.alive)) {
    commitOutcome(world, 'defeat');
  } else if (world.enemies.every((enemy) => !enemy.alive)) {
    commitOutcome(world, world.room === MAPS.length - 1 ? 'completed' : 'cleared');
  }
}

export function stepWorld(world: World, dt: number, commands: readonly Command[] = []): void {
  if (world.state !== 'playing') {
    return;
  }

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
      player.angle = command.aim;
    } else {
      player.angle += command.turn * CONFIG.turretRotationSpeed * dt;
    }

    if (command.fire) {
      shoot(world, player);
    }
  });

  for (const shell of world.shells) {
    if (!shell.dead) {
      advanceShell(world, shell, Math.hypot(shell.vx, shell.vy) * dt);
    }
  }

  world.shells = world.shells.filter((shell) => !shell.dead);
  evaluateOutcome(world);
}
