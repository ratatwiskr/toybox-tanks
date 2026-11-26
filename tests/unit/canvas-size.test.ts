import { describe, expect, it } from 'vitest';
import { computeCanvasSize } from '../../src/render/canvas-size';

describe('computeCanvasSize', () => {
  it.each([
    [1, 1],
    [1.25, 1.25],
    [2, 2],
    [3.5, 2],
    [NaN, 1],
    [Infinity, 1],
    [-Infinity, 1],
    [0, 1],
    [-1, 1],
  ])('sizes at DPR %s using %s', (rawDpr, dpr) => {
    expect(computeCanvasSize(960, 540, rawDpr)).toEqual({
      width: 960 * dpr,
      height: 540 * dpr,
      dpr,
    });
  });

  it('rounds fractional pixels and keeps each dimension at least one pixel', () => {
    expect(computeCanvasSize(0.1, 10.4, 2)).toEqual({ width: 1, height: 21, dpr: 2 });
    expect(computeCanvasSize(10.4, 0, 2)).toEqual({ width: 21, height: 1, dpr: 2 });
  });

  it('supports an explicit max DPR', () => {
    expect(computeCanvasSize(960, 540, 3, 1.5)).toEqual({
      width: 1440,
      height: 810,
      dpr: 1.5,
    });
  });
});
