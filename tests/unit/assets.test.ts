import { describe, expect, it } from 'vitest';
import { TANK_BLUE } from '../../src/render/asset-data';
import { buildLayerSvg } from '../../src/render/assets';

describe('asset adapter', () => {
  it('builds a layer SVG with the asset viewBox and fragment', () => {
    const svg = buildLayerSvg(TANK_BLUE, TANK_BLUE.parts[0], 256);

    expect(svg).toContain('viewBox="-64 -64 128 128"');
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
    expect(svg).toContain('fill="#458fc5"');
  });
});
