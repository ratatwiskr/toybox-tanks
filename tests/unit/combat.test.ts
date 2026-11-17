import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import {
  activeShells,
  advanceShell,
  altWeapon,
  boom,
  damage,
  layMine,
  shoot,
  updateMines,
} from '../../src/sim/combat';
import { KINDS, MINE } from '../../src/sim/kinds';
import type { Shell } from '../../src/sim/types';
import { createEmptyWorld, createTank, createWorld, stepWorld } from '../../src/sim/world';

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

describe('jack-in-the-box mines', () => {
  function mineWorld() {
    const world = createEmptyWorld('coop');
    const enemy = createTank('m0', 'enemy', 700, 300, 'prankster');
    const player = createTank('p1', 'player', 300, 300);
    world.enemies = [enemy];
    world.players = [player];
    return { world, enemy, player };
  }

  it('arms after armPlayer, then a player contact detonates it', () => {
    const { world, enemy, player } = mineWorld();
    const mine = layMine(world, enemy, player.x, player.y);

    updateMines(world, MINE.arm - 0.01);
    expect(mine.dead).toBe(false);
    expect(player.hp).toBe(CONFIG.playerHealth);

    updateMines(world, 0.02);
    expect(mine.dead).toBe(true);
    expect(player.hp).toBe(CONFIG.playerHealth - 1);
  });

  it('arms a player mine after armPlayer and detonates on enemy contact', () => {
    const { world, enemy, player } = mineWorld();
    const mine = layMine(world, player, enemy.x, enemy.y);

    updateMines(world, MINE.armPlayer - 0.01);
    expect(mine.dead).toBe(false);
    expect(enemy.hp).toBe(KINDS.prankster.hp);

    updateMines(world, 0.02);
    expect(mine.dead).toBe(true);
    expect(enemy.hp).toBe(KINDS.prankster.hp - 1);
  });

  it('detonates from an opposing shell but not from a same-faction shell', () => {
    const opposing = mineWorld();
    const hostileMine = layMine(opposing.world, opposing.enemy, 300, 300);
    const playerShell = makeShell(200, 300, 100, 0, 'player');
    advanceShell(opposing.world, playerShell, 150);
    expect(hostileMine.dead).toBe(true);
    expect(playerShell.dead).toBe(true);

    const friendly = mineWorld();
    const friendlyMine = layMine(friendly.world, friendly.enemy, 300, 300);
    const enemyShell = makeShell(200, 300, 100, 0, 'enemy');
    advanceShell(friendly.world, enemyShell, 150);
    expect(friendlyMine.dead).toBe(false);
  });

  it('chains nearby mines on a 0.12 s fuse', () => {
    const { world, enemy } = mineWorld();
    const first = layMine(world, enemy, 300, 300);
    const second = layMine(world, enemy, 330, 300);

    boom(world, first);
    expect(first.dead).toBe(true);
    expect(second.dead).toBe(false);
    expect(second.fuse).toBeCloseTo(0.12, 8);

    updateMines(world, 0.13);
    expect(second.dead).toBe(true);
  });

  it('blocks ground blast damage with a wall but still chips a cork', () => {
    const open = mineWorld();
    const openMine = layMine(open.world, open.enemy, 300, 300);
    open.player.x = 340;
    boom(open.world, openMine);
    expect(open.player.hp).toBe(CONFIG.playerHealth - 1);

    const blocked = mineWorld();
    blocked.player.x = 340;
    blocked.world.walls = [{ x: 318, y: 260, w: 20, h: 80 }];
    const blockedMine = layMine(blocked.world, blocked.enemy, 300, 300);
    boom(blocked.world, blockedMine);
    expect(blocked.player.hp).toBe(CONFIG.playerHealth);

    const corkWorld = mineWorld();
    corkWorld.world.corks = [
      { id: 'c1', x: 320, y: 280, w: 40, h: 40, hitsRemaining: 3, destroyed: false },
    ];
    const corkMine = layMine(corkWorld.world, corkWorld.enemy, 300, 300);
    boom(corkWorld.world, corkMine);
    expect(corkWorld.world.corks[0]?.hitsRemaining).toBe(2);
  });

  it('lays on alt, remote-detonates on the next press, and gates the 1.2 s recharge', () => {
    const world = createEmptyWorld('coop');
    const player = createTank('p1', 'player', 300, 300);
    player.angle = 0;
    const enemy = createTank('s0', 'enemy', 850, 300);
    enemy.cooldown = 999;
    world.players = [player];
    world.enemies = [enemy];
    const neutral = { x: 0, y: 0, turn: 0, fire: false };

    stepWorld(world, CONFIG.fixedStep, [{ ...neutral, alt: true }]);
    expect(world.mines).toHaveLength(1);
    const laid = world.mines[0];
    expect(laid?.owner).toBe(player);

    stepWorld(world, CONFIG.fixedStep, [{ ...neutral, alt: true }]);
    expect(world.mines).toHaveLength(1);

    stepWorld(world, CONFIG.fixedStep, [neutral]);
    stepWorld(world, CONFIG.fixedStep, [{ ...neutral, alt: true }]);
    expect(laid?.dead).toBe(true);
    expect(world.mines).toHaveLength(0);
    expect(player.mineCooldown).toBeCloseTo(1.2, 8);

    stepWorld(world, CONFIG.fixedStep, [neutral]);
    stepWorld(world, CONFIG.fixedStep, [{ ...neutral, alt: true }]);
    expect(world.mines).toHaveLength(0);

    stepWorld(world, CONFIG.fixedStep, [neutral]);
    for (let tick = 0; tick <= Math.ceil(1.2 / CONFIG.fixedStep); tick += 1) {
      stepWorld(world, CONFIG.fixedStep);
    }
    stepWorld(world, CONFIG.fixedStep, [{ ...neutral, alt: true }]);
    expect(world.mines).toHaveLength(1);
  });

  it('exposes altWeapon directly for callers that already performed edge detection', () => {
    const { world, player } = mineWorld();
    player.angle = 0;

    altWeapon(world, player);
    expect(world.mines).toHaveLength(1);
    const mine = world.mines[0];
    expect(mine?.x).toBeCloseTo(player.x - 20, 8);

    altWeapon(world, player);
    expect(mine?.dead).toBe(true);
  });
});
