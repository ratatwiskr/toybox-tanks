import { CONFIG } from './config';
import { KINDS, MINE } from './sim/kinds';
import type { Cork, Mine, Pom, World } from './sim/types';
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
  {
    id: 'enemy-kinds',
    purpose:
      'Sentry, Roamer, Bruiser, Lobber, and Prankster art, colors, labels, HP pips, and bank telegraph.',
  },
  {
    id: 'mines-armed',
    purpose: 'Unarmed, armed, and chain-fused jack-in-the-box mines on the floor.',
  },
  {
    id: 'lobber-pom',
    purpose: 'A lobbed pom in flight with its red landing ring above the floor.',
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
    case 'enemy-kinds': {
      const kinds = ['sentry', 'roamer', 'bruiser', 'lobber', 'prankster'] as const;
      const symbols = {
        sentry: 's',
        roamer: 'r',
        bruiser: 'b',
        lobber: 'l',
        prankster: 'm',
      } as const;
      world.enemies = kinds.map((kind, index) => {
        const positioned = createTank(
          `${symbols[kind]}${String(index)}`,
          'enemy',
          240 + index * 155,
          150,
          kind,
        );
        positioned.angle = -Math.PI / 2 + (index - 2) * 0.4;
        return positioned;
      });
      const bruiser = world.enemies[2];
      if (bruiser !== undefined) {
        bruiser.hp = 3;
        bruiser.ai.plan = {
          solution: {
            angle: 0,
            score: 1,
            segments: [
              { x1: bruiser.x + 18, y1: bruiser.y, x2: bruiser.x + 150, y2: bruiser.y - 40 },
              { x1: bruiser.x + 150, y1: bruiser.y - 40, x2: bruiser.x + 210, y2: bruiser.y + 70 },
            ],
          },
          time: KINDS.bruiser.teleBank / 2,
        };
      }
      break;
    }
    case 'mines-armed': {
      const p1 = world.players[0];
      const p2 = world.players[1];
      if (p1 === undefined || p2 === undefined) {
        throw new Error('Mine fixture players missing');
      }
      const prankster = createTank('m0', 'enemy', 760, 210, 'prankster');
      world.enemies.push(prankster);
      const mines: Mine[] = [
        { id: 0, owner: p1, x: 320, y: 300, faction: 'player', armed: 0, dead: false },
        {
          id: 1,
          owner: p1,
          x: 520,
          y: 300,
          faction: 'player',
          armed: MINE.armPlayer,
          dead: false,
        },
        {
          id: 2,
          owner: prankster,
          x: 700,
          y: 300,
          faction: 'enemy',
          armed: MINE.arm,
          dead: false,
          fuse: 0.12,
        },
        { id: 3, owner: p2, x: 420, y: 410, faction: 'player', armed: MINE.armPlayer, dead: false },
      ];
      world.mines = mines;
      world.nextMine = mines.length;
      break;
    }
    case 'lobber-pom': {
      const lobber = createTank('l0', 'enemy', 760, 150, 'lobber');
      lobber.angle = Math.PI * 0.75;
      world.enemies.push(lobber);
      const pom: Pom = {
        id: 1,
        faction: 'enemy',
        sx: lobber.x,
        sy: lobber.y,
        x: 560,
        y: 240,
        tx: 420,
        ty: 320,
        flight: KINDS.lobber.flight / 2,
        life: KINDS.lobber.flight,
        blast: KINDS.lobber.blast,
        dead: false,
      };
      world.poms = [pom];
      break;
    }
  }

  return world;
}
