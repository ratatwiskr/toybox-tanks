import { expect, test } from 'vitest';

import { captureScenes, imageKinds } from '../visual/catalogue-support';

test('mobile capture metadata and meaningful views are shared with comparison', () => {
  const scenes = captureScenes();
  const landscape = scenes.find((scene) => scene.id === 'touch-landscape-gameplay');
  const portrait = scenes.find((scene) => scene.id === 'touch-portrait-paused');
  if (landscape === undefined || portrait === undefined) throw new Error('Mobile captures missing');
  expect(landscape.mobile).toBe('landscape');
  expect(landscape.viewport).toEqual({ width: 640, height: 300 });
  expect(portrait.mobile).toBe('portrait');
  expect(portrait.viewport).toEqual({ width: 390, height: 844 });
  expect(imageKinds(landscape)).toEqual(['full', 'arena']);
  expect(imageKinds(portrait)).toEqual(['full']);
  expect(landscape.scenario).toBe('solo');
  expect(portrait.scenario).toBe('solo');
  expect(scenes.some((scene) => scene.id === 'ui-menu')).toBe(true);
  expect(scenes.some((scene) => scene.id === 'body-wall-slide')).toBe(true);
  expect(scenes.some((scene) => scene.id === 'shell-head-on-contact')).toBe(true);
  expect(scenes.some((scene) => scene.id === 'cork-atlas')).toBe(true);
});
