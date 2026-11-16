import { describe, expect, it } from 'vitest';

import { nextRandom } from '../../src/sim/rng';
import { createEmptyWorld } from '../../src/sim/world';

describe('world rng', () => {
  it('is deterministic for a fixed seed and mutates rngState', () => {
    const a = createEmptyWorld('coop');
    const b = createEmptyWorld('coop');
    a.rngState = 1234;
    b.rngState = 1234;

    const seqA = [nextRandom(a), nextRandom(a), nextRandom(a)];
    const seqB = [nextRandom(b), nextRandom(b), nextRandom(b)];

    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(a.rngState).toBe(b.rngState);
    expect(a.rngState).not.toBe(1234);
  });
});
