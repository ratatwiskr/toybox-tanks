import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { activeShells, advanceShell, damage, shoot } from '../../src/sim/combat';
import type { Shell } from '../../src/sim/types';
import { createEmptyWorld, createTank, createWorld } from '../../src/sim/world';

function makeShell(x = 60, y = 100, vx = 100, vy = 0, faction: Shell['faction'] = 'player'): Shell {
  return {
    id: 1,
    owner: faction === 'enemy' ? 's0' : 'p1',
    faction,
    x,
    y,
    vx,
    vy,
    bounces: 0,
    dead: false,
  };
}

describe('friendly fire and damage', () => {
  it('player shells ignore both players and hit an enemy', () => {
    const world = createEmptyWorld('coop');
    world.players = [createTank('p1', 'player', 100, 100), createTank('p2', 'player', 140, 100)];
    world.enemies = [createTank('s0', 'enemy', 190, 100)];
    const shell = makeShell();

    advanceShell(world, shell, 180);

    expect(world.players.every((player) => player.hp === CONFIG.playerHealth)).toBe(true);
    expect(world.enemies[0]?.alive).toBe(false);
    expect(shell.dead).toBe(true);
  });

  it('enemy shells ignore enemies and hit a player', () => {
    const world = createEmptyWorld('coop');
    world.enemies = [createTank('s0', 'enemy', 100, 100), createTank('s1', 'enemy', 140, 100)];
    world.players = [createTank('p1', 'player', 190, 100)];
    const shell = makeShell(60, 100, 100, 0, 'enemy');

    advanceShell(world, shell, 180);

    expect(world.enemies.every((enemy) => enemy.alive)).toBe(true);
    expect(world.players[0]?.hp).toBe(CONFIG.playerHealth - 1);
    expect(shell.dead).toBe(true);
  });

  it('invulnerability prevents repeated damage', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 50, 50);

    expect(damage(world, player)).toBe(true);
    expect(damage(world, player)).toBe(false);
    expect(player.hp).toBe(CONFIG.playerHealth - 1);
    expect(player.invuln).toBe(CONFIG.postHitInvulnerability);

    player.invuln = 0;
    expect(damage(world, player)).toBe(true);
    expect(player.hp).toBe(0);
    expect(player.alive).toBe(false);
  });

  it('records hit, disable, and bounce feedback without touching rendering', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 50, 50);

    damage(world, player);
    player.invuln = 0;
    damage(world, player);

    expect(world.events[0]).toContain('Disabled · p1');
    expect(world.events[1]).toContain('Hit · p1 · HP 0');
    expect(world.effects.filter((effect) => effect.type === 'poof')).toHaveLength(2);
    expect(world.effects[0]?.life).toBe(0.52);
  });
});

describe('firing limits and muzzle sweep', () => {
  it('caps three active shells per player independently', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 500, 250);
    const ally = createTank('p2', 'player', 600, 250);
    world.players = [player, ally];

    for (let index = 0; index < CONFIG.activeShellLimit; index += 1) {
      player.cooldown = 0;
      expect(shoot(world, player)).toBe(true);
    }

    player.cooldown = 0;
    expect(shoot(world, player)).toBe(false);
    expect(activeShells(world, player.id)).toBe(CONFIG.activeShellLimit);

    ally.cooldown = 0;
    expect(shoot(world, ally)).toBe(true);
  });

  it('honours firing cooldown before the shell cap', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 500, 250);
    world.players = [player];

    expect(shoot(world, player)).toBe(true);
    expect(shoot(world, player)).toBe(false);
    expect(player.cooldown).toBe(CONFIG.firingCooldown);

    player.cooldown = 0;
    expect(shoot(world, player)).toBe(true);
  });

  it('uses the slower enemy shell speed factor', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 100, 100);
    world.enemies = [enemy];

    expect(shoot(world, enemy)).toBe(true);

    const shell = world.shells[0];
    expect(shell).toBeDefined();
    if (shell === undefined) {
      return;
    }
    expect(Math.hypot(shell.vx, shell.vy)).toBeCloseTo(
      CONFIG.shellSpeed * CONFIG.enemyShellSpeedFactor,
      8,
    );
  });

  it('sweeps a fresh shell out of the barrel', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 200, 200);
    player.angle = 0;
    world.players = [player];

    expect(shoot(world, player)).toBe(true);

    expect(world.shells[0]?.x).toBeCloseTo(223, 8);
    expect(world.shells[0]?.y).toBeCloseTo(200, 8);
  });

  it('never spawns a shell beyond a nearby wall', () => {
    const world = createEmptyWorld('coop');
    world.walls = [{ x: 100, y: 0, w: 40, h: 200 }];
    const player = createTank('p1', 'player', 80, 100);
    player.angle = 0;
    world.players = [player];

    expect(shoot(world, player)).toBe(true);

    const shell = world.shells[0];
    expect(shell).toBeDefined();
    if (shell === undefined) {
      return;
    }
    expect(shell.dead).toBe(false);
    expect(shell.bounces).toBe(1);
    expect(shell.x).toBeLessThan(100);
    expect(shell.vx).toBeLessThan(0);
  });

  it('keeps room shells and shots counted from a real world', () => {
    const world = createWorld(0, 'coop');
    const player = world.players[0];
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    player.cooldown = 0;
    expect(shoot(world, player)).toBe(true);
    expect(world.shots).toBe(1);
    expect(world.nextShell).toBe(1);
  });
});
