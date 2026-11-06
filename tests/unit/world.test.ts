import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import {
  activeShells,
  createEmptyWorld,
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
  });
});

describe('skeleton simulation', () => {
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

  it('commits defeat before victory, clears shells, and freezes combat', () => {
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

    const time = world.time;
    stepWorld(world, 1);
    expect(world.time).toBe(time);
  });

  it('clears a room when every sentry is disabled and completes the third room', () => {
    const first = createWorld(0, 'coop');
    for (const enemy of first.enemies) {
      enemy.alive = false;
    }
    evaluateOutcome(first);
    expect(first.state).toBe('cleared');

    const last = createWorld(2, 'coop');
    for (const enemy of last.enemies) {
      enemy.alive = false;
    }
    evaluateOutcome(last);
    expect(last.state).toBe('completed');
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
  });
});
