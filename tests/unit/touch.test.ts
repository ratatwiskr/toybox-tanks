import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { TouchAdapter, TOUCH_TAP_DURATION } from '../../src/input/touch';
import type { Command } from '../../src/sim/types';
import { createWorld, stepWorld } from '../../src/sim/world';

function neutral(): Command {
  return { x: 0, y: 0, turn: 0, fire: false };
}

describe('experimental solo touch gesture adapter', () => {
  it('preserves other input when no touch channel is engaged', () => {
    const adapter = new TouchAdapter();
    const fallback = { x: 0.4, y: -0.2, turn: 0, fire: true, aim: 1.2 };
    expect(adapter.readCommand(fallback)).toEqual(fallback);
  });

  it('clamps diagonal movement and applies the existing stick deadzone', () => {
    const adapter = new TouchAdapter();
    adapter.begin('move', 1, 0, 0, 50, 0);
    adapter.move(1, 100, 100);
    const command = adapter.readCommand(neutral());
    expect(Math.hypot(command.x, command.y)).toBeCloseTo(1, 10);
    expect(command.x).toBeCloseTo(command.y, 10);

    adapter.move(1, 2, 2);
    expect(adapter.readCommand(neutral())).toEqual(neutral());
    adapter.end(1, 2, 2, 100);
    expect(adapter.readCommand(neutral())).toEqual(neutral());
  });

  it('owns one pointer per pad and never steals an occupied channel', () => {
    const adapter = new TouchAdapter();
    expect(adapter.begin('move', 1, 50, 0, 50, 0)).toBe(true);
    expect(adapter.begin('move', 2, -50, 0, 50, 0)).toBe(false);
    expect(adapter.begin('aim', 1, 0, 0, 50, 0)).toBe(false);
    expect(adapter.begin('aim', 2, 0, 0, 50, 0)).toBe(true);
    adapter.move(2, 0, -50);
    const command = adapter.readCommand(neutral());
    expect(command.x).toBeCloseTo(1, 10);
    expect(command.aim).toBeCloseTo(-Math.PI / 2, 10);
    expect(command.fire).toBe(false);

    adapter.end(1, 50, 0, 100);
    const released = adapter.readCommand(neutral());
    expect(released.x).toBe(0);
    expect(released.aim).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('drags to aim without firing and stops aiming on release', () => {
    const adapter = new TouchAdapter();
    adapter.begin('aim', 1, 0, 0, 50, 0);
    adapter.move(1, 50, 0);
    expect(adapter.readCommand(neutral())).toEqual({ ...neutral(), aim: 0 });
    adapter.end(1, 50, 0, 100);
    expect(adapter.readCommand(neutral())).toEqual(neutral());
  });

  it('never converts a drag back into a tap after returning to its origin', () => {
    const adapter = new TouchAdapter();
    adapter.begin('aim', 1, 0, 0, 50, 0);
    adapter.move(1, 40, 0);
    adapter.move(1, 0, 0);
    adapter.end(1, 0, 0, 100);
    expect(adapter.readCommand(neutral()).fire).toBe(false);
  });

  it('checks release displacement even if no move event arrived', () => {
    const adapter = new TouchAdapter();
    adapter.begin('aim', 1, 0, 0, 50, 0);
    adapter.end(1, 40, 0, 100);
    expect(adapter.readCommand(neutral()).fire).toBe(false);
  });

  it('fires a short tap exactly once without changing aim', () => {
    const adapter = new TouchAdapter();
    adapter.begin('aim', 1, 35, -20, 50, 0);
    expect(adapter.readCommand(neutral())).toEqual(neutral());
    adapter.end(1, 36, -21, 100);
    expect(adapter.readCommand(neutral())).toEqual({ ...neutral(), fire: true });
    expect(adapter.readCommand(neutral())).toEqual(neutral());
  });

  it('does not turn a long stationary hold into firing', () => {
    const adapter = new TouchAdapter();
    adapter.begin('aim', 1, 0, 0, 50, 0);
    adapter.end(1, 0, 0, TOUCH_TAP_DURATION + 1);
    expect(adapter.readCommand(neutral())).toEqual(neutral());
  });

  it('cancels without firing and leaves the other pointer active', () => {
    const adapter = new TouchAdapter();
    adapter.begin('move', 1, 50, 0, 50, 0);
    adapter.begin('aim', 2, 0, 0, 50, 0);
    adapter.cancel(2);
    adapter.end(2, 0, 0, 100);
    const command = adapter.readCommand(neutral());
    expect(command.x).toBeCloseTo(1, 10);
    expect(command.fire).toBe(false);
    expect(command.aim).toBeUndefined();
  });

  it('clears held gestures and pending shots and requires a fresh begin', () => {
    const adapter = new TouchAdapter();
    adapter.begin('move', 1, 0, 0, 50, 0);
    adapter.begin('aim', 2, 0, 0, 50, 0);
    adapter.end(2, 0, 0, 100);
    adapter.clear();
    adapter.move(1, 50, 0);
    adapter.end(1, 50, 0, 200);
    adapter.end(2, 0, 0, 200);
    expect(adapter.readCommand(neutral())).toEqual(neutral());
    expect(adapter.begin('aim', 2, 0, 0, 50, 300)).toBe(true);
    adapter.end(2, 0, 0, 400);
    expect(adapter.readCommand(neutral()).fire).toBe(true);
  });

  it('overrides only engaged channels and restores fallback on release', () => {
    const adapter = new TouchAdapter();
    const fallback = { x: -1, y: 0, turn: 1, fire: false };
    adapter.begin('move', 1, 0, 0, 50, 0);
    expect(adapter.readCommand(fallback)).toEqual({ ...fallback, x: 0 });
    adapter.begin('aim', 2, 0, 0, 50, 0);
    adapter.move(2, 0, 50);
    expect(adapter.readCommand(fallback)).toEqual({
      ...fallback,
      x: 0,
      turn: 0,
      aim: Math.PI / 2,
    });
    adapter.clear();
    expect(adapter.readCommand(fallback)).toEqual(fallback);
  });

  it('retains the actual world angle after release and fires a subsequent tap', () => {
    const adapter = new TouchAdapter();
    const world = createWorld(0, 'solo');
    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Solo player missing');
    }
    const startAngle = player.angle;
    adapter.begin('aim', 1, 0, 0, 50, 0);
    adapter.move(1, 50, 0);
    stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral())]);
    const actualAngle = player.angle;
    expect(actualAngle).toBeCloseTo(startAngle + CONFIG.turretRotationSpeed * CONFIG.fixedStep, 10);
    expect(actualAngle).toBeLessThan(0);
    expect(world.shots).toBe(0);
    adapter.end(1, 50, 0, 100);
    stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral())]);
    expect(player.angle).toBeCloseTo(actualAngle, 10);
    expect(world.shots).toBe(0);

    adapter.begin('aim', 1, -30, -30, 50, 200);
    adapter.end(1, -30, -30, 250);
    stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral())]);
    expect(player.angle).toBeCloseTo(actualAngle, 10);
    expect(world.shots).toBe(1);
    for (let tick = 0; tick < 40; tick += 1) {
      stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral())]);
      expect(player.angle).toBeCloseTo(actualAngle, 10);
    }
    expect(world.shots).toBe(1);
  });

  it('discards a cooldown-blocked tap instead of firing it later', () => {
    const adapter = new TouchAdapter();
    const world = createWorld(0, 'solo');
    const player = world.players[0];
    if (player === undefined) {
      throw new Error('Solo player missing');
    }
    player.cooldown = CONFIG.firingCooldown;
    adapter.begin('aim', 1, 0, 0, 50, 0);
    adapter.end(1, 0, 0, 100);
    for (let tick = 0; tick < 40; tick += 1) {
      stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral())]);
    }
    expect(world.shots).toBe(0);
  });
});
