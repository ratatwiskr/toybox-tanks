import { CONFIG } from '../config';
import { KINDS } from '../sim/kinds';

export interface AssetDef {
  id: string;
  file: string;
  kind: 'tank' | 'tile' | 'sprite' | 'fx' | 'decal';
  sizeTiles: number;
}

// Artwork size is presentation-only. Collision radii stay in CONFIG and KINDS.
const TANK_SIZE = (CONFIG.tankRadius * 2.85) / CONFIG.tile;
const BRUISER_SIZE = (KINDS.bruiser.r * 2.85) / CONFIG.tile;
const POM_MARKER_SIZE = (KINDS.lobber.blast * 2) / CONFIG.tile;

export const ASSET_MANIFEST = {
  'tank-p1': { id: 'tank-p1', file: 'tank-p1.svg', kind: 'tank', sizeTiles: TANK_SIZE },
  'tank-p2': { id: 'tank-p2', file: 'tank-p2.svg', kind: 'tank', sizeTiles: TANK_SIZE },
  'tank-sentry': {
    id: 'tank-sentry',
    file: 'tank-sentry.svg',
    kind: 'tank',
    sizeTiles: TANK_SIZE,
  },
  'tank-roamer': {
    id: 'tank-roamer',
    file: 'tank-roamer.svg',
    kind: 'tank',
    sizeTiles: TANK_SIZE,
  },
  'tank-bruiser': {
    id: 'tank-bruiser',
    file: 'tank-bruiser.svg',
    kind: 'tank',
    sizeTiles: BRUISER_SIZE,
  },
  'tank-lobber': {
    id: 'tank-lobber',
    file: 'tank-lobber.svg',
    kind: 'tank',
    sizeTiles: TANK_SIZE,
  },
  'tank-prankster': {
    id: 'tank-prankster',
    file: 'tank-prankster.svg',
    kind: 'tank',
    sizeTiles: TANK_SIZE,
  },
  wall: { id: 'wall', file: 'wall.svg', kind: 'tile', sizeTiles: 1 },
  'cork-3': { id: 'cork-3', file: 'cork-3.svg', kind: 'tile', sizeTiles: 1 },
  'cork-2': { id: 'cork-2', file: 'cork-2.svg', kind: 'tile', sizeTiles: 1 },
  'cork-1': { id: 'cork-1', file: 'cork-1.svg', kind: 'tile', sizeTiles: 1 },
  'mine-armed': { id: 'mine-armed', file: 'mine-armed.svg', kind: 'sprite', sizeTiles: 0.6 },
  'mine-unarmed': {
    id: 'mine-unarmed',
    file: 'mine-unarmed.svg',
    kind: 'sprite',
    sizeTiles: 0.6,
  },
  pom: { id: 'pom', file: 'pom.svg', kind: 'sprite', sizeTiles: 0.4 },
  'pom-marker': {
    id: 'pom-marker',
    file: 'pom-marker.svg',
    kind: 'sprite',
    sizeTiles: POM_MARKER_SIZE,
  },
  'shell-player': {
    id: 'shell-player',
    file: 'shell-player.svg',
    kind: 'sprite',
    sizeTiles: 0.35,
  },
  'shell-enemy': {
    id: 'shell-enemy',
    file: 'shell-enemy.svg',
    kind: 'sprite',
    sizeTiles: 0.35,
  },
  'fx-spark': { id: 'fx-spark', file: 'fx-spark.svg', kind: 'fx', sizeTiles: 1.2 },
  'fx-poof': { id: 'fx-poof', file: 'fx-poof.svg', kind: 'fx', sizeTiles: 1.2 },
  'fx-confetti': { id: 'fx-confetti', file: 'fx-confetti.svg', kind: 'fx', sizeTiles: 1.2 },
  'fx-jack': { id: 'fx-jack', file: 'fx-jack.svg', kind: 'fx', sizeTiles: 1.2 },
  'fx-explosion': { id: 'fx-explosion', file: 'fx-explosion.svg', kind: 'fx', sizeTiles: 1.2 },
  'decal-scorch': {
    id: 'decal-scorch',
    file: 'decal-scorch.svg',
    kind: 'decal',
    sizeTiles: 1,
  },
} as const satisfies Readonly<Record<string, AssetDef>>;

export type AssetId = keyof typeof ASSET_MANIFEST;
