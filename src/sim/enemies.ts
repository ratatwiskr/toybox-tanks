import { CONFIG } from '../config';
import { hasLOS, moveTank } from './collision';
import { layMine, shoot } from './combat';
import { KINDS } from './kinds';
import { solveBank } from './ballistics';
import { cellOf, fleePath, planPatrol, pathTo } from './nav';
import { spawnPom } from './poms';
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

function bruiserCooldown(world: World, enemy: Tank): number {
  const spec = KINDS.bruiser;
  let cd = spec.cd;
  if (enemy.hp <= 2) cd *= 0.8;
  if (world.mode === 'coop') cd *= 0.85;
  return cd;
}

function updateBruiser(world: World, enemy: Tank, dt: number, events?: SimulationEvent[]): void {
  const spec = KINDS.bruiser;
  const speed = enemy.hp <= 2 ? spec.speed * 1.3 : spec.speed;
  enemy.ai.lost += dt;

  const inVision = world.players
    .filter(
      (player) => player.alive && Math.hypot(player.x - enemy.x, player.y - enemy.y) <= spec.vision,
    )
    .sort(
      (a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y),
    );
  const visible = inVision.filter((player) => hasLOS(world, enemy, player));
  const nearest = visible[0] ?? inVision[0];

  if (nearest !== undefined) {
    enemy.ai.mode = 'chase';
    enemy.ai.lost = 0;
    enemy.ai.last = { x: nearest.x, y: nearest.y };
    enemy.targetId = nearest.id;

    // movement/chase toward nearest in vision
    const to = cellOf(nearest.x, nearest.y);
    enemy.ai.path = pathTo(world, cellOf(enemy.x, enemy.y), to);
    if (enemy.ai.path.length <= 1) enemy.ai.path = [];
    followPath(world, enemy, enemy.ai.path, speed, dt);

    // if currently telegraphing a bank plan, continue it
    if (enemy.ai.plan !== null) {
      enemy.angle = turnToward(enemy.angle, enemy.ai.plan.solution.angle, spec.turn * dt);
      enemy.ai.plan = { ...enemy.ai.plan, time: enemy.ai.plan.time - dt };
      if (enemy.ai.plan.time <= 0 && enemy.cooldown <= 0) {
        enemy.angle = enemy.ai.plan.solution.angle;
        if (shoot(world, enemy, events)) {
          enemy.cooldown = bruiserCooldown(world, enemy);
        }
        enemy.ai.plan = null;
        enemy.charge = 0;
      }
      return;
    }

    // try to acquire a bank solution when ready
    if (enemy.cooldown <= 0) {
      let bank: ReturnType<typeof solveBank> = null;
      for (const player of inVision) {
        const sol = solveBank(world, enemy, player);
        if (sol !== null && (bank === null || sol.score < bank.score)) bank = sol;
      }
      if (bank !== null) {
        enemy.ai.plan = { solution: bank, time: spec.teleBank };
        enemy.charge = 0;
        enemy.angle = turnToward(enemy.angle, bank.angle, spec.turn * dt);
        return;
      }
    }

    // fallback: direct LOS fire
    enemy.ai.plan = null;
    if (visible[0] !== undefined) {
      const directTarget = visible[0];
      const aim = Math.atan2(directTarget.y - enemy.y, directTarget.x - enemy.x);
      enemy.angle = turnToward(enemy.angle, aim, spec.turn * dt);
      if (enemy.cooldown <= 0 && Math.abs(angleDelta(enemy.angle, aim)) < 0.12) {
        enemy.charge += dt;
        if (enemy.charge >= spec.tele) {
          if (hasLOS(world, enemy, directTarget) && shoot(world, enemy, events)) {
            enemy.cooldown = bruiserCooldown(world, enemy);
          }
          enemy.charge = 0;
        }
      } else {
        enemy.charge = 0;
      }
      return;
    }

    enemy.charge = 0;
    return;
  }

  enemy.charge = 0;
  enemy.ai.plan = null;
  enemy.targetId = null;
  if (enemy.ai.mode === 'chase' && enemy.ai.lost < 2 && enemy.ai.last !== null) {
    enemy.ai.path = pathTo(
      world,
      cellOf(enemy.x, enemy.y),
      cellOf(enemy.ai.last.x, enemy.ai.last.y),
    );
    if (enemy.ai.path.length > 0) {
      followPath(world, enemy, enemy.ai.path, speed, dt);
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
    followPath(world, enemy, enemy.ai.path, speed, dt);
  }
}

function updateLobber(world: World, enemy: Tank, dt: number): void {
  const spec = KINDS.lobber;
  const target = world.players
    .filter(
      (player) => player.alive && Math.hypot(player.x - enemy.x, player.y - enemy.y) <= spec.vision,
    )
    .sort(
      (a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y),
    )[0];

  if (target === undefined) {
    enemy.charge = 0;
    enemy.targetId = null;
    if (enemy.ai.mode !== 'patrol') {
      enemy.ai.mode = 'patrol';
      enemy.ai.path = [];
    }
    if (enemy.ai.path.length > 0) {
      followPath(world, enemy, enemy.ai.path, spec.speed, dt);
    } else if (enemy.ai.wait > 0) {
      enemy.ai.wait -= dt;
    } else {
      enemy.ai.path = planPatrol(world, enemy);
      enemy.ai.wait = 0.5;
    }
    enemy.angle = turnToward(
      enemy.angle,
      enemy.heading + Math.sin(world.time * 1.1 + enemy.phase) * 0.7,
      spec.turn * 0.5 * dt,
    );
    return;
  }

  const distance = Math.hypot(target.x - enemy.x, target.y - enemy.y);
  const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  enemy.angle = turnToward(enemy.angle, aim, spec.turn * dt);
  enemy.targetId = target.id;
  enemy.ai.last = { x: target.x, y: target.y };

  // Artillery keeps its distance: retreat, and never fire while too close.
  if (distance < spec.minRange) {
    enemy.charge = 0;
    if (enemy.ai.mode !== 'flee') {
      enemy.ai.mode = 'flee';
      enemy.ai.path = fleePath(world, enemy, target);
      enemy.ai.wait = 0.5;
    } else if (enemy.ai.path.length === 0) {
      // Re-plan a retreat at a bounded rate if the first path was exhausted.
      enemy.ai.wait -= dt;
      if (enemy.ai.wait <= 0) {
        enemy.ai.path = fleePath(world, enemy, target);
        enemy.ai.wait = 0.5;
      }
    }
    if (enemy.ai.path.length > 0) {
      followPath(world, enemy, enemy.ai.path, spec.speed * 1.6, dt);
    }
    return;
  }

  if (enemy.ai.mode === 'flee') {
    enemy.ai.path = [];
  }
  enemy.ai.mode = 'chase';

  if (enemy.cooldown <= 0 && Math.abs(angleDelta(enemy.angle, aim)) < 0.3) {
    enemy.charge += dt;
    if (enemy.charge >= spec.tele) {
      enemy.charge = 0;
      spawnPom(world, enemy, target);
    }
  } else {
    enemy.charge = 0;
  }
}

function updatePrankster(world: World, enemy: Tank, dt: number): void {
  const spec = KINDS.prankster;
  enemy.mineCooldown = Math.max(0, enemy.mineCooldown - dt);

  const target = world.players
    .filter(
      (player) =>
        player.alive &&
        Math.hypot(player.x - enemy.x, player.y - enemy.y) <= spec.vision &&
        hasLOS(world, enemy, player),
    )
    .sort(
      (a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y),
    )[0];
  const seen = target !== undefined;

  if (target !== undefined) {
    enemy.ai.mode = 'flee';
    enemy.ai.last = { x: target.x, y: target.y };
    enemy.targetId = target.id;
    if (enemy.ai.path.length === 0) {
      enemy.ai.path = fleePath(world, enemy, target);
    }
  } else {
    enemy.charge = 0;
    enemy.targetId = null;
    if (enemy.ai.mode === 'flee') {
      enemy.ai.mode = 'patrol';
      enemy.ai.path = [];
    }
  }

  if (enemy.ai.path.length > 0) {
    followPath(world, enemy, enemy.ai.path, spec.speed * (seen ? 1.4 : 1), dt);
  } else if (enemy.ai.wait > 0) {
    enemy.ai.wait -= dt;
  } else {
    enemy.ai.path = planPatrol(world, enemy);
    enemy.ai.wait = 0.5;
  }

  enemy.angle = enemy.heading;

  const ownMines = world.mines.filter((mine) => mine.owner === enemy && !mine.dead).length;
  if (
    enemy.mineCooldown <= 0 &&
    ownMines < spec.maxMines &&
    world.players.every(
      (player) => !player.alive || Math.hypot(player.x - enemy.x, player.y - enemy.y) > 80,
    ) &&
    world.mines.every((mine) => mine.dead || Math.hypot(mine.x - enemy.x, mine.y - enemy.y) > 55)
  ) {
    layMine(
      world,
      enemy,
      enemy.x - Math.cos(enemy.heading) * 20,
      enemy.y - Math.sin(enemy.heading) * 20,
    );
    enemy.mineCooldown = seen ? spec.mineCdSeen : spec.mineCd;
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
    updateBruiser(world, enemy, dt, events);
    return;
  }
  if (kind === 'lobber') {
    updateLobber(world, enemy, dt);
    return;
  }
  updatePrankster(world, enemy, dt);
}
