// Positive guardrail fixture: environment-neutral simulation code that must lint
// clean under the sim restriction overlay.

export type Direction = 'north' | 'south';

export interface Move {
  readonly x: number;
  readonly y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function step(direction: Direction, amount: number): Move {
  switch (direction) {
    case 'north':
      return { x: 0, y: -amount };
    case 'south':
      return { x: 0, y: amount };
  }
}
