export type Faction = 'player' | 'enemy';

export type Mode = 'coop' | 'solo';

export type GameState =
  'menu' | 'playing' | 'paused' | 'cleared' | 'defeat' | 'completed' | 'error';

export type EffectType = 'spark' | 'poof';

export interface Command {
  readonly x: number;
  readonly y: number;
  readonly turn: number;
  readonly fire: boolean;
  readonly aim?: number;
}

export interface Tank {
  readonly id: string;
  readonly faction: Faction;
  x: number;
  y: number;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly r: number;
  angle: number;
  hp: number;
  alive: boolean;
  invuln: number;
  cooldown: number;
  charge: number;
  targetId: string | null;
  track: number;
}

export interface Shell {
  readonly id: number;
  readonly owner: string;
  readonly faction: Faction;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  dead: boolean;
}

export interface Wall {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Cork extends Wall {
  readonly id: string;
  hitsRemaining: number;
  destroyed: boolean;
}

export interface Effect {
  readonly x: number;
  readonly y: number;
  readonly type: EffectType;
  age: number;
  readonly life: number;
  readonly seed: number;
}

export interface World {
  room: number;
  mode: Mode;
  state: GameState;
  time: number;
  walls: Wall[];
  corks: Cork[];
  players: Tank[];
  enemies: Tank[];
  shells: Shell[];
  effects: Effect[];
  events: string[];
  nextShell: number;
  shots: number;
  bounces: number;
}
