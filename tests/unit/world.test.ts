import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { MAPS } from '../../src/sim/maps';
import {
  activeShells,
  createEmptyWorld,
  createTank,
  createWorld,
  damage,
  evaluateOutcome,
  shoot,
  stepWorld,
} from '../../src/sim/world';

describe('world creation', () => {
  it('creates two players and two sentries for co-op room one', () => {
    const world = createWorld(0, 'coop');

    expect(world.state).toBe('playing');
    expect(world.time).toBe(0);
    expect(world.room).toBe(0);
    expect(world.players.map((player) => player.id)).toEqual(['p1', 'p2']);
    expect(world.enemies).toHaveLength(2);
    expect(world.walls.length).toBeGreaterThan(0);
    expect(world.players.every((player) => player.hp === CONFIG.playerHealth)).toBe(true);
    expect(world.players.every((player) => player.alive)).toBe(true);
    expect(world.effects).toEqual([]);
    expect(world.events).toHaveLength(1);
  });

  it('creates exactly one player in solo mode', () => {
    const world = createWorld(0, 'solo');

    expect(world.mode).toBe('solo');
    expect(world.players).toHaveLength(1);
    expect(world.players[0]?.id).toBe('p1');
  });

  it('rejects unknown rooms and exposes an empty error world helper', () => {
    expect(() => createWorld(99, 'coop')).toThrow('Unknown room 99');

    const empty = createEmptyWorld('solo');
    expect(empty.players).toEqual([]);
    expect(empty.enemies).toEqual([]);
    expect(empty.walls).toEqual([]);
    expect(empty.effects).toEqual([]);
    expect(empty.events).toEqual([]);
  });
});

