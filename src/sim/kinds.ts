import { CONFIG } from '../config';

export interface EnemyKindSpec {
  readonly hp: number;
  readonly r: number;
  readonly speed: number;
  readonly hullTurn: number;
  readonly turn: number;
  readonly shell: number;
  readonly cd: number;
  readonly tele: number;
  readonly teleBank: number;
  readonly vision: number;
  readonly hunt: number;
  readonly minRange: number;
  readonly flight: number;
  readonly blast: number;
  readonly mineCd: number;
  readonly mineCdSeen: number;
  readonly maxMines: number;
  readonly color: string;
  readonly dark: string;
}

export const KINDS: Record<
  'sentry' | 'roamer' | 'bruiser' | 'lobber' | 'prankster',
  EnemyKindSpec
> = {
  sentry: {
    hp: 1,
    r: 15,
    speed: 0,
    hullTurn: 0,
    turn: CONFIG.enemyTurnSpeed,
    shell: CONFIG.enemyShellSpeedFactor,
    cd: CONFIG.enemyFiringInterval,
    tele: CONFIG.enemyTelegraph,
    teleBank: 0,
    vision: 1e9,
    hunt: 0,
    minRange: 0,
    flight: 0,
    blast: 0,
    mineCd: 0,
    mineCdSeen: 0,
    maxMines: 0,
    color: '#b86280',
    dark: '#78384e',
  },
  roamer: {
    hp: 1,
    r: 15,
    speed: 68,
    hullTurn: 4,
    turn: 2.2,
    shell: 0.72,
    cd: 2.2,
    tele: 0.5,
    teleBank: 0,
    vision: 420,
    hunt: 0.35,
    minRange: 0,
    flight: 0,
    blast: 0,
    mineCd: 0,
    mineCdSeen: 0,
    maxMines: 0,
    color: '#e8a33d',
    dark: '#7a4a0e',
  },
  bruiser: {
    hp: 5,
    r: 18,
    speed: 52,
    hullTurn: 3,
    turn: 2.4,
    shell: 0.95,
    cd: 1.7,
    tele: 0.55,
    teleBank: 0.85,
    vision: 520,
    hunt: 0.6,
    minRange: 0,
    flight: 0,
    blast: 0,
    mineCd: 0,
    mineCdSeen: 0,
    maxMines: 0,
    color: '#7a2f57',
    dark: '#3d1230',
  },
  lobber: {
    hp: 2,
    r: 15,
    speed: 34,
    hullTurn: 3,
    turn: 1.6,
    shell: 0,
    cd: 3.4,
    tele: 0.7,
    teleBank: 0,
    vision: 480,
    hunt: 0,
    minRange: 150,
    flight: 1.1,
    blast: 46,
    mineCd: 0,
    mineCdSeen: 0,
    maxMines: 0,
    color: '#46b3a4',
    dark: '#1d5a52',
  },
  prankster: {
    hp: 2,
    r: 15,
    speed: 58,
    hullTurn: 4,
    turn: 2,
    shell: 0,
    cd: 0,
    tele: 0,
    teleBank: 0,
    vision: 420,
    hunt: 0.5,
    minRange: 130,
    flight: 0,
    blast: 0,
    mineCd: 3,
    mineCdSeen: 1.5,
    maxMines: 4,
    color: '#8e5bd1',
    dark: '#432a73',
  },
};

export const MINE = { r: 9, blast: 52, arm: 0.9, armPlayer: 0.4 } as const;
