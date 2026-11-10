import { CONFIG } from './config';
import { advanceWorld } from './presentation/body-heading';
import type { Command, World } from './sim/types';
import { createTank, createWorld } from './sim/world';

export const MOTION_SCENES = [
  { id: 'body-aim-independent', purpose: 'Horizontal movement, upward turret aim, then a neutral step.' },
  { id: 'body-diagonal', purpose: 'Diagonal movement with independent upward turret aim, then stop.' },
  { id: 'body-wall-slide', purpose: 'Diagonal input into a wall; body follows actual downward sliding.' },
  { id: 'shell-head-on-before', purpose: 'Two approaching shells one fixed tick before contact.' },
  { id: 'shell-head-on-contact', purpose: 'First contact tick: both shells removed, one real collision poof.' },
  { id: 'shell-head-on-aged', purpose: 'Collision poof twelve fixed ticks after the contact tick.' },
  { id: 'shell-head-on-cleared', purpose: 'Sixty fixed ticks after contact: both shells and the poof are gone.' },
] as const;

export type MotionSceneId = (typeof MOTION_SCENES)[number]['id'];

export function isMotionScene(name: string): name is MotionSceneId {
  return MOTION_SCENES.some((scene) => scene.id === name);
}

function advance(world: World, ticks: number, commands: readonly Command[] = []): void {
  for (let tick = 0; tick < ticks; tick += 1) {
    advanceWorld(world, CONFIG.fixedStep, commands);
  }
}

export function createMotionWorld(name: MotionSceneId): World {
  const world = createWorld(0, 'coop');
  world.walls = world.walls.filter(
    (wall) =>
      wall.x === 0 ||
      wall.x === CONFIG.width - CONFIG.tile ||
      wall.y === CONFIG.gridY ||
      wall.y === CONFIG.gridY + (CONFIG.rows - 1) * CONFIG.tile,
  );
  const player = createTank('p1', 'player', 300, 270);
  const enemy = createTank('s0', 'enemy', 820, 130);
  enemy.cooldown = 100;
  world.players = [player, createTank('p2', 'player', 760, 450)];
  world.enemies = [enemy];
  world.corks = [];
  world.events = [`Synthetic visual fixture: ${name}`];

  switch (name) {
    case 'body-aim-independent':
    case 'body-diagonal':
    case 'body-wall-slide': {
      if (name === 'body-wall-slide') {
        player.x = 325;
        player.spawnX = 325;
        world.walls.push({ x: 340, y: 200, w: 40, h: 160 });
      }
      advance(world, 12, [{
        x: 1,
        y: name === 'body-aim-independent' ? 0 : 1,
        turn: 0,
        fire: false,
        aim: -Math.PI / 2,
      }]);
      advance(world, 1);
      break;
    }
    case 'shell-head-on-before':
    case 'shell-head-on-contact':
    case 'shell-head-on-aged':
    case 'shell-head-on-cleared': {
      world.shells = [
        { id: 1, owner: 'p1', faction: 'player', x: 400, y: 270, vx: 330, vy: 0, bounces: 0, dead: false },
        { id: 2, owner: 's0', faction: 'enemy', x: 440, y: 270, vx: -330, vy: 0, bounces: 0, dead: false },
      ];
      world.nextShell = 2;
      world.shots = 2;
      const ticks = {
        'shell-head-on-before': 6,
        'shell-head-on-contact': 7,
        'shell-head-on-aged': 19,
        'shell-head-on-cleared': 67,
      }[name];
      advance(world, ticks);
      break;
    }
  }
  return world;
}
