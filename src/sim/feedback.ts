import type { EffectType, World } from './types';

const MAX_EVENTS = 7;

export function record(world: World, text: string): void {
  world.events.unshift(`${world.time.toFixed(2)}  ${text}`);
  world.events.length = Math.min(MAX_EVENTS, world.events.length);
}

export function poof(world: World, x: number, y: number, type: EffectType): void {
  world.effects.push({
    x,
    y,
    type,
    age: 0,
    life: type === 'spark' ? 0.22 : 0.52,
    seed: world.effects.length * 1.7 + world.time,
  });
}
