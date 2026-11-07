import { describe, expect, it } from 'vitest';

import { GamepadAdapter } from '../../src/input/gamepad';
import type { GamepadLike, GamepadSource } from '../../src/input/gamepad';
import type { Command } from '../../src/sim/types';

interface MutablePad {
  index: number;
  id: string;
  connected: boolean;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
}

function makePad(index = 0): MutablePad {
  return {
    index,
    id: `Synthetic Pad ${String(index + 1)}`,
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}

function source(pads: MutablePad[]): GamepadSource {
  return { getGamepads: () => pads };
}

function neutral(): Command {
  return { x: 0, y: 0, turn: 0, fire: false };
}

function poll(adapter: GamepadAdapter, pads: MutablePad[], pauses: string[] = []): void {
  adapter.poll('coop', source(pads), { onPause: () => pauses.push('pause') });
}

describe('gamepad adapter', () => {
  it('ignores pads until an assignment exists', () => {
    const adapter = new GamepadAdapter();
    expect(adapter.readCommand(0, neutral())).toEqual(neutral());
    expect(adapter.assigned).toEqual([]);
  });

  it('gates pad input until every control has been neutral once', () => {
    const adapter = new GamepadAdapter();
    const pad = makePad();
    poll(adapter, [pad]);

    pad.axes[0] = 0.8;
    expect(adapter.readCommand(0, neutral())).toEqual(neutral());

    pad.axes[0] = 0;
    expect(adapter.readCommand(0, neutral())).toEqual(neutral());

    pad.axes[0] = 0.8;
    const command = adapter.readCommand(0, neutral());
    expect(command.x).toBeGreaterThan(0);
    expect(command.y).toBe(0);
  });

  it('applies the deadzone and scales stick magnitude', () => {
    const adapter = new GamepadAdapter();
    const pad = makePad();
    poll(adapter, [pad]);
    adapter.readCommand(0, neutral());

    pad.axes[0] = 0.1;
    pad.axes[1] = 0.1;
    expect(adapter.readCommand(0, neutral()).x).toBe(0);

    pad.axes[0] = 0.61;
    pad.axes[1] = 0;
    const command = adapter.readCommand(0, neutral());
    expect(command.x).toBeGreaterThan(0);
    expect(command.x).toBeLessThan(1);
  });

  it('maps the right stick to an absolute aim and keeps keyboard movement', () => {
    const adapter = new GamepadAdapter();
    const pad = makePad();
    poll(adapter, [pad]);
    adapter.readCommand(0, neutral());

    pad.axes[2] = 0;
    pad.axes[3] = 1;
    const command = adapter.readCommand(0, { x: -1, y: 0, turn: 0, fire: false });
    expect(command.aim).toBeCloseTo(Math.PI / 2, 6);
    expect(command.x).toBe(-1);

    const turning = adapter.readCommand(0, { x: -1, y: 0, turn: 0.4, fire: false });
    expect(turning.aim).toBeUndefined();
    expect(turning.turn).toBe(0.4);
  });

  it('fires from A and the right trigger value while preserving keyboard fire', () => {
    const adapter = new GamepadAdapter();
    const pad = makePad();
    poll(adapter, [pad]);
    adapter.readCommand(0, neutral());

    const fireButton = pad.buttons[0];
    expect(fireButton).toBeDefined();
    if (fireButton === undefined) {
      return;
    }
    fireButton.pressed = true;
    expect(adapter.readCommand(0, neutral()).fire).toBe(true);

    fireButton.pressed = false;
    const trigger = pad.buttons[7];
    expect(trigger).toBeDefined();
    if (trigger === undefined) {
      return;
    }
    trigger.value = 0.4;
    expect(adapter.readCommand(0, neutral()).fire).toBe(true);

    trigger.value = 0;
    expect(adapter.readCommand(0, { x: 0, y: 0, turn: 0, fire: true }).fire).toBe(true);
  });

  it('treats Start as an edge and ignores a held button', () => {
    const adapter = new GamepadAdapter();
    const pad = makePad();
    const pauses: string[] = [];
    poll(adapter, [pad], pauses);

    const start = pad.buttons[9];
    expect(start).toBeDefined();
    if (start === undefined) {
      return;
    }

    start.pressed = true;
    poll(adapter, [pad], pauses);
    poll(adapter, [pad], pauses);
    expect(pauses).toHaveLength(1);

    start.pressed = false;
    poll(adapter, [pad], pauses);
    start.pressed = true;
    poll(adapter, [pad], pauses);
    expect(pauses).toHaveLength(2);
  });

  it('drops assignments and Start state on disconnect', () => {
    const adapter = new GamepadAdapter();
    const pad = makePad();
    const pauses: string[] = [];
    poll(adapter, [pad], pauses);

    const start = pad.buttons[9];
    expect(start).toBeDefined();
    if (start === undefined) {
      return;
    }
    start.pressed = true;
    poll(adapter, [pad], pauses);
    expect(pauses).toHaveLength(1);

    pad.connected = false;
    poll(adapter, [pad], pauses);
    expect(adapter.assigned).toEqual([]);

    pad.connected = true;
    start.pressed = true;
    poll(adapter, [pad], pauses);
    expect(pauses).toHaveLength(2);
    expect(adapter.assigned).toHaveLength(1);
  });

  it('assigns only the first pad in solo and re-arms after clear', () => {
    const adapter = new GamepadAdapter();
    const first = makePad(0);
    const second = makePad(1);
    adapter.poll('solo', source([first, second]), { onPause: () => undefined });
    expect(adapter.assigned).toHaveLength(1);

    adapter.clear();
    first.axes[0] = 0.9;
    expect(adapter.readCommand(0, neutral())).toEqual(neutral());
    first.axes[0] = 0;
    adapter.readCommand(0, neutral());
    first.axes[0] = 0.9;
    expect(adapter.readCommand(0, neutral()).x).toBeGreaterThan(0);
  });

  it('survives a throwing gamepad source', () => {
    const adapter = new GamepadAdapter();
    const failing: GamepadSource = {
      getGamepads: () => {
        throw new Error('blocked');
      },
    };
    expect(() => {
      adapter.poll('coop', failing, { onPause: () => undefined });
    }).not.toThrow();
    expect(adapter.assigned).toEqual([]);
  });

  it('keeps the browser Gamepad shape structurally compatible', () => {
    const pad: GamepadLike = makePad();
    expect(pad.connected).toBe(true);
    expect(pad.buttons).toHaveLength(17);
  });
});