describe('simulation', () => {
  it('moves a player with normalized input and preserves aim when turn is released', () => {
    const world = createWorld(0, 'coop');
    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Player missing');
    }

    const startX = player.x;
    const startY = player.y;
    stepWorld(world, CONFIG.fixedStep, [{ x: 1, y: 0, turn: 0, fire: false }]);
    expect(player.x).toBeGreaterThan(startX);
    expect(player.y).toBeCloseTo(startY, 8);

    const angle = player.angle;
    stepWorld(world, CONFIG.fixedStep, [{ x: 0, y: 0, turn: 1, fire: false }]);
    expect(player.angle).toBeGreaterThan(angle);

    const turned = player.angle;
    stepWorld(world, CONFIG.fixedStep, [{ x: 0, y: 0, turn: 0, fire: false }]);
    expect(player.angle).toBeCloseTo(turned, 10);

    stepWorld(world, CONFIG.fixedStep, [{ x: 0, y: 0, turn: 0, fire: false, aim: 0 }]);
    expect(player.angle).toBe(0);
  });

  it('blocks tanks at walls', () => {
    const world = createWorld(0, 'coop');
    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Player missing');
    }

    for (let tick = 0; tick < 600; tick += 1) {
      stepWorld(world, CONFIG.fixedStep, [{ x: -1, y: 0, turn: 0, fire: false }]);
    }

    expect(player.x).toBeGreaterThanOrEqual(CONFIG.tile + CONFIG.tankRadius - 0.01);
  });

  it('fires, respects cooldown, and caps active player shells', () => {
    const world = createWorld(0, 'coop');
    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Player missing');
    }

    player.cooldown = 0;
    expect(shoot(world, player)).toBe(true);
    expect(activeShells(world, player.id)).toBe(1);
    expect(shoot(world, player)).toBe(false);

    player.cooldown = 0;
    expect(shoot(world, player)).toBe(true);
    player.cooldown = 0;
    expect(shoot(world, player)).toBe(true);
    expect(activeShells(world, player.id)).toBe(CONFIG.activeShellLimit);

    player.cooldown = 0;
    expect(shoot(world, player)).toBe(false);
  });

  it('applies damage, invulnerability, and death', () => {
    const world = createWorld(0, 'coop');
    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Player missing');
    }

    expect(damage(world, player)).toBe(true);
    expect(player.hp).toBe(CONFIG.playerHealth - 1);
    expect(player.invuln).toBe(CONFIG.postHitInvulnerability);
    expect(damage(world, player)).toBe(false);

    player.invuln = 0;
    expect(damage(world, player)).toBe(true);
    expect(player.hp).toBe(0);
    expect(player.alive).toBe(false);
  });

  it('lets player shells damage enemies but not players', () => {
    const world = createWorld(0, 'coop');
    const shooter = world.players[0];
    const ally = world.players[1];
    const enemy = world.enemies[0];
    if (shooter === undefined || ally === undefined || enemy === undefined) {
      throw new Error('Fixture entities missing');
    }

    for (const sentry of world.enemies) {
      sentry.cooldown = 999;
    }

    shooter.x = 80;
    shooter.y = 430;
    shooter.angle = 0;
    ally.x = 180;
    ally.y = 430;
    enemy.x = 300;
    enemy.y = 430;

    shooter.cooldown = 0;
    expect(shoot(world, shooter)).toBe(true);
    for (let tick = 0; tick < 240; tick += 1) {
      stepWorld(world, CONFIG.fixedStep);
    }

    expect(ally.hp).toBe(CONFIG.playerHealth);
    expect(enemy.alive).toBe(false);
  });

  it('lets enemy shells damage players but not enemies', () => {
    const world = createWorld(0, 'coop');
    const player = world.players[0];
    const shooter = world.enemies[0];
    const ally = world.enemies[1];
    if (player === undefined || shooter === undefined || ally === undefined) {
      throw new Error('Fixture entities missing');
    }

    for (const sentry of world.enemies) {
      sentry.cooldown = 999;
    }

    player.x = 100;
    player.y = 430;
    shooter.x = 300;
    shooter.y = 430;
    shooter.angle = Math.PI;
    shooter.cooldown = 0;
    ally.x = 200;
    ally.y = 430;

    expect(shoot(world, shooter)).toBe(true);
    for (let tick = 0; tick < 240; tick += 1) {
      stepWorld(world, CONFIG.fixedStep);
    }

    expect(ally.alive).toBe(true);
    expect(player.hp).toBe(CONFIG.playerHealth - 1);
  });

  it('commits defeat before victory in a simultaneous terminal state', () => {
    const world = createWorld(0, 'coop');
    for (const player of world.players) {
      player.alive = false;
    }
    for (const enemy of world.enemies) {
      enemy.alive = false;
    }
    world.shells.push({
      id: 1,
      owner: 'p1',
      faction: 'player',
      x: 100,
      y: 100,
      vx: 100,
      vy: 0,
      bounces: 0,
      dead: false,
    });

    evaluateOutcome(world);
    expect(world.state).toBe('defeat');
    expect(world.shells).toHaveLength(0);
  });

  it('commits defeat priority through a real step as well', () => {
    const world = createWorld(0, 'coop');
    for (const player of world.players) {
      player.alive = false;
    }
    for (const enemy of world.enemies) {
      enemy.alive = false;
    }

    stepWorld(world, CONFIG.fixedStep);

    expect(world.state).toBe('defeat');
    expect(world.shells).toHaveLength(0);
  });

  it('lets one survivor clear and removes every combat shell', () => {
    const world = createWorld(0, 'coop');
    const survivor = world.players[0];
    if (survivor === undefined) {
      throw new Error('Player missing');
    }
    survivor.alive = false;
    for (const enemy of world.enemies) {
      enemy.alive = false;
    }
    world.shells.push({
      id: 1,
      owner: 'p2',
      faction: 'player',
      x: 100,
      y: 100,
      vx: 100,
      vy: 0,
      bounces: 0,
      dead: false,
    });

    evaluateOutcome(world);

    expect(world.state).toBe('cleared');
    expect(world.shells).toHaveLength(0);
    expect(world.players[1]?.alive).toBe(true);
  });

  it('solo defeat needs only the single real player to fall', () => {
    const world = createWorld(0, 'solo');
    expect(world.players).toHaveLength(1);
    expect(world.players[0]?.id).toBe('p1');

    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Player missing');
    }
    player.alive = false;
    evaluateOutcome(world);

    expect(world.state).toBe('defeat');
  });

  it('completes the final room and freezes combat and time', () => {
    const world = createWorld(MAPS.length - 1, 'coop');
    for (const enemy of world.enemies) {
      enemy.alive = false;
    }

    evaluateOutcome(world);
    expect(world.state).toBe('completed');
    expect(world.room).toBe(MAPS.length - 1);

    const time = world.time;
    stepWorld(world, 1);
    expect(world.time).toBe(time);
    expect(world.shells).toHaveLength(0);
  });

  it('does not advance a cleared room', () => {
    const world = createWorld(0, 'coop');
    for (const enemy of world.enemies) {
      enemy.alive = false;
    }
    evaluateOutcome(world);

    const time = world.time;
    stepWorld(world, 1);

    expect(world.state).toBe('cleared');
    expect(world.time).toBe(time);
  });

  it('replaying after completion returns a fresh first room', () => {
    const completed = createWorld(MAPS.length - 1, 'coop');
    for (const enemy of completed.enemies) {
      enemy.alive = false;
    }
    evaluateOutcome(completed);
    expect(completed.state).toBe('completed');

    const replay = createWorld(0, 'coop');
    expect(replay).toEqual(createWorld(0, 'coop'));
    expect(replay.room).toBe(0);
    expect(replay.state).toBe('playing');
    expect(replay.time).toBe(0);
  });

  it('fresh rooms reset combat, health, timers, effects, and outcomes', () => {
    const dirty = createWorld(1, 'coop');
    const player = dirty.players[0];
    if (player === undefined) {
      throw new Error('Player missing');
    }
    player.hp = 0;
    player.invuln = 2;
    dirty.time = 99;
    dirty.state = 'defeat';
    dirty.shells.push({
      id: 9,
      owner: 'p1',
      faction: 'player',
      x: 100,
      y: 100,
      vx: 100,
      vy: 0,
      bounces: 1,
      dead: false,
    });
    dirty.effects.push({ x: 0, y: 0, type: 'spark', age: 0, life: 0.22, seed: 0 });

    const fresh = createWorld(1, 'coop');

    expect(fresh.state).toBe('playing');
    expect(fresh.time).toBe(0);
    expect(fresh.shells).toHaveLength(0);
    expect(fresh.effects).toHaveLength(0);
    expect(fresh.nextShell).toBe(0);
    expect(fresh.shots).toBe(0);
    expect(fresh.bounces).toBe(0);
    expect(
      fresh.players.every(
        (tank) =>
          tank.alive && tank.hp === CONFIG.playerHealth && tank.invuln === 0 && tank.cooldown === 0,
      ),
    ).toBe(true);
  });

  it('keeps repeated command sequences deterministic', () => {
    const a = createWorld(1, 'coop');
    const b = createWorld(1, 'coop');
    const commands = [{ x: 1, y: 1, turn: 1, fire: true }];

    for (let tick = 0; tick < 120; tick += 1) {
      stepWorld(a, CONFIG.fixedStep, commands);
      stepWorld(b, CONFIG.fixedStep, commands);
    }

    expect(a.time).toBe(b.time);
    expect(a.players.map((player) => [player.x, player.y, player.angle])).toEqual(
      b.players.map((player) => [player.x, player.y, player.angle]),
    );
    expect(a.shells.map((shell) => [shell.x, shell.y, shell.dead])).toEqual(
      b.shells.map((shell) => [shell.x, shell.y, shell.dead]),
    );
    expect(a.effects.map((effect) => [effect.x, effect.y, effect.age])).toEqual(
      b.effects.map((effect) => [effect.x, effect.y, effect.age]),
    );
    expect(a.events).toEqual(b.events);
    expect(a.shots).toBe(b.shots);
    expect(a.bounces).toBe(b.bounces);
  });

  it('ages and expires temporary effects', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 100, 100);
    const enemy = createTank('s0', 'enemy', 800, 100);
    enemy.cooldown = 999;
    world.players = [player];
    world.enemies = [enemy];

    damage(world, player);
    expect(world.effects).toHaveLength(1);

    stepWorld(world, 0.3);
    expect(world.effects).toHaveLength(1);
    expect(world.effects[0]?.age).toBeCloseTo(0.3, 8);

    stepWorld(world, 0.3);
    expect(world.effects).toHaveLength(0);
  });

  it('bounds the event log to the seven most recent entries', () => {
    const world = createEmptyWorld('coop');

    for (let index = 0; index < 10; index += 1) {
      damage(world, createTank(`unit${String(index)}`, 'player', 50, 50));
    }

    expect(world.events).toHaveLength(7);
    expect(world.events[0]).toContain('Hit · unit9');
  });

  it('updates sentries automatically during a step', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    enemy.angle = 0;
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 900, 100)];

    for (let tick = 0; tick < 12; tick += 1) {
      stepWorld(world, 0.1);
    }

    expect(world.shots).toBe(1);
    expect(world.shells).toHaveLength(1);
  });
});
