import { describe, expect, it } from 'vitest';
import { soundForEvent } from '../../src/audio/events';
import { CONFIG } from '../../src/config';
import { advanceWorld, bodyHeading } from '../../src/presentation/body-heading';
import type { Shell } from '../../src/sim/types';
import { createEmptyWorld, createTank } from '../../src/sim/world';

function fixture() {
  const world = createEmptyWorld('solo');
  const player = createTank('p1', 'player', 300, 300);
  const enemy = createTank('s0', 'enemy', 800, 400);
  enemy.cooldown = 100;
  world.players = [player];
  world.enemies = [enemy];
  return { world, player };
}

function shell(id: number, x: number, vx: number): Shell {
  return {
    id,
    owner: 'p1',
    faction: 'player',
    x,
    y: 100,
    vx,
    vy: 0,
    bounces: 0,
    dead: false,
  };
}

describe('audio events through the shared presentation step', () => {
  it('returns shot events while retaining movement-derived body heading', () => {
    const { world, player } = fixture();
    const events = advanceWorld(world, CONFIG.fixedStep, [
      { x: 1, y: 0, turn: 0, fire: true },
    ]);
    expect(player.x).toBeGreaterThan(300);
    expect(bodyHeading(player)).toBeCloseTo(0, 9);
    expect(events).toEqual([{ type: 'shot', faction: 'player' }]);
    const next = advanceWorld(world, CONFIG.fixedStep);
    expect(next).toEqual([]);
    expect(next).not.toBe(events);
  });

  it('returns one soft-impact event per resolved shell pair, including same owner', () => {
    const { world } = fixture();
    world.shells = [shell(1, 100, 600), shell(2, 106, -600)];
    const events = advanceWorld(world, CONFIG.fixedStep);
    expect(world.shells).toEqual([]);
    expect(events).toEqual([{ type: 'terrain', kind: 'shellCollision' }]);
    expect(events.map(soundForEvent)).toEqual(['softImpact']);
    expect(soundForEvent({ type: 'terrain', kind: 'cork' })).toBe('softImpact');
    expect(advanceWorld(world, CONFIG.fixedStep)).toEqual([]);
  });

  it('returns no events or movement while paused', () => {
    const { world, player } = fixture();
    world.state = 'paused';
    expect(advanceWorld(world, CONFIG.fixedStep, [
      { x: 1, y: 0, turn: 1, fire: true },
    ])).toEqual([]);
    expect(player.x).toBe(300);
    expect(world.shots).toBe(0);
  });
});
