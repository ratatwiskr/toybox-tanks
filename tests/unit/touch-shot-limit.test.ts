import { expect, it } from 'vitest';

import { CONFIG } from '../../src/config';
import { TouchAdapter } from '../../src/input/touch';
import type { Command } from '../../src/sim/types';
import { createEmptyWorld, createTank, shoot, stepWorld } from '../../src/sim/world';

it('consumes a shell-cap rejected tap instead of retrying when a slot becomes free', () => {
  const world = createEmptyWorld('solo');
  const player = createTank('p1', 'player', 200, 300);
  const enemy = createTank('s0', 'enemy', 800, 100);
  enemy.cooldown = 999;
  player.angle = 0;
  world.players = [player];
  world.enemies = [enemy];
  for (let index = 0; index < CONFIG.activeShellLimit; index += 1) {
    player.cooldown = 0;
    expect(shoot(world, player)).toBe(true);
  }
  player.cooldown = 0;
  const adapter = new TouchAdapter();
  const neutral: Command = { x: 0, y: 0, turn: 0, fire: false };
  adapter.begin('aim', 1, 0, 0, 50, 0);
  adapter.end(1, 0, 0, 100);
  stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral)]);
  expect(world.shots).toBe(CONFIG.activeShellLimit);
  world.shells.length = 0;
  player.cooldown = 0;
  stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral)]);
  expect(world.shots).toBe(CONFIG.activeShellLimit);
  adapter.begin('aim', 2, 0, 0, 50, 200);
  adapter.end(2, 0, 0, 250);
  stepWorld(world, CONFIG.fixedStep, [adapter.readCommand(neutral)]);
  expect(world.shots).toBe(CONFIG.activeShellLimit + 1);
  expect(world.shells.map((shell) => shell.owner)).toEqual(['p1']);
});
