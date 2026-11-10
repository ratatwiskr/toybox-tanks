import { CONFIG } from './config';
import type { Cork, World } from './sim/types';
import { createTank, createWorld } from './sim/world';
import { createMotionWorld, isMotionScene, MOTION_SCENES } from './visual-motion-scenes';

// Curated test-build fixtures, never campaign rooms or a second renderer.
export const VISUAL_SCENES = [
  {
    id: 'cork-atlas',
    purpose: 'Left to right: 3, 2, 1, 0 hits; the last slot is intentionally empty.',
  },
  {
    id: 'cork-isolated',
    purpose: 'Isolated damaged tiles with floor around cracks, chips, and shadows.',
  },
  {
    id: 'cork-adjacent',
    purpose: 'Adjacent 3, 2, 1, 3 hit tiles; intact follows heavily damaged.',
  },
  {
    id: 'cork-reversed',
    purpose: 'Same spatial arrangement as cork-adjacent, reversed draw iteration.',
  },
  { id: 'cork-aim-blocked', purpose: 'Primary aim stops at intact cork.' },
  {
    id: 'cork-aim-cleared',
    purpose: 'Same placement as blocked aim, but destroyed cork is open floor.',
  },
  {
    id: 'cork-aim-reflected',
    purpose: 'Primary guide reaches wood; reflected guide stops at cork.',
  },
  {
    id: 'combat-feedback',
    purpose:
      'Frozen invulnerability, sentry telegraph, shell factions, bounce ring, spark and poof.',
  },
  ...MOTION_SCENES,
] as const;

export type VisualSceneId = (typeof VISUAL_SCENES)[number]['id'];

function cork(id: string, x: number, y: number, hitsRemaining: number): Cork {
  return {
    id,
    x,
    y,
    w: CONFIG.tile,
    h: CONFIG.tile,
    hitsRemaining,
    destroyed: hitsRemaining === 0,
  };
}

export function createVisualWorld(name: VisualSceneId): World {
  if (!VISUAL_SCENES.some((scene) => scene.id === name)) {
    throw new Error(`Unknown visual scene: ${name}`);
  }
  if (isMotionScene(name)) {
    return createMotionWorld(name);
  }

  const world = createWorld(0, 'coop');
  world.walls = world.walls.filter(
    (wall) =>
      wall.x === 0 ||
      wall.x === CONFIG.width - CONFIG.tile ||
      wall.y === CONFIG.gridY ||
      wall.y === CONFIG.gridY + (CONFIG.rows - 1) * CONFIG.tile,
  );
  world.players = [createTank('p1', 'player', 200, 270), createTank('p2', 'player', 800, 450)];
  world.enemies = [createTank('s0', 'enemy', 800, 130)];
  world.corks = [];
  world.events = [`Synthetic visual fixture: ${name}`];

  const first = world.players[0];
  const enemy = world.enemies[0];
  if (first === undefined || enemy === undefined) {
    throw new Error('Visual fixture entities missing');
  }
  first.angle = 0;

  switch (name) {
    case 'cork-atlas':
      world.corks = [3, 2, 1, 0].map((hits, index) =>
        cork(`atlas-${String(index)}`, 240 + index * 80, 210, hits),
      );
      break;
    case 'cork-isolated':
      world.corks = [cork('isolated-2', 320, 250, 2), cork('isolated-1', 480, 250, 1)];
      break;
    case 'cork-adjacent':
    case 'cork-reversed':
      world.corks = [3, 2, 1, 3].map((hits, index) =>
        cork(`adjacent-${String(index)}`, 320 + index * 40, 250, hits),
      );
      if (name === 'cork-reversed') {
        world.corks.reverse();
      }
      break;
    case 'cork-aim-blocked':
    case 'cork-aim-cleared':
      world.corks = [cork('aim-target', 320, 250, name === 'cork-aim-cleared' ? 0 : 3)];
      break;
    case 'cork-aim-reflected':
      first.x = 300;
      first.y = 160;
      first.angle = Math.PI / 4;
      world.walls.push({ x: 400, y: 250, w: CONFIG.tile, h: CONFIG.tile });
      world.corks = [cork('reflection-target', 320, 330, 3)];
      break;
    case 'combat-feedback':
      first.invuln = CONFIG.postHitInvulnerability;
      enemy.charge = CONFIG.enemyTelegraph / 2;
      world.shells = [
        {
          id: 0,
          owner: 'p1',
          faction: 'player',
          x: 360,
          y: 200,
          vx: 330,
          vy: 0,
          bounces: 0,
          dead: false,
        },
        {
          id: 1,
          owner: 'p2',
          faction: 'player',
          x: 440,
          y: 200,
          vx: 0,
          vy: -330,
          bounces: 1,
          dead: false,
        },
        {
          id: 2,
          owner: 's0',
          faction: 'enemy',
          x: 520,
          y: 200,
          vx: -200,
          vy: 0,
          bounces: 0,
          dead: false,
        },
      ];
      world.nextShell = 3;
      world.shots = 3;
      world.effects = [
        { x: 400, y: 330, type: 'spark', age: 0.08, life: 0.22, seed: 2.4 },
        { x: 520, y: 330, type: 'poof', age: 0.1, life: 0.4, seed: 1.2 },
      ];
      break;
  }

  return world;
}
