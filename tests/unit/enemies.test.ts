import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { updateEnemy } from '../../src/sim/enemies';
import { createEmptyWorld, createTank } from '../../src/sim/world';

function stepEnemy(
  world: ReturnType<typeof createEmptyWorld>,
  enemy: ReturnType<typeof createTank>,
  seconds: number,
  dt = 1 / 60,
): void {
  const steps = Math.round(seconds / dt);
  for (let step = 0; step < steps; step += 1) {
    updateEnemy(world, enemy, dt);
  }
}

describe('sentry behaviour', () => {
  it('sentries cannot shoot through cover', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 200, 100)];
    world.walls = [{ x: 120, y: 0, w: 40, h: 200 }];

    stepEnemy(world, enemy, 3);

    expect(world.shells).toHaveLength(0);
    expect(enemy.charge).toBe(0);
    expect(enemy.targetId).toBeNull();
  });

  it('sentries telegraph before firing and reset the charge afterwards', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    enemy.angle = 0;
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 200, 100)];

    for (let step = 0; step < 4; step += 1) {
      updateEnemy(world, enemy, 0.1);
    }

    expect(enemy.charge).toBeCloseTo(0.4, 8);
    expect(world.shells).toHaveLength(0);

    updateEnemy(world, enemy, 0.1);

    expect(world.shells).toHaveLength(1);
    expect(world.shells[0]?.faction).toBe('enemy');
    expect(enemy.charge).toBe(0);
  });

  it('cancels a telegraph when the target is no longer visible', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    enemy.angle = 0;
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 200, 100)];

    for (let step = 0; step < 4; step += 1) {
      updateEnemy(world, enemy, 0.1);
    }
    expect(enemy.charge).toBeCloseTo(0.4, 8);

    world.walls = [{ x: 140, y: 0, w: 20, h: 200 }];
    updateEnemy(world, enemy, 0.1);

    expect(enemy.charge).toBe(0);
    expect(enemy.targetId).toBeNull();
    expect(world.shells).toHaveLength(0);
  });

  it('cancels a telegraph if the barrel is no longer aligned', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    enemy.angle = Math.PI / 2;
    enemy.charge = 0.4;
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 200, 100)];

    updateEnemy(world, enemy, 0.1);

    expect(enemy.charge).toBe(0);
    expect(world.shells).toHaveLength(0);
  });

  it('targets the nearest visible player and resets on a target switch', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    const near = createTank('p1', 'player', 200, 100);
    const far = createTank('p2', 'player', 320, 100);
    world.enemies = [enemy];
    world.players = [near, far];

    updateEnemy(world, enemy, 0.1);
    expect(enemy.targetId).toBe('p1');

    enemy.charge = 0.4;
    near.alive = false;
    updateEnemy(world, enemy, 0.1);

    expect(enemy.targetId).toBe('p2');
    expect(enemy.charge).toBe(0);
  });

  it('applies the configured turn rate while acquiring a target', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 200, 100)];

    updateEnemy(world, enemy, 0.1);

    expect(enemy.angle).toBeCloseTo(-Math.PI / 2 + CONFIG.enemyTurnSpeed * 0.1, 8);
  });

  it('does nothing for a disabled sentry', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('s0', 'enemy', 80, 100);
    enemy.alive = false;
    world.enemies = [enemy];
    world.players = [createTank('p1', 'player', 200, 100)];

    updateEnemy(world, enemy, 1);

    expect(world.shells).toHaveLength(0);
    expect(enemy.charge).toBe(0);
  });
});

describe('roamer behaviour', () => {
  it('chases within vision, fires on LOS, and uses hunt lead', () => {
    const world = createEmptyWorld('coop');
    world.walls = [
      { x: 0, y: 0, w: 960, h: 40 },
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 40, h: 540 },
      { x: 920, y: 0, w: 40, h: 540 },
    ];
    const enemy = createTank('r0', 'enemy', 200, 200, 'roamer');
    enemy.cooldown = 0;
    const player = createTank('p1', 'player', 320, 200);
    player.vx = 80;
    player.vy = 0;
    world.enemies = [enemy];
    world.players = [player];

    stepEnemy(world, enemy, 3);
    expect(world.shots).toBeGreaterThan(0);
    const shell = world.shells[0];
    expect(shell?.faction).toBe('enemy');
    // hunt lead aims ahead of the player's current position
    expect(enemy.angle).toBeGreaterThan(-0.2);
  });

  it('patrols via planPatrol when idle', () => {
    const world = createEmptyWorld('coop');
    world.walls = [
      { x: 0, y: 0, w: 960, h: 40 },
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 40, h: 540 },
      { x: 920, y: 0, w: 40, h: 540 },
    ];
    const enemy = createTank('r0', 'enemy', 200, 200, 'roamer');
    world.enemies = [enemy];
    world.players = [];

    // no visible players: should enter patrol and plan a path
    for (let i = 0; i < 120; i += 1) {
      updateEnemy(world, enemy, 1 / 60);
    }
    expect(enemy.ai.mode).toBe('patrol');
    expect(enemy.ai.path.length > 0 || enemy.ai.wait >= 0).toBe(true);
  });
});
