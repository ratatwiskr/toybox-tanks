export type Faction = 'player' | 'enemy';

export type EnemyKind = 'sentry' | 'roamer' | 'bruiser' | 'lobber' | 'prankster';

export type SimulationEvent =
  | { readonly type: 'shot'; readonly faction: Faction }
  | { readonly type: 'terrain'; readonly kind: 'bounce' | 'wall' | 'cork' | 'shellCollision' }
  | { readonly type: 'damage'; readonly faction: Faction; readonly destroyed: boolean }
  | { readonly type: 'outcome'; readonly state: 'cleared' | 'defeat' | 'completed' };

export type Mode = 'coop' | 'solo';

export type GameState =
  'menu' | 'playing' | 'paused' | 'cleared' | 'defeat' | 'completed' | 'error';

export type EffectType = 'spark' | 'poof' | 'confetti' | 'jack';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface TraceTarget {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export type TraceSegment = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

export interface BankSolution {
  readonly angle: number;
  readonly segments: TraceSegment[];
  readonly score: number;
}

export interface BankPlan {
  readonly solution: BankSolution;
  readonly time: number;
}

export interface EnemyAi {
  mode: 'patrol' | 'chase' | 'flee';
  path: Point[];
  wait: number;
  last: Point | null;
  lost: number;
  scan: number;
  plan: BankPlan | null;
  srch: number | null;
  stuck: number;
}

export interface Command {
  readonly x: number;
  readonly y: number;
  readonly turn: number;
  readonly fire: boolean;
  readonly aim?: number;
  readonly alt?: boolean;
}

export interface Tank {
  readonly id: string;
  readonly faction: Faction;
  readonly kind: EnemyKind | null;
  readonly maxHp: number;
  x: number;
  y: number;
  readonly spawnX: number;
  readonly spawnY: number;
  r: number;
  angle: number;
  heading: number;
  hp: number;
  alive: boolean;
  invuln: number;
  cooldown: number;
  charge: number;
  hurt: number;
  stun: number;
  phase: number;
  vx: number;
  vy: number;
  mineCooldown: number;
  altPrev: boolean;
  targetId: string | null;
  track: number;
  ai: EnemyAi;
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

export interface Mine {
  readonly id: number;
  readonly owner: Tank;
  readonly x: number;
  readonly y: number;
  readonly faction: Faction;
  armed: number;
  dead: boolean;
  fuse?: number;
}

export interface Pom {
  readonly id: number;
  readonly faction: Faction;
  x: number;
  y: number;
  readonly tx: number;
  readonly ty: number;
  flight: number;
  readonly life: number;
  readonly blast: number;
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
  mines: Mine[];
  poms: Pom[];
  effects: Effect[];
  events: string[];
  nextShell: number;
  nextMine: number;
  shots: number;
  bounces: number;
  rngState: number;
}
