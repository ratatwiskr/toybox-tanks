import { CONFIG } from '../config';
import type { Command, Mode } from '../sim/types';

// Structural gamepad types keep the adapter testable with synthetic pads and
// keep the read paths explicit. The browser's Gamepad shape is compatible.
export interface GamepadButtonLike {
  readonly pressed: boolean;
  readonly value?: number;
}

export interface GamepadLike {
  readonly index: number;
  readonly id: string;
  readonly connected: boolean;
  readonly axes: readonly number[];
  readonly buttons: readonly (GamepadButtonLike | undefined)[];
}

export interface GamepadSource {
  getGamepads(): readonly (GamepadLike | null)[];
}

export interface GamepadCallbacks {
  onPause(): void;
}

function stick(x = 0, y = 0): { readonly x: number; readonly y: number } {
  const length = Math.hypot(x, y);
  if (length <= CONFIG.stickDeadzone) {
    return { x: 0, y: 0 };
  }

  const scale = Math.min(1, (length - CONFIG.stickDeadzone) / (1 - CONFIG.stickDeadzone)) / length;
  return { x: x * scale, y: y * scale };
}

export class GamepadAdapter {
  private assignments: readonly GamepadLike[] = [];
  private neutral: boolean[] = [true, true];
  private readonly startDown = new Map<number, boolean>();

  clear(): void {
    // A focus/resume must not turn a held stick into movement. The next neutral
    // sample re-arms the assigned pad.
    this.neutral = [true, true];
  }

  get assigned(): readonly GamepadLike[] {
    return this.assignments;
  }

  poll(mode: Mode, source: GamepadSource, callbacks: GamepadCallbacks): void {
    const pads: GamepadLike[] = [];
    try {
      for (const pad of source.getGamepads()) {
        if (pad !== null && pad.connected) {
          pads.push(pad);
        }
      }
    } catch {
      // Browsers may throw while permission policy blocks gamepad access.
    }

    this.assignments = pads.slice(0, mode === 'solo' ? 1 : 2);

    for (const pad of pads) {
      const down = pad.buttons[9]?.pressed === true;
      const previous = this.startDown.get(pad.index) === true;
      if (down && !previous && this.assignments.some((assigned) => assigned.index === pad.index)) {
        callbacks.onPause();
      }
      this.startDown.set(pad.index, down);
    }

    for (const index of [...this.startDown.keys()]) {
      if (!pads.some((pad) => pad.index === index)) {
        this.startDown.delete(index);
      }
    }
  }

  readCommand(index: number, keyboard: Command): Command {
    const pad = this.assignments[index];
    if (pad === undefined) {
      return keyboard;
    }

    const left = stick(pad.axes[0], pad.axes[1]);
    const right = stick(pad.axes[2], pad.axes[3]);
    const fire =
      pad.buttons[0]?.pressed === true ||
      pad.buttons[7]?.pressed === true ||
      (pad.buttons[7]?.value ?? 0) > 0.3;

    if (this.neutral[index] !== false) {
      if (left.x === 0 && left.y === 0 && right.x === 0 && right.y === 0 && !fire) {
        this.neutral[index] = false;
      }
      return keyboard;
    }

    let x = keyboard.x;
    let y = keyboard.y;
    const turn = keyboard.turn;
    let aim = keyboard.aim;
    const mergedFire = keyboard.fire || fire;

    if (x === 0 && y === 0) {
      x = left.x;
      y = left.y;
    }

    if (turn === 0 && (right.x !== 0 || right.y !== 0)) {
      aim = Math.atan2(right.y, right.x);
    }

    if (aim === undefined) {
      return { x, y, turn, fire: mergedFire };
    }

    return { x, y, turn, fire: mergedFire, aim };
  }
}
