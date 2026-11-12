import { describe, expect, it } from 'vitest';

import type { FloorDefinition } from '../../src/render/floor-data';
import { FLOOR_WOOD_WARM } from '../../src/render/floor-data';
import { buildFloorSvg, prepareFloorImage, validateFloorDefinition } from '../../src/render/floor';

describe('floor artwork', () => {
  it('wraps the checked-in tile in a 512 px SVG', () => {
    expect(validateFloorDefinition(FLOOR_WOOD_WARM)).toEqual([]);

    const svg = buildFloorSvg(FLOOR_WOOD_WARM);

    expect(svg).toContain('width="512"');
    expect(svg).toContain('height="512"');
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('fill="#d9bc91"');
  });

  it('decodes the tile once and returns the image', async () => {
    const sources: string[] = [];
    const image = {} as unknown as CanvasImageSource;

    const result = await prepareFloorImage(FLOOR_WOOD_WARM, (source) => {
      sources.push(source);
      return Promise.resolve(image);
    });

    expect(result).toBe(image);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toContain('viewBox="0 0 512 512"');
    expect(sources[0]).toContain('fill="#d9bc91"');
  });

  it('reports decode failures with the procedural-floor fallback message', async () => {
    await expect(
      prepareFloorImage(FLOOR_WOOD_WARM, () => Promise.reject(new Error('decode boom'))),
    ).rejects.toMatchObject({
      name: 'AssetLoadError',
      code: 'decode-failed',
      assetId: 'wood-warm',
    });

    await expect(
      prepareFloorImage(FLOOR_WOOD_WARM, () => Promise.reject(new Error('decode boom'))),
    ).rejects.toThrow('Procedural artwork will be used instead');
  });

  it('rejects malformed floor data before decoding', async () => {
    const invalid: FloorDefinition = {
      id: 'wood-warm',
      label: 'Broken',
      tileSize: 0,
      svg: '',
    };
    let calls = 0;

    await expect(
      prepareFloorImage(invalid, () => {
        calls += 1;
        return Promise.resolve({} as unknown as CanvasImageSource);
      }),
    ).rejects.toMatchObject({ code: 'invalid-asset' });
    expect(calls).toBe(0);
  });
});
