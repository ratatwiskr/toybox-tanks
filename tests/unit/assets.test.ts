import { describe, expect, it, vi } from 'vitest';
import { TANK_BLUE } from '../../src/render/asset-data';
import {
  buildLayerSvg,
  drawAssetLayers,
  type PreparedAssetLayer,
} from '../../src/render/assets';

describe('asset adapter', () => {
  it('builds a layer SVG with the asset viewBox and fragment', () => {
    const svg = buildLayerSvg(TANK_BLUE, TANK_BLUE.parts[0], 256);

    expect(svg).toContain('viewBox="-64 -64 128 128"');
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
    expect(svg).toContain('fill="#458fc5"');
  });

  it('draws each prepared layer with its role angle', () => {
    const calls: string[] = [];
    const context = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      translate: (x: number, y: number) => calls.push(`translate:${x},${y}`),
      rotate: (angle: number) => calls.push(`rotate:${angle}`),
      drawImage: () => calls.push('draw'),
    } as unknown as CanvasRenderingContext2D;

    const layers: PreparedAssetLayer[] = [
      { role: 'body', canvas: {} as HTMLCanvasElement },
      { role: 'aim', canvas: {} as HTMLCanvasElement },
    ];

    drawAssetLayers(context, layers, 10, 20, 64, {
      bodyAngle: 90,
      aimAngle: 30,
    });

    expect(calls).toEqual([
      'save',
      'translate:10,20',
      'save',
      `rotate:${(90 * Math.PI) / 180}`,
      'draw',
      'restore',
      'save',
      `rotate:${(30 * Math.PI) / 180}`,
      'draw',
      'restore',
      'restore',
    ]);
  });

  it('draws nothing when no layers are available', () => {
    const drawImage = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D;

    drawAssetLayers(context, [], 0, 0, 64, {});

    expect(drawImage).not.toHaveBeenCalled();
  });
});
