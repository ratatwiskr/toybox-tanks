import { describe, expect, it } from 'vitest';

import { bodyHeading, INITIAL_BODY_HEADING } from '../../src/presentation/body-heading';
import type { Command, Tank, World } from '../../src/sim/types';
import { createEmptyWorld, createTank } from '../../src/sim/world';
import { createTestBridge, type TestBridgeHost } from '../../src/test-bridge';

const EAST: Command = { x: 1, y: 0, turn: 0, fire: false };
const IDLE: Command = { x: 0, y: 0, turn: 0, fire: false };

function openWorld(): World {
  const world = createEmptyWorld('coop');
  world.players = [createTank('p1', 'player', 300, 270), createTank('p2', 'player', 240, 400)];
  const sentry = createTank('s0', 'enemy', 900, 60);
  sentry.cooldown = 1_000;
  world.enemies = [sentry];
  return world;
}

function hostFor(world: World): TestBridgeHost {
  return {
    getWorld: () => world,
    replaceWorld: () => undefined,
    readCommands: () => [],
    takeClock: () => undefined,
    sync: () => undefined,
    render: () => undefined,
    clearInput: () => undefined,
    showError: () => undefined,
  };
}

function firstPlayer(world: World): Tank {
  const tank = world.players[0];
  if (tank === undefined) {
    throw new Error('Player missing');
  }
  return tank;
}

describe('test bridge stepping shares the body heading path', () => {
  it('updates the body heading while advancing ticks', () => {
    const world = openWorld();
    const bridge = createTestBridge(hostFor(world));

    bridge.advanceTicks(3, { commands: [EAST, IDLE] });

    expect(bodyHeading(firstPlayer(world))).toBeCloseTo(0, 9);
    const second = world.players[1];
    if (second === undefined) {
      throw new Error('Second player missing');
    }
    expect(bodyHeading(second)).toBe(INITIAL_BODY_HEADING);
  });

  it('ends with the same heading whether ticks are batched or single', () => {
    const batched = openWorld();
    createTestBridge(hostFor(batched)).advanceTicks(6, { commands: [EAST, IDLE] });

    const single = openWorld();
    const bridge = createTestBridge(hostFor(single));
    for (let tick = 0; tick < 6; tick += 1) {
      bridge.advanceTicks(1, { commands: [EAST, IDLE] });
    }

    expect(bodyHeading(firstPlayer(single))).toBe(bodyHeading(firstPlayer(batched)));
    expect(firstPlayer(single).x).toBe(firstPlayer(batched).x);
  });
});
