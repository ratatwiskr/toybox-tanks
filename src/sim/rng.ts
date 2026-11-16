export function nextRandom(world: { rngState: number }): number {
  let state = world.rngState | 0;
  state = (state + 0x6d2b79f5) | 0;
  world.rngState = state;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
