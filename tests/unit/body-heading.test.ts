import { describe, expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import {
  advanceWorld,
  bodyHeading,
  INITIAL_BODY_HEADING,
  MIN_BODY_TURN_DISTANCE,
  updateBodyHeading,
} from '../../src/presentation/body-heading';
import { MAPS } from '../../src/sim/maps';
import type { Command, Tank, World } from '../../src/sim/types';
import { createEmptyWorld, createTank, createWorld } from '../../src/sim/world';

const IDLE: Command = { x: 0, y: 0, turn: 0, fire: false };

const DIRECTIONS: [string, number, number][] = [
  ['east', 1, 0],
  ['south-east', 1, 1],
  ['south', 0, 1],
  ['south-west', -1, 1],
  ['west', -1, 0],
  ['north-west', -1, -1],
  ['north', 0, -1],
  ['north-east', 1, -1],
];

function openWorld(): World {
  const world = createEmptyWorld('coop');
  world.players = [createTank('p1', 'player', 480, 270), createTank('p2', 'player', 240, 270)];
  const sentry = createTank('s0', 'enemy', 900, 60);
  sentry.cooldown = 1_000;
  world.enemies = [sentry];
  return world;
}

function player(world: World, index: number): Tank {
  const tank = world.players[index];
  if (tank === undefined) {
    throw new Error(`Player ${String(index)} missing`);
  }
  return tank;
}

function step(world: World, ...commands: readonly Command[]): void {
  advanceWorld(world, CONFIG.fixedStep, commands);
}

describe('body heading', () => {
  it('starts facing up for every tank in every room and mode', () => {
    for (const room of MAPS.keys()) {
      for (const mode of ['coop', 'solo'] as const) {
        const world = createWorld(room, mode);
        for (const tank of [...world.players, ...world.enemies]) {
          expect(bodyHeading(tank)).toBe(INITIAL_BODY_HEADING);
        }
      }
    }
  });

  it.each(DIRECTIONS)('follows the actual path heading: %s', (_name, x, y) => {
    const world = openWorld();
    const tank = player(world, 0);

    step(world, { x, y, turn: 0, fire: false }, IDLE);

    expect(bodyHeading(tank)).toBeCloseTo(Math.atan2(y, x), 9);
  });

  it('keeps the last heading while standing still', () => {
    const world = openWorld();
    const tank = player(world, 0);

    step(world, { x: 1, y: 0, turn: 0, fire: false }, IDLE);
    for (let tick = 0; tick < 5; tick += 1) {
      step(world, IDLE, IDLE);
    }

    expect(bodyHeading(tank)).toBeCloseTo(0, 9);
  });

  it('does not turn the body when only the turret rotates', () => {
    const world = openWorld();
    const tank = player(world, 0);
    const x = tank.x;
    const y = tank.y;

    for (let tick = 0; tick < 10; tick += 1) {
      step(world, { x: 0, y: 0, turn: 1, fire: false }, IDLE);
    }

    expect(tank.angle).not.toBeCloseTo(-Math.PI / 2);
    expect(bodyHeading(tank)).toBe(INITIAL_BODY_HEADING);
    expect([tank.x, tank.y]).toEqual([x, y]);
  });

  it('does not change the aim angle when only moving', () => {
    const world = openWorld();
    const tank = player(world, 0);
    const angle = tank.angle;

    for (let tick = 0; tick < 10; tick += 1) {
      step(world, { x: 1, y: 1, turn: 0, fire: false }, IDLE);
    }

    expect(tank.angle).toBe(angle);
    expect(bodyHeading(tank)).toBeCloseTo(Math.PI / 4, 9);
  });

  it('ignores a fully blocked move and follows wall sliding', () => {
    const world = openWorld();
    world.walls.push({ x: 500, y: 100, w: 40, h: 300 });
    const tank = player(world, 0);
    tank.x = 500 - tank.r;

    step(world, { x: 0, y: 1, turn: 0, fire: false }, IDLE);
    expect(bodyHeading(tank)).toBeCloseTo(Math.PI / 2, 9);

    step(world, { x: 1, y: 0, turn: 0, fire: false }, IDLE);
    expect(tank.x).toBeCloseTo(500 - tank.r, 9);
    expect(bodyHeading(tank)).toBeCloseTo(Math.PI / 2, 9);

    step(world, { x: 1, y: -1, turn: 0, fire: false }, IDLE);
    expect(tank.x).toBeCloseTo(500 - tank.r, 9);
    expect(bodyHeading(tank)).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('uses a turn threshold above contact jitter and below deliberate stick input', () => {
    const fullStep = CONFIG.playerSpeed * CONFIG.fixedStep;
    expect(MIN_BODY_TURN_DISTANCE).toBeGreaterThan(CONFIG.separationEpsilon);
    expect(MIN_BODY_TURN_DISTANCE).toBeLessThan(fullStep * CONFIG.stickDeadzone);

    const tank = createTank('p1', 'player', 100, 100);
    updateBodyHeading(tank, MIN_BODY_TURN_DISTANCE * 0.9, 0);
    expect(bodyHeading(tank)).toBe(INITIAL_BODY_HEADING);

    updateBodyHeading(tank, MIN_BODY_TURN_DISTANCE * 1.1, 0);
    expect(bodyHeading(tank)).toBe(0);
  });

  it('keeps independent headings for both players', () => {
    const world = openWorld();

    step(world, { x: 1, y: 0, turn: 0, fire: false }, { x: 0, y: 1, turn: 0, fire: false });

    expect(bodyHeading(player(world, 0))).toBeCloseTo(0, 9);
    expect(bodyHeading(player(world, 1))).toBeCloseTo(Math.PI / 2, 9);
  });

  it('keeps the last heading of a disabled player', () => {
    const world = openWorld();
    const tank = player(world, 0);

    step(world, { x: 1, y: 0, turn: 0, fire: false }, IDLE);
    tank.alive = false;
    const x = tank.x;
    step(world, { x: 0, y: 1, turn: 0, fire: false }, IDLE);

    expect(tank.x).toBe(x);
    expect(bodyHeading(tank)).toBeCloseTo(0, 9);
  });

  it('freezes the heading while paused', () => {
    const world = openWorld();
    const tank = player(world, 0);

    step(world, { x: 1, y: 0, turn: 0, fire: false }, IDLE);
    world.state = 'paused';
    const y = tank.y;
    step(world, { x: 0, y: 1, turn: 0, fire: false }, IDLE);

    expect(tank.y).toBe(y);
    expect(bodyHeading(tank)).toBeCloseTo(0, 9);
  });

  it('gives new worlds fresh headings even when tank IDs are reused', () => {
    const first = openWorld();
    step(first, { x: 1, y: 0, turn: 0, fire: false }, IDLE);
    expect(bodyHeading(player(first, 0))).toBeCloseTo(0, 9);

    const second = openWorld();
    expect(player(second, 0).id).toBe(player(first, 0).id);
    expect(bodyHeading(player(second, 0))).toBe(INITIAL_BODY_HEADING);
    expect(bodyHeading(player(first, 0))).toBeCloseTo(0, 9);
  });

  it('keeps stationary sentries facing up while their turrets work', () => {
    const world = openWorld();
    const sentry = world.enemies[0];
    if (sentry === undefined) {
      throw new Error('Sentry missing');
    }

    for (let tick = 0; tick < 120; tick += 1) {
      step(world, { x: 1, y: 0, turn: 0, fire: false }, IDLE);
    }

    expect(bodyHeading(sentry)).toBe(INITIAL_BODY_HEADING);
  });
});
