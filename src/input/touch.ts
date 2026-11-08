import { CONFIG } from '../config';
import type { Command } from '../sim/types';

// Provisional CSS-pixel/time thresholds for the experimental phone controls.
export const TOUCH_DRAG_DISTANCE = 10;
export const TOUCH_TAP_DURATION = 250;

export type TouchControl = 'move' | 'aim';

interface Gesture {
  readonly control: TouchControl;
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  readonly startedAt: number;
  readonly radius: number;
  x: number;
  y: number;
  dragged: boolean;
}

export class TouchAdapter {
  private movement: Gesture | null = null;
  private aiming: Gesture | null = null;
  private pendingShot = false;

  // Coordinates are CSS pixels relative to a fixed pad centre. Time comes from
  // the event adapter, never from a clock read in this command-producing core.
  begin(
    control: TouchControl,
    id: number,
    x: number,
    y: number,
    radius: number,
    time: number,
  ): boolean {
    if (
      radius <= 0 ||
      !Number.isFinite(radius) ||
      this.find(id) !== null ||
      (control === 'move' ? this.movement : this.aiming) !== null
    ) {
      return false;
    }

    const gesture: Gesture = {
      control,
      id,
      startX: x,
      startY: y,
      startedAt: time,
      radius,
      x,
      y,
      dragged: false,
    };
    if (control === 'move') {
      this.movement = gesture;
    } else {
      this.aiming = gesture;
    }
    return true;
  }

  move(id: number, x: number, y: number): void {
    const gesture = this.find(id);
    if (gesture === null) {
      return;
    }
    gesture.x = x;
    gesture.y = y;
    if (Math.hypot(x - gesture.startX, y - gesture.startY) > TOUCH_DRAG_DISTANCE) {
      gesture.dragged = true;
    }
  }

  end(id: number, x: number, y: number, time: number): void {
    this.move(id, x, y);
    const gesture = this.find(id);
    if (gesture === null) {
      return;
    }
    const duration = time - gesture.startedAt;
    if (
      gesture.control === 'aim' &&
      !gesture.dragged &&
      duration >= 0 &&
      duration <= TOUCH_TAP_DURATION
    ) {
      // One request for the next simulation tick, not a held trigger or a
      // queue that retries a shot blocked by cooldown or the shell limit.
      this.pendingShot = true;
    }
    this.cancel(id);
  }

  cancel(id: number): void {
    if (this.movement?.id === id) {
      this.movement = null;
    }
    if (this.aiming?.id === id) {
      this.aiming = null;
    }
  }

  clear(): void {
    this.movement = null;
    this.aiming = null;
    this.pendingShot = false;
  }

  readCommand(fallback: Command): Command {
    let x = fallback.x;
    let y = fallback.y;
    let turn = fallback.turn;
    let aim = fallback.aim;
    const fire = fallback.fire || this.pendingShot;
    this.pendingShot = false;

    if (this.movement !== null) {
      const vector = this.vector(this.movement);
      x = vector.x;
      y = vector.y;
    }
    if (this.aiming?.dragged === true) {
      const vector = this.vector(this.aiming);
      if (vector.x !== 0 || vector.y !== 0) {
        aim = Math.atan2(vector.y, vector.x);
        turn = 0;
      }
    }

    return aim === undefined ? { x, y, turn, fire } : { x, y, turn, fire, aim };
  }

  private find(id: number): Gesture | null {
    if (this.movement?.id === id) {
      return this.movement;
    }
    if (this.aiming?.id === id) {
      return this.aiming;
    }
    return null;
  }

  private vector(gesture: Gesture): { readonly x: number; readonly y: number } {
    const x = gesture.x / gesture.radius;
    const y = gesture.y / gesture.radius;
    const length = Math.hypot(x, y);
    if (length <= CONFIG.stickDeadzone) {
      return { x: 0, y: 0 };
    }
    const scale = Math.min(1, (length - CONFIG.stickDeadzone) / (1 - CONFIG.stickDeadzone));
    return { x: (x / length) * scale, y: (y / length) * scale };
  }
}
