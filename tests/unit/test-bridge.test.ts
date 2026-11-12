import { describe, expect, it } from 'vitest';

import { MAPS } from '../../src/sim/maps';
import { createTestBridge } from '../../src/test-bridge';
import type { TestBridgeHost } from '../../src/test-bridge';
import type { Command, World } from '../../src/sim/types';
import { createEmptyWorld, createWorld } from '../../src/sim/world';

function neutral(): Command {
  return { x: 0, y: 0, turn: 0, fire: false };
}

interface Harness {
  readonly host: TestBridgeHost;
  world(): World;
  manualClock(): boolean;
  renders(): number;
  cleared(): boolean;
  errors(): string;
  setCommands(commands: readonly Command[]): void;
}

function harness(): Harness {
  let world = createWorld(0, 'coop');
  let manual = false;
  let renders = 0;
  let clearCalls = 0;
  let errorMessage = '';
  let sampled: readonly Command[] = [neutral(), neutral()];

  const host: TestBridgeHost = {
    getWorld: () => world,
    replaceWorld: (next) => {
      world = next;
    },
    readCommands: () => sampled,
    takeClock: () => {
      manual = true;
    },
    sync: () => undefined,
    render: () => {
      renders += 1;
    },
    clearInput: () => {
      clearCalls += 1;
    },
    showError: (message) => {
      errorMessage = message;
      world = createEmptyWorld('coop');
      world.state = 'error';
    },
  };

  return {
    host,
    world: () => world,
    manualClock: () => manual,
    renders: () => renders,
    cleared: () => clearCalls > 0,
    errors: () => errorMessage,
    setCommands: (commands) => {
      sampled = commands;
    },
  };
}

describe('test bridge', () => {
  it('loads curated coop and room scenarios with stable snapshots', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);

    const coop = bridge.loadScenario('coop');
    expect(coop.room).toBe(0);
    expect(coop.mode).toBe('coop');
    expect(coop.players).toHaveLength(2);
    expect(coop.enemies).toHaveLength(2);
    expect(state.manualClock()).toBe(true);

    const room = bridge.loadScenario('room', { room: 3, mode: 'solo' });
    expect(room.room).toBe(3);
    expect(room.mode).toBe('solo');
    expect(room.players).toHaveLength(1);
    expect(room.enemies).toHaveLength(4);
  });

  it('rejects invalid room options and advance counts', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);

    expect(() => bridge.loadScenario('room', { room: MAPS.length })).toThrow(/Room must be/);
    expect(() => bridge.loadScenario('room', { room: -1 })).toThrow(/Room must be/);
    expect(() => bridge.advanceTicks(1.5)).toThrow(/integer/);
    expect(() => bridge.advanceTicks(100_001)).toThrow(/integer/);
  });

  it('builds an active shell and disabled-player scene', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);

    const shot = bridge.loadScenario('active-shot');
    expect(shot.shells).toHaveLength(1);
    expect(shot.shells[0]?.owner).toBe('p1');
    expect(shot.shots).toBe(1);

    const disabled = bridge.loadScenario('disabled-player');
    expect(disabled.players[1]?.alive).toBe(false);
    expect(disabled.players[1]?.hp).toBe(0);
  });

  it('builds outcome and error scenarios through the real evaluator', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);

    expect(bridge.loadScenario('cleared').state).toBe('cleared');
    expect(bridge.loadScenario('defeat').state).toBe('defeat');
    expect(bridge.loadScenario('completed').state).toBe('completed');

    const error = bridge.loadScenario('error');
    expect(error.state).toBe('error');
    expect(state.errors()).toMatch(/invalid room/);
  });

  it('advances by an explicit fixed tick count without real time', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);
    bridge.loadScenario('coop');

    const before = bridge.snapshot();
    const after = bridge.advanceTicks(120);
    expect(after.ticks).toBe(120);
    expect(after.time).toBeCloseTo(1, 6);
    expect(after.players).toEqual(before.players);
  });

  it('samples the real input adapter when requested', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);
    bridge.loadScenario('coop');

    const before = bridge.snapshot();
    state.setCommands([{ x: 1, y: 0, turn: 0, fire: false }, neutral()]);
    const after = bridge.advanceTicks(12, { sampleInput: true });

    const first = after.players[0];
    const previous = before.players[0];
    expect(first).toBeDefined();
    expect(previous).toBeDefined();
    if (first === undefined || previous === undefined) {
      return;
    }
    expect(first.x).toBeGreaterThan(previous.x);
    expect(first.y).toBeCloseTo(previous.y, 6);
  });

  it('is deterministic for the same explicit command sequence', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);

    bridge.loadScenario('coop');
    const commands = Array.from({ length: 30 }, () => ({
      x: 1,
      y: 0.2,
      turn: 0.3,
      fire: false,
    }));
    const first = bridge.advanceTicks(commands.length, { commands });
    const firstSnapshot = bridge.snapshot();

    bridge.loadScenario('coop');
    const second = bridge.advanceTicks(commands.length, { commands });
    expect(second).toEqual(first);
    expect(bridge.snapshot()).toEqual(firstSnapshot);
  });

  it('rejects mixed command and sampled-input modes', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);
    bridge.loadScenario('coop');

    expect(() => bridge.advanceTicks(1, { commands: [neutral()], sampleInput: true })).toThrow(
      /either commands or sampleInput/,
    );
  });

  it('exposes copies for rendering, events, and input clearing', () => {
    const state = harness();
    const bridge = createTestBridge(state.host);
    bridge.loadScenario('coop');

    bridge.render();
    expect(state.renders()).toBe(1);

    const events = bridge.events();
    expect(events.length).toBeGreaterThan(0);
    expect(bridge.events()).not.toBe(events);

    bridge.clearInput();
    expect(state.cleared()).toBe(true);
  });
});
