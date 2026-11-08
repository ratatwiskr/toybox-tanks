import type { SimulationEvent } from '../sim/types';

export type SoundId =
  | 'playerFire'
  | 'enemyFire'
  | 'bounce'
  | 'softImpact'
  | 'hardImpact'
  | 'playerHit'
  | 'playerDisabled'
  | 'enemyHit'
  | 'enemyDestroyed'
  | 'roomClear'
  | 'gameComplete';

export function soundForEvent(event: SimulationEvent): SoundId | null {
  switch (event.type) {
    case 'shot':
      return event.faction === 'player' ? 'playerFire' : 'enemyFire';
    case 'terrain':
      return event.kind === 'bounce'
        ? 'bounce'
        : event.kind === 'cork'
          ? 'softImpact'
          : 'hardImpact';
    case 'damage':
      return event.faction === 'player'
        ? event.destroyed
          ? 'playerDisabled'
          : 'playerHit'
        : event.destroyed
          ? 'enemyDestroyed'
          : 'enemyHit';
    case 'outcome':
      return event.state === 'completed'
        ? 'gameComplete'
        : event.state === 'cleared'
          ? 'roomClear'
          : null;
  }
}
