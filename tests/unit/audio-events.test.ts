import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config';
import { advanceShell, damage, shoot } from '../../src/sim/combat';
import { MAPS } from '../../src/sim/maps';
import type { Shell, SimulationEvent } from '../../src/sim/types';
import { createEmptyWorld, createTank, evaluateOutcome, stepWorld } from '../../src/sim/world';

function shell(): Shell {
  return {
    id: 1,
    owner: 'p1',
    faction: 'player',
    x: 60,
    y: 100,
    vx: 100,
    vy: 0,
    bounces: 0,
    dead: false,
  };
}

function arena() {
  const world = createEmptyWorld('solo');
  const player = createTank('p1', 'player', 300, 300);
  const enemy = createTank('s0', 'enemy', 700, 100);
  enemy.cooldown = 100;
  world.players = [player];
  world.enemies = [enemy];
  return { world, player, enemy };
}

describe('authoritative simulation audio events', () => {
  it('emits only for real shots, not cooldown or shell-cap rejection', () => {
    const { world, player } = arena();
    const events: SimulationEvent[] = [];
    for (let n = 0; n < CONFIG.activeShellLimit; n += 1) {
      player.cooldown = 0;
      expect(shoot(world, player, events)).toBe(true);
      expect(shoot(world, player, events)).toBe(false);
    }
    player.cooldown = 0;
    expect(shoot(world, player, events)).toBe(false);
    expect(events).toEqual(
      Array.from({ length: CONFIG.activeShellLimit }, () => ({ type: 'shot', faction: 'player' })),
    );
  });

  it('preserves historical feedback while emitting applied damage once', () => {
    const { world, player } = arena();
    const events: SimulationEvent[] = [];
    damage(world, player, events);
    damage(world, player, events);
    player.invuln = 0;
    damage(world, player, events);
    damage(world, player, events);
    expect(events).toEqual([
      { type: 'damage', faction: 'player', destroyed: false },
      { type: 'damage', faction: 'player', destroyed: true },
    ]);
    expect(world.events[0]).toContain('Disabled · p1');
    expect(world.events[1]).toContain('Hit · p1 · HP 0');
  });

  it('distinguishes first bounce from second-wall removal', () => {
    const world = createEmptyWorld('solo');
    world.walls = [
      { x: 100, y: 0, w: 40, h: 200 },
      { x: 0, y: 0, w: 20, h: 200 },
    ];
    const projectile = shell();
    const events: SimulationEvent[] = [];
    advanceShell(world, projectile, 200, events);
    expect(projectile.dead).toBe(true);
    expect(events).toEqual([
      { type: 'terrain', kind: 'bounce' },
      { type: 'terrain', kind: 'wall' },
    ]);
  });

  it('emits cork contact without a bounce', () => {
    const world = createEmptyWorld('solo');
    world.corks = [{ id: 'c1', x: 100, y: 0, w: 40, h: 200, hitsRemaining: 3, destroyed: false }];
    const events: SimulationEvent[] = [];
    advanceShell(world, shell(), 100, events);
    expect(events).toEqual([{ type: 'terrain', kind: 'cork' }]);
    expect(world.corks[0]?.hitsRemaining).toBe(2);
  });

  it('returns a fresh batch per fixed step and never replays history', () => {
    const { world } = arena();
    const first = stepWorld(world, CONFIG.fixedStep, [{ x: 0, y: 0, turn: 0, fire: true }]);
    const second = stepWorld(world, CONFIG.fixedStep);
    expect(first).toEqual([{ type: 'shot', faction: 'player' }]);
    expect(second).toEqual([]);
    expect(second).not.toBe(first);
    world.state = 'paused';
    expect(stepWorld(world, CONFIG.fixedStep)).toEqual([]);
  });

  it('commits defeat once when the last player and enemy die together', () => {
    const { world, player, enemy } = arena();
    player.alive = false;
    enemy.alive = false;
    const events: SimulationEvent[] = [];
    evaluateOutcome(world, events);
    evaluateOutcome(world, events);
    expect(events).toEqual([{ type: 'outcome', state: 'defeat' }]);
  });

  it('commits final completion without an additional room-clear event', () => {
    const { world, enemy } = arena();
    world.room = MAPS.length - 1;
    enemy.alive = false;
    const events: SimulationEvent[] = [];
    evaluateOutcome(world, events);
    expect(events).toEqual([{ type: 'outcome', state: 'completed' }]);
  });

  it('does not change world results when a direct combat collector is supplied', () => {
    const first = arena();
    const second = arena();
    shoot(first.world, first.player);
    shoot(second.world, second.player, []);
    expect(second.world).toEqual(first.world);
  });
});