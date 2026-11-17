import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { solveBank } from '../../src/sim/ballistics';
import { hasLOS } from '../../src/sim/collision';
import { layMine } from '../../src/sim/combat';
import { updateEnemy } from '../../src/sim/enemies';
import { KINDS } from '../../src/sim/kinds';
import { createEmptyWorld, createTank, stepWorld } from '../../src/sim/world';

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

describe('bruiser behaviour', () => {
  function bankArena() {
    const world = createEmptyWorld('coop');
    world.walls = [
      { x: 40, y: 40, w: 880, h: 40 }, // top
      { x: 40, y: 460, w: 880, h: 40 }, // bottom
      { x: 40, y: 40, w: 40, h: 460 }, // left
      { x: 880, y: 40, w: 40, h: 460 }, // right
      { x: 400, y: 40, w: 40, h: 260 }, // divider with a gap at the bottom
    ];
    const enemy = createTank('b0', 'enemy', 300, 200, 'bruiser');
    const player = createTank('p1', 'player', 520, 200);
    world.enemies = [enemy];
    world.players = [player];
    return { world, enemy, player };
  }

  it('finds a one-bounce bank solution around a corner', () => {
    const { world, enemy, player } = bankArena();

    // No straight line of sight: the divider blocks it.
    expect(hasLOS(world, enemy, player)).toBe(false);

    const solution = solveBank(world, enemy, player);
    expect(solution).not.toBeNull();
    expect(solution?.segments).toHaveLength(2);
  });

  it('telegraphs the bank and fires the banked shot', () => {
    const { world, enemy } = bankArena();
    enemy.cooldown = 0;

    // step until the plan forms and fires
    let fired = false;
    for (let step = 0; step < 400; step += 1) {
      updateEnemy(world, enemy, 1 / 60);
      if (world.shots > 0) {
        fired = true;
        break;
      }
    }
    expect(fired).toBe(true);
    expect(enemy.ai.plan).toBeNull();
    expect(world.shells[0]?.faction).toBe('enemy');
  });

  it('does not fire when there is neither a bank solution nor line of sight', () => {
    const world = createEmptyWorld('coop');
    // Fully enclose the player in a sealed box.
    world.walls = [
      { x: 500, y: 100, w: 20, h: 120 },
      { x: 620, y: 100, w: 20, h: 120 },
      { x: 500, y: 100, w: 140, h: 20 },
      { x: 500, y: 200, w: 140, h: 20 },
    ];
    const enemy = createTank('b0', 'enemy', 200, 300, 'bruiser');
    const player = createTank('p1', 'player', 560, 160);
    world.enemies = [enemy];
    world.players = [player];

    stepEnemy(world, enemy, 5);

    expect(world.shots).toBe(0);
  });

  it('shortens the fire interval when raging at hp <= 2', () => {
    function measureInterval(hp: number): number {
      const world = createEmptyWorld('coop');
      world.walls = [
        { x: 40, y: 40, w: 880, h: 40 },
        { x: 40, y: 460, w: 880, h: 40 },
        { x: 40, y: 40, w: 40, h: 460 },
        { x: 880, y: 40, w: 40, h: 460 },
      ];
      const enemy = createTank('b0', 'enemy', 200, 250, 'bruiser');
      enemy.hp = hp;
      enemy.cooldown = 0;
      const player = createTank('p1', 'player', 700, 250);
      // Keep the target alive so the interval, not player death, is measured.
      player.hp = 100;
      world.enemies = [enemy];
      world.players = [player];

      const shotTimes: number[] = [];
      const dt = 1 / 60;
      for (let step = 0; step < 1200; step += 1) {
        const before = world.shots;
        stepWorld(world, dt);
        if (world.shots > before) shotTimes.push(step * dt);
        if (shotTimes.length >= 4) break;
      }
      expect(shotTimes.length).toBeGreaterThanOrEqual(3);
      return (shotTimes[3] ?? 0) - (shotTimes[2] ?? 0);
    }

    const normal = measureInterval(5);
    const raging = measureInterval(1);
    expect(raging).toBeLessThan(normal);
    // ~20% cadence reduction: allow a generous window around 0.8x.
    expect(raging / normal).toBeGreaterThan(0.6);
    expect(raging / normal).toBeLessThan(0.95);
  });
});

