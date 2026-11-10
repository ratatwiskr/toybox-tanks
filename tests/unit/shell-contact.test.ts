import { describe, expect, it } from 'vitest';

import { firstShellContact } from '../../src/sim/shell-contact';
import type { Shell } from '../../src/sim/types';

function shell(id: number, x: number, y: number, vx = 0, vy = 0): Shell {
  return { id, owner: 'p1', faction: 'player', x, y, vx, vy, bounces: 0, dead: false };
}

describe('first shell contact fraction', () => {
  it('finds first contact rather than closest approach', () => {
    expect(firstShellContact(shell(1, 0, 0, 10), shell(2, 20, 0, -10), 1)).toBeCloseTo(0.7, 12);
  });

  it('includes contact exactly at the end of a step', () => {
    expect(firstShellContact(shell(1, 0, 0, 4), shell(2, 10, 0), 1)).toBe(1);
  });

  it('rejects contact beyond the end of the step', () => {
    expect(firstShellContact(shell(1, 0, 0, 4), shell(2, 10.001, 0), 1)).toBeNull();
  });

  it('finds a tangent contact', () => {
    expect(firstShellContact(shell(1, 0, 0, 20), shell(2, 10, 6), 1)).toBeCloseTo(0.5, 12);
  });

  it('rejects a near miss outside the combined radius', () => {
    expect(firstShellContact(shell(1, 0, 0, 20), shell(2, 10, 6.001), 1)).toBeNull();
  });

  it('detects a grazing hit inside the combined radius', () => {
    const t = firstShellContact(shell(1, 0, 0, 20), shell(2, 10, 5.999), 1);
    expect(t).not.toBeNull();
    expect(t).toBeLessThan(0.5);
  });

  it('preserves initial overlap even for separating shells', () => {
    expect(firstShellContact(shell(1, 0, 0, -10), shell(2, 5, 0, 10), 1)).toBe(0);
  });

  it('does not collide separated parallel shells', () => {
    expect(firstShellContact(shell(1, 0, 0, 10), shell(2, 20, 0, 10), 1)).toBeNull();
  });

  it('does not collide separated diverging shells', () => {
    expect(firstShellContact(shell(1, 0, 0, -10), shell(2, 20, 0, 10), 1)).toBeNull();
  });

  it('allows a faster shell to catch a slower same-owner shell', () => {
    expect(firstShellContact(shell(1, 0, 0, 30), shell(2, 20, 0, 10), 1)).toBeCloseTo(0.7, 12);
  });

  it('is symmetric under pair reversal', () => {
    const a = shell(1, 20, 30, 90, 10);
    const b = shell(2, 80, 40, -60, -5);
    expect(firstShellContact(a, b, 1)).toBe(firstShellContact(b, a, 1));
  });

  it.each([0, -1, Infinity, NaN])('rejects invalid duration %s', (dt) => {
    expect(firstShellContact(shell(1, 0, 0), shell(2, 0, 0), dt)).toBeNull();
  });
});
