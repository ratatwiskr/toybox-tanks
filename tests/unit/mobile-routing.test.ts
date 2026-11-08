import { describe, expect, it } from 'vitest';

import { GamepadAdapter } from '../../src/input/gamepad';
import { gamepadMode, gamepadSlot } from '../../src/input/mobile';
import type { Command } from '../../src/sim/types';

const neutral: Command = { x: 0, y: 0, turn: 0, fire: false };

function pad(index: number) {
  return {
    index,
    id: `Test pad ${String(index)}`,
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}

describe('mobile gamepad routing contract', () => {
  it('preserves both gamepad slots in co-op when touch is disabled', () => {
    expect(gamepadMode('coop', false)).toBe('coop');
    expect(gamepadSlot(0, 'coop', false)).toBe(0);
    expect(gamepadSlot(1, 'coop', false)).toBe(1);
    const adapter = new GamepadAdapter();
    const first = pad(0);
    const second = pad(1);
    adapter.poll(
      gamepadMode('coop', false),
      { getGamepads: () => [first, second] },
      {
        onPause: () => undefined,
      },
    );
    expect(adapter.assigned).toHaveLength(2);
    adapter.readCommand(0, neutral);
    adapter.readCommand(1, neutral);
    first.axes[0] = 1;
    second.axes[0] = -1;
    expect(adapter.readCommand(0, neutral).x).toBeCloseTo(1, 10);
    expect(adapter.readCommand(1, neutral).x).toBeCloseTo(-1, 10);
  });

  it('reserves P1 for touch and gives the first controller to P2 in mixed co-op', () => {
    expect(gamepadMode('coop', true)).toBe('solo');
    expect(gamepadSlot(0, 'coop', true)).toBeNull();
    const slot = gamepadSlot(1, 'coop', true);
    expect(slot).toBe(0);
    if (slot === null) {
      throw new Error('P2 requires a gamepad slot');
    }
    const adapter = new GamepadAdapter();
    const first = pad(4);
    const extra = pad(7);
    adapter.poll(
      gamepadMode('coop', true),
      { getGamepads: () => [first, extra] },
      {
        onPause: () => undefined,
      },
    );
    expect(adapter.assigned).toHaveLength(1);
    expect(adapter.assigned[slot]?.index).toBe(4);
    adapter.readCommand(slot, neutral);
    first.axes[0] = 1;
    extra.axes[0] = -1;
    expect(adapter.readCommand(slot, neutral).x).toBeCloseTo(1, 10);
  });

  it.each([true, false])('keeps solo on the first slot with touch enabled=%s', (touch) => {
    expect(gamepadMode('solo', touch)).toBe('solo');
    expect(gamepadSlot(0, 'solo', touch)).toBe(0);
  });

  it('retains the neutral-input gate after clearing a controller', () => {
    const adapter = new GamepadAdapter();
    const first = pad(0);
    adapter.poll('solo', { getGamepads: () => [first] }, { onPause: () => undefined });
    adapter.readCommand(0, neutral);
    first.axes[0] = 1;
    expect(adapter.readCommand(0, neutral).x).toBeCloseTo(1, 10);
    adapter.clear();
    expect(adapter.readCommand(0, neutral)).toEqual(neutral);
    first.axes[0] = 0;
    adapter.readCommand(0, neutral);
    first.axes[0] = 1;
    expect(adapter.readCommand(0, neutral).x).toBeCloseTo(1, 10);
  });
});
