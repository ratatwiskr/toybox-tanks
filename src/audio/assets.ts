import music from '../assets/audio/music/gameplay.mp3?url';
import softImpact from '../assets/audio/sfx/05_wall_hit_soft.wav?url';
import hardImpact from '../assets/audio/sfx/06_wall_hit_hard.wav?url';
import playerHit from '../assets/audio/sfx/08_player_hit_v1.wav?url';
import playerDisabled from '../assets/audio/sfx/09_player_disabled.wav?url';
import playerFire from '../assets/audio/sfx/15_cannon_fire_player_v1.wav?url';
import enemyFire from '../assets/audio/sfx/16_cannon_fire_enemy_v1.wav?url';
import bounce from '../assets/audio/sfx/18_wall_bounce_v1.wav?url';
import enemyHit from '../assets/audio/sfx/20_enemy_hit_v1.wav?url';
import enemyDestroyed from '../assets/audio/sfx/21_enemy_destroyed_v1.wav?url';
import roomClear from '../assets/audio/sfx/room_clear.wav?url';
import gameComplete from '../assets/audio/sfx/game_complete.wav?url';
import type { SoundId } from './events';

export const MUSIC_URL = music;
export const SOUND_URLS: Readonly<Record<SoundId, string>> = {
  softImpact,
  hardImpact,
  playerHit,
  playerDisabled,
  playerFire,
  enemyFire,
  bounce,
  enemyHit,
  enemyDestroyed,
  roomClear,
  gameComplete,
};

export const SOUND_IDS: readonly SoundId[] = [
  'softImpact',
  'hardImpact',
  'playerHit',
  'playerDisabled',
  'playerFire',
  'enemyFire',
  'bounce',
  'enemyHit',
  'enemyDestroyed',
  'roomClear',
  'gameComplete',
];
