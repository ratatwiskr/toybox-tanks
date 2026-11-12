import { describe, expect, test } from 'vitest';

import { CONFIG } from '../../src/config';
import { advanceWorld, bodyHeading } from '../../src/presentation/body-heading';
import { createVisualWorld } from '../../src/visual-scenes';
import { MOTION_SCENES } from '../../src/visual-motion-scenes';
import { captureScenes, imageKinds } from '../visual/catalogue-support';

describe('movement-derived visual fixtures', () => {
  const cases = [
    { id: 'body-aim-independent', angle: 0 },
    { id: 'body-diagonal', angle: Math.PI / 4 },
    { id: 'body-wall-slide', angle: Math.PI / 2 },
  ] as const;

  for (const entry of cases) {
    test(entry.id, () => {
      const world = createVisualWorld(entry.id);
      const player = world.players[0];
      if (player === undefined) throw new Error('Fixture player missing');
      expect(world.state).toBe('playing');
      expect(world.time).toBeCloseTo(13 * CONFIG.fixedStep, 10);
      expect(bodyHeading(player)).toBeCloseTo(entry.angle, 8);
      expect(player.angle).toBeCloseTo(-Math.PI / 2, 8);
      if (entry.id === 'body-wall-slide') {
        expect(player.x).toBeCloseTo(325, 5);
        expect(player.y).toBeGreaterThan(270);
      } else {
        expect(player.x).toBeGreaterThan(300);
        if (entry.id === 'body-diagonal') {
          expect(player.x - 300).toBeCloseTo(player.y - 270, 8);
        }
      }
      const heading = bodyHeading(player);
      advanceWorld(world, CONFIG.fixedStep);
      expect(bodyHeading(player)).toBe(heading);
    });
  }
});

describe('real shell collision capture sequence', () => {
  test('before contact retains both shells and no effect', () => {
    const world = createVisualWorld('shell-head-on-before');
    expect(world.shells).toHaveLength(2);
    expect(world.effects).toHaveLength(0);
    const left = world.shells[0];
    const right = world.shells[1];
    if (left === undefined || right === undefined) throw new Error('Approaching shells missing');
    expect(right.x - left.x).toBeCloseTo(7, 8);
  });

  test('first contact removes both and places one poof at the midpoint', () => {
    const world = createVisualWorld('shell-head-on-contact');
    expect(world.shells).toHaveLength(0);
    expect(world.effects).toHaveLength(1);
    expect(world.events.some((entry) => entry.endsWith('Shells collided'))).toBe(true);
    const effect = world.effects[0];
    if (effect === undefined) throw new Error('Contact effect missing');
    expect(effect.type).toBe('poof');
    expect(effect.x).toBeCloseTo(420, 8);
    expect(effect.y).toBeCloseTo(270, 8);
    expect(effect.age).toBeCloseTo(CONFIG.fixedStep, 10);
  });

  test('fixed later age and cleanup are generated through stepping', () => {
    const aged = createVisualWorld('shell-head-on-aged');
    expect(aged.shells).toHaveLength(0);
    expect(aged.effects).toHaveLength(1);
    expect(aged.effects[0]?.age).toBeCloseTo(13 * CONFIG.fixedStep, 10);
    const cleared = createVisualWorld('shell-head-on-cleared');
    expect(cleared.shells).toHaveLength(0);
    expect(cleared.effects).toHaveLength(0);
    expect(cleared.state).toBe('playing');
  });

  test('all new scenes share catalogue registration and full/arena/detail views', () => {
    const scenes = captureScenes();
    for (const entry of MOTION_SCENES) {
      const scene = scenes.find((item) => item.id === entry.id);
      if (scene === undefined) throw new Error(`Unregistered fixture: ${entry.id}`);
      expect(scene.fixture).toBe(entry.id);
      expect(imageKinds(scene)).toEqual(['full', 'arena', 'detail']);
      expect(createVisualWorld(entry.id)).toEqual(createVisualWorld(entry.id));
    }
  });
});