describe('lobber behaviour', () => {
  it('lobs a pom at a stationary target outside minimum range', () => {
    const world = createEmptyWorld('solo');
    const enemy = createTank('l0', 'enemy', 100, 260, 'lobber');
    enemy.cooldown = 0;
    const player = createTank('p1', 'player', 500, 260);
    world.enemies = [enemy];
    world.players = [player];

    stepEnemy(world, enemy, 3);

    expect(world.poms).toHaveLength(1);
    expect(world.shots).toBe(0);
    expect(world.poms[0]?.faction).toBe('enemy');
    expect(world.poms[0]?.tx).toBeCloseTo(500, 6);
    expect(world.poms[0]?.ty).toBeCloseTo(260, 6);
  });

  it('never fires while the target is inside minimum range, even with no escape path', () => {
    const world = createEmptyWorld('coop');
    world.walls = [
      { x: 150, y: 200, w: 200, h: 20 },
      { x: 150, y: 340, w: 200, h: 20 },
      { x: 150, y: 200, w: 20, h: 160 },
      { x: 330, y: 200, w: 20, h: 160 },
    ];
    const enemy = createTank('l0', 'enemy', 200, 270, 'lobber');
    enemy.cooldown = 0;
    const player = createTank('p1', 'player', 280, 270);
    world.enemies = [enemy];
    world.players = [player];

    stepEnemy(world, enemy, 5);

    expect(Math.hypot(player.x - enemy.x, player.y - enemy.y)).toBeLessThan(KINDS.lobber.minRange);
    expect(world.poms).toHaveLength(0);
    expect(enemy.charge).toBe(0);
  });

  it.each(['solo', 'coop'] as const)('sets the %s cooldown after lobbing', (mode) => {
    const world = createEmptyWorld(mode);
    const enemy = createTank('l0', 'enemy', 100, 260, 'lobber');
    enemy.cooldown = 0;
    const player = createTank('p1', 'player', 500, 260);
    world.enemies = [enemy];
    world.players = [player];

    stepEnemy(world, enemy, 3);

    expect(world.poms).toHaveLength(1);
    const expected = KINDS.lobber.cd * (mode === 'coop' ? 0.85 : 1);
    expect(enemy.cooldown).toBeCloseTo(expected, 8);
  });
});

describe('prankster behaviour', () => {
  it('stops laying once it owns maxMines live mines', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('m0', 'enemy', 200, 300, 'prankster');
    enemy.mineCooldown = 0;
    world.enemies = [enemy];
    for (let index = 0; index < KINDS.prankster.maxMines; index += 1) {
      layMine(world, enemy, 400 + index * 100, 100);
    }
    expect(world.mines).toHaveLength(KINDS.prankster.maxMines);

    stepEnemy(world, enemy, 4);

    expect(world.mines.filter((mine) => mine.owner === enemy && !mine.dead)).toHaveLength(
      KINDS.prankster.maxMines,
    );
  });

  it('does not lay a mine while a player is within 80 px', () => {
    function minesLaid(playerDistance: number): number {
      const world = createEmptyWorld('coop');
      const enemy = createTank('m0', 'enemy', 200, 300, 'prankster');
      enemy.mineCooldown = 0;
      const player = createTank('p1', 'player', 200 + playerDistance, 300);
      world.enemies = [enemy];
      world.players = [player];

      updateEnemy(world, enemy, 1 / 120);

      return world.mines.length;
    }

    expect(minesLaid(79)).toBe(0);
    expect(minesLaid(81)).toBe(1);
  });

  it('flees from a seen player without carrying a gun', () => {
    const world = createEmptyWorld('coop');
    const enemy = createTank('m0', 'enemy', 200, 300, 'prankster');
    const player = createTank('p1', 'player', 500, 300);
    world.enemies = [enemy];
    world.players = [player];

    updateEnemy(world, enemy, 1 / 60);

    expect(enemy.ai.mode).toBe('flee');
    expect(world.shells).toHaveLength(0);
    expect(world.shots).toBe(0);
  });
});
